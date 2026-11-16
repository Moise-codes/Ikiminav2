"""MTN Mobile Money API client.

Covers both MoM APIs used by Itsinda:

* Collection API (RequestToPay) — a customer pays the group from their wallet.
* Disbursement API (Transfer) — the group pays out to a member's wallet.

All calls are idempotent via the X-Reference-Id header and the X-Target-Environment
header (sandbox / production). Responses are never trusted blindly; the
webhook endpoint is the source of truth for final status.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings


class MtnError(Exception):
    """Raised when the MTN API returns an error or the response is invalid."""


@dataclass(frozen=True, slots=True)
class MtnToken:
    access_token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class MtnRequestToPay:
    reference_id: str
    phone: str  # E.164, e.g. +250788123456
    amount: int  # RWF
    currency: str = "RWF"
    payer_message: str = "Itsinda contribution"
    payee_note: str = "Savings group payment"


@dataclass(frozen=True, slots=True)
class MtnTransfer:
    reference_id: str
    phone: str  # E.164
    amount: int  # RWF
    currency: str = "RWF"
    payer_message: str = "Itsinda payout"
    payee_note: str = "Savings group payout"


@dataclass(frozen=True, slots=True)
class MtnTransactionResult:
    reference_id: str
    status: str  # pending, successful, failed, rejected
    external_reference: str | None = None
    reason: str | None = None
    finished_at: datetime | None = None


class MtnClient:
    """Thin client over MTN MoM Collection and Disbursement APIs.

    Base URLs (from MTN developer portal, regionalised for Rwanda):
    * Collection: https://sandbox.momodeveloper.mtn.com/collection
    * Disbursement: https://sandbox.momodeveloper.mtn.com/disbursement
    """

    def __init__(self) -> None:
        self._collection_token: MtnToken | None = None
        self._disbursement_token: MtnToken | None = None
        self._client: httpx.AsyncClient | None = None

    async def _client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
        return self._client

    # ------------------------------------------------------------------
    # auth
    # ------------------------------------------------------------------
    async def _basic_auth(self, api_user: str, api_key: str) -> str:
        raw = f"{api_user}:{api_key}".encode("utf-8")
        return "Basic " + base64.b64encode(raw).decode("ascii")

    async def _get_token(
        self, *, scope: str, api_user: str, api_key: str, token_url: str
    ) -> MtnToken:
        now = datetime.now(timezone.utc)
        cached = self._collection_token if scope == "collection" else self._disbursement_token
        if cached is not None and cached.expires_at > now + timedelta(minutes=2):
            return cached

        client = await self._client()
        resp = await client.post(
            token_url,
            headers={"Authorization": await self._basic_auth(api_user, api_key), "Ocp-Apim-Subscription-Key": api_key},
        )
        if resp.status_code >= 400:
            raise MtnError(f"MTN token failed: {resp.status_code} {resp.text[:200]}")
        body = resp.json()
        expires_in = int(body.get("expires_in", 3600))
        token = MtnToken(
            access_token=body["access_token"],
            expires_at=now + timedelta(seconds=expires_in),
        )
        if scope == "collection":
            self._collection_token = token
        else:
            self._disbursement_token = token
        return token

    # ------------------------------------------------------------------
    # collection / request to pay (receive money from customer)
    # ------------------------------------------------------------------
    async def request_to_pay(
        self,
        *,
        payload: MtnRequestToPay,
        idempotency_key: str | None = None,
    ) -> MtnTransactionResult:
        """Ask MTN to prompt the customer to pay (MTN Push / USSD PIN).

        Returns immediately with status ``pending``. The real result arrives
        via the collection webhook; poll only as a fallback.
        """
        reference_id = payload.reference_id or str(uuid.uuid4())
        token = await self._get_token(
            scope="collection",
            api_user=settings.mtn_collection_api_user,
            api_key=settings.mtn_collection_api_key,
            token_url=f"{settings.mtn_collection_base_url}/collection/token",
        )
        client = await self._client()
        resp = await client.post(
            f"{settings.mtn_collection_base_url}/collection/v1_0/requesttopay",
            headers={
                "Authorization": f"Bearer {token.access_token}",
                "X-Reference-Id": reference_id,
                "X-Target-Environment": settings.mtn_environment,
                "Ocp-Apim-Subscription-Key": settings.mtn_collection_api_key,
                "Idempotency-Key": idempotency_key or reference_id,
            },
            json={
                "amount": str(payload.amount),
                "currency": payload.currency,
                "externalId": reference_id,
                "payer": {"partyIdType": "MSISDN", "partyId": payload.phone},
                "payerMessage": payload.payer_message,
                "payeeNote": payload.payee_note,
            },
        )
        if resp.status_code not in (200, 202):
            raise MtnError(f"MTN requestToPay failed: {resp.status_code} {resp.text[:500]}")
        return MtnTransactionResult(reference_id=reference_id, status="pending")

    async def get_collection_transaction(self, *, reference_id: str) -> MtnTransactionResult:
        token = await self._get_token(
            scope="collection",
            api_user=settings.mtn_collection_api_user,
            api_key=settings.mtn_collection_api_key,
            token_url=f"{settings.mtn_collection_base_url}/collection/token",
        )
        client = await self._client()
        resp = await client.get(
            f"{settings.mtn_collection_base_url}/collection/v1_0/requesttopay/{reference_id}",
            headers={
                "Authorization": f"Bearer {token.access_token}",
                "X-Target-Environment": settings.mtn_environment,
                "Ocp-Apim-Subscription-Key": settings.mtn_collection_api_key,
            },
        )
        if resp.status_code >= 400:
            raise MtnError(f"MTN get collection failed: {resp.status_code} {resp.text[:200]}")
        body = resp.json()
        return self._map_collection_status(body, reference_id)

    # ------------------------------------------------------------------
    # disbursement / transfer (send money to customer)
    # ------------------------------------------------------------------
    async def transfer(
        self,
        *,
        payload: MtnTransfer,
        idempotency_key: str | None = None,
    ) -> MtnTransactionResult:
        """Send money from the group's wallet to a customer (payout)."""
        reference_id = payload.reference_id or str(uuid.uuid4())
        token = await self._get_token(
            scope="disbursement",
            api_user=settings.mtn_disbursement_api_user,
            api_key=settings.mtn_disbursement_api_key,
            token_url=f"{settings.mtn_disbursement_base_url}/disbursement/token",
        )
        client = await self._client()
        resp = await client.post(
            f"{settings.mtn_disbursement_base_url}/disbursement/v1_0/transfer",
            headers={
                "Authorization": f"Bearer {token.access_token}",
                "X-Reference-Id": reference_id,
                "X-Target-Environment": settings.mtn_environment,
                "Ocp-Apim-Subscription-Key": settings.mtn_disbursement_api_key,
                "Idempotency-Key": idempotency_key or reference_id,
            },
            json={
                "amount": str(payload.amount),
                "currency": payload.currency,
                "externalId": reference_id,
                "payee": {"partyIdType": "MSISDN", "partyId": payload.phone},
                "payerMessage": payload.payer_message,
                "payeeNote": payload.payee_note,
            },
        )
        if resp.status_code not in (200, 202):
            raise MtnError(f"MTN transfer failed: {resp.status_code} {resp.text[:500]}")
        return MtnTransactionResult(reference_id=reference_id, status="pending")

    async def get_disbursement_transaction(self, *, reference_id: str) -> MtnTransactionResult:
        token = await self._get_token(
            scope="disbursement",
            api_user=settings.mtn_disbursement_api_user,
            api_key=settings.mtn_disbursement_api_key,
            token_url=f"{settings.mtn_disbursement_base_url}/disbursement/token",
        )
        client = await self._client()
        resp = await client.get(
            f"{settings.mtn_disbursement_base_url}/disbursement/v1_0/transfer/{reference_id}",
            headers={
                "Authorization": f"Bearer {token.access_token}",
                "X-Target-Environment": settings.mtn_environment,
                "Ocp-Apim-Subscription-Key": settings.mtn_disbursement_api_key,
            },
        )
        if resp.status_code >= 400:
            raise MtnError(f"MTN get disbursement failed: {resp.status_code} {resp.text[:200]}")
        body = resp.json()
        return self._map_disbursement_status(body, reference_id)

    # ------------------------------------------------------------------
    # webhook signature verification
    # ------------------------------------------------------------------
    def verify_webhook_signature(self, *, body: bytes, signature: str) -> bool:
        """Verify MTN webhook HMAC-SHA256 signature.

        MTN signs the raw request body with the primary key. We compare in
        constant time so timing attacks can't reveal whether the key matched.
        """
        expected = hmac.new(
            settings.mtn_webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    @staticmethod
    def _map_collection_status(body: dict[str, Any], reference_id: str) -> MtnTransactionResult:
        status = (body.get("status") or "pending").lower()
        return MtnTransactionResult(
            reference_id=reference_id,
            status=status,
            external_reference=body.get("financialTransactionId"),
            finished_at=_parse_mtn_time(body.get("finishedAt")),
        )

    @staticmethod
    def _map_disbursement_status(body: dict[str, Any], reference_id: str) -> MtnTransactionResult:
        status = (body.get("status") or "pending").lower()
        return MtnTransactionResult(
            reference_id=reference_id,
            status=status,
            external_reference=body.get("financialTransactionId"),
            finished_at=_parse_mtn_time(body.get("finishedAt")),
        )

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None


def _parse_mtn_time(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
