"""MTN webhook handler.

MTN posts to this URL when a RequestToPay or Transfer changes state. We
verify the HMAC signature, record the outcome in the outbox / payments
module, and reply 202 quickly so MTN doesn't retry prematurely.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, Request, status

from app.core.config import settings
from app.core.errors import AppError
from app.core.dependencies import DbSession
from app.integrations.mtn.client import MtnClient
from app.payments.service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/mtn", tags=["mtn-webhooks"])

_client: MtnClient | None = None


def _mtn() -> MtnClient:
    global _client
    if _client is None:
        _client = MtnClient()
    return _client


@router.post("/collection", status_code=status.HTTP_202_ACCEPTED)
async def collection_webhook(
    request: Request,
    db: DbSession = Depends(),
    x_signature: str | None = Header(default=None, alias="X-Signature"),
    x_reference_id: str | None = Header(default=None, alias="X-Reference-Id"),
    x_external_id: str | None = Header(default=None, alias="X-External-Id"),
    x_status: str | None = Header(default=None, alias="X-Status"),
    x_reason: str | None = Header(default=None, alias="X-Reason"),
) -> dict:
    """MTN collection callback: a customer paid (or failed to pay)."""
    body = await request.body()
    if not settings.mtn_webhook_secret:
        # In dev without a secret we still accept the headers MTN sends.
        logger.warning("mtn_webhook_no_secret", extra={"reference_id": x_reference_id})
    elif x_signature and not _mtn().verify_webhook_signature(body=body, signature=x_signature):
        raise AppError(code="INVALID_SIGNATURE", status_code=401, message="Invalid webhook signature.")

    payload_text = body.decode("utf-8", errors="replace")
    logger.info(
        "mtn_collection_webhook",
        extra={
            "reference_id": x_reference_id,
            "external_id": x_external_id,
            "status": x_status,
            "reason": x_reason,
            "body": payload_text[:500],
        },
    )

    # Finalize the pending payment transaction (idempotent).
    if x_reference_id and x_status:
        service = PaymentService(db)
        await service.handle_provider_callback(
            provider="mtn",
            provider_ref=x_reference_id,
            raw_status=x_status,
            provider_txn_id=x_external_id,
            reason=x_reason,
        )
        await db.commit()
    return {"received": True, "reference_id": x_reference_id}


@router.post("/disbursement", status_code=status.HTTP_202_ACCEPTED)
async def disbursement_webhook(
    request: Request,
    db: DbSession = Depends(),
    x_signature: str | None = Header(default=None, alias="X-Signature"),
    x_reference_id: str | None = Header(default=None, alias="X-Reference-Id"),
    x_external_id: str | None = Header(default=None, alias="X-External-Id"),
    x_status: str | None = Header(default=None, alias="X-Status"),
    x_reason: str | None = Header(default=None, alias="X-Reason"),
) -> dict:
    """MTN disbursement callback: the group paid out (or failed)."""
    body = await request.body()
    if settings.mtn_webhook_secret and x_signature and not _mtn().verify_webhook_signature(
        body=body, signature=x_signature
    ):
        raise AppError(code="INVALID_SIGNATURE", status_code=401, message="Invalid webhook signature.")

    logger.info(
        "mtn_disbursement_webhook",
        extra={
            "reference_id": x_reference_id,
            "external_id": x_external_id,
            "status": x_status,
            "reason": x_reason,
        },
    )
    if x_reference_id and x_status:
        service = PaymentService(db)
        await service.handle_provider_callback(
            provider="mtn",
            provider_ref=x_reference_id,
            raw_status=x_status,
            provider_txn_id=x_external_id,
            reason=x_reason,
        )
        await db.commit()
    return {"received": True, "reference_id": x_reference_id}
