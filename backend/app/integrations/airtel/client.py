"""Airtel Money Africa API client.

Covers the two flows Itsinda needs:

* Collections (``/merchant/v1/payments/``) — request-to-pay: a member
  approves a prompt on their phone and the group receives the money.
* Disbursements (``/standard/v1/disbursements/``) — the group pays out to
  a member's wallet. Requires the sender PIN, RSA-encrypted with Airtel's
  published public key.

Auth is OAuth2 ``client_credentials`` against ``/auth/oauth2/token``.
Country/currency headers (``X-Country: RW``, ``X-Currency: RWF``) are sent
on every call.

NOTE: endpoint shapes follow the Airtel Money Africa developer docs.
Verify against the sandbox (``openapiuat.airtel.africa``) before
production — same rule as the MTN integration.
"""

from __future__ import annotations

import base64
import datetime as dt
import uuid
from dataclasses import dataclass
from typing import Any

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class AirtelError(Exception):
    """Raised when the Airtel Money API returns an error."""


@dataclass(frozen=True, slots=True)
class AirtelTransactionResult:
    reference_id: str
    transaction_id: str | None
    status: str  # pending, successful, failed
    reason: str | None = None


def msisdn(e164: str) -> str:
    """'+250788123456' -> '250788123456' (Airtel wants no plus)."""
    return e164.lstrip("+")


def operator_of(phone_e164: str) -> str:
    """Rwanda prefixes: 78/79 = MTN, 72/73 = Airtel."""
    digits = "".join(ch for ch in phone_e164 if ch.isdigit())
    # digits = 2507XXXXXXXXX ; national prefix starts at index 3
    prefix = digits[3:5] if len(digits) >= 5 else ""
    return "airtel" if prefix in ("72", "73") else "mtn"


class AirtelClient:
    """Thin async client over the Airtel Money Africa API."""

    def __init__(self) -> None:
        env = settings.airtel_environment
        self._base = (
            settings.airtel_base_url
            or (
                "https://openapi.airtel.africa"
                if env == "production"
                else "https://openapiuat.airtel.africa"
            )
        ).rstrip("/")
        self._token: str | None = None
        self._token_expiry: dt.datetime | None = None
        self._client = httpx.AsyncClient(timeout=30.0)
        self._public_key_pem: str | None = None

    # ------------------------------------------------------------------
    # auth
    # ------------------------------------------------------------------
    async def _get_token(self) -> str:
        now = dt.datetime.now(dt.timezone.utc)
        if self._token and self._token_expiry and now < self._token_expiry:
            return self._token
        if not settings.airtel_api_key or not settings.airtel_api_secret:
            raise AirtelError("airtel_credentials_not_configured")
        basic = base64.b64encode(
            f"{settings.airtel_api_key}:{settings.airtel_api_secret}".encode()
        ).decode()
        resp = await self._client.post(
            f"{self._base}/auth/oauth2/token",
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/json",
            },
            json={"grant_type": "client_credentials"},
        )
        if resp.status_code != 200:
            raise AirtelError(f"airtel_auth_failed:{resp.status_code}")
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = now + dt.timedelta(
            seconds=int(data.get("expires_in", 3600)) - 60
        )
        return self._token

    async def _headers(self) -> dict[str, str]:
        token = await self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "X-Country": settings.airtel_country,
            "X-Currency": settings.airtel_currency,
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # collections — request to pay (customer approves on their phone)
    # ------------------------------------------------------------------
    async def request_to_pay(
        self,
        *,
        reference_id: str,
        phone: str,
        amount: int,
        payer_message: str = "Itsinda contribution",
        payee_note: str = "Savings group payment",
    ) -> AirtelTransactionResult:
        body = {
            "reference": reference_id,
            "subscriber": {
                "country": settings.airtel_country,
                "currency": settings.airtel_currency,
                "msisdn": msisdn(phone),
            },
            "transaction": {
                "amount": amount,
                "country": settings.airtel_country,
                "currency": settings.airtel_currency,
                "id": reference_id,
            },
        }
        resp = await self._client.post(
            f"{self._base}/merchant/v1/payments/",
            headers=await self._headers(),
            json=body,
        )
        return self._parse(resp, reference_id)

    # ------------------------------------------------------------------
    # disbursements — group pays out to a member
    # ------------------------------------------------------------------
    async def transfer(
        self,
        *,
        reference_id: str,
        phone: str,
        amount: int,
        pin: str | None = None,
        payer_message: str = "Itsinda payout",
        payee_note: str = "Savings group payout",
    ) -> AirtelTransactionResult:
        """Disburse funds. ``pin`` must be the RSA-encrypted sender PIN
        when Airtel requires it (production). Sandbox accepts plain PIN."""
        if not settings.airtel_sender_msisdn:
            raise AirtelError("airtel_sender_msisdn_not_configured")
        transaction = {
            "amount": amount,
            "country": settings.airtel_country,
            "currency": settings.airtel_currency,
            "id": reference_id,
        }
        body = {
            "reference": reference_id,
            "payee": {
                "currency": settings.airtel_currency,
                "msisdn": msisdn(phone),
            },
            "transaction": transaction,
            "sender": {"msisdn": msisdn(settings.airtel_sender_msisdn)},
        }
        effective_pin = pin if pin is not None else settings.airtel_sender_pin
        if effective_pin:
            body["sender"]["pin"] = await self._encrypt_pin(effective_pin)
        resp = await self._client.post(
            f"{self._base}/standard/v1/disbursements/",
            headers=await self._headers(),
            json=body,
        )
        return self._parse(resp, reference_id)

    # ------------------------------------------------------------------
    # status
    # ------------------------------------------------------------------
    async def get_transaction_status(
        self, *, transaction_id: str
    ) -> AirtelTransactionResult:
        resp = await self._client.get(
            f"{self._base}/standard/v1/payments/{transaction_id}",
            headers=await self._headers(),
        )
        return self._parse(resp, transaction_id)

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------
    async def _encrypt_pin(self, pin: str) -> str:
        """RSA-encrypt the sender PIN with Airtel's public key (OAEP-SHA1)."""
        import base64 as _b64

        if self._public_key_pem is None:
            resp = await self._client.get(settings.airtel_public_key_url)
            resp.raise_for_status()
            self._public_key_pem = resp.text
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        key = serialization.load_pem_public_key(self._public_key_pem.encode())
        encrypted = key.encrypt(
            pin.encode(),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA1()),
                algorithm=hashes.SHA1(),
                label=None,
            ),
        )
        return _b64.b64encode(encrypted).decode()
    @staticmethod
    def _parse(resp: httpx.Response, reference_id: str) -> AirtelTransactionResult:
        try:
            data: dict[str, Any] = resp.json() if resp.content else {}
        except Exception:
            data = {}
        tx = data.get("data", data)
        txn_id = tx.get("id") or tx.get("transaction", {}).get("id")
        status = str(tx.get("status", "")).lower() or (
            "successful" if resp.status_code in (200, 201, 202) else "failed"
        )
        reason = tx.get("message") or tx.get("error", {}).get("message")
        if resp.status_code not in (200, 201, 202):
            raise AirtelError(f"airtel_api_{resp.status_code}:{str(data)[:200]}")
        return AirtelTransactionResult(
            reference_id=reference_id,
            transaction_id=str(txn_id) if txn_id else None,
            status=status,
            reason=str(reason)[:200] if reason else None,
        )

    async def aclose(self) -> None:
        await self._client.aclose()
