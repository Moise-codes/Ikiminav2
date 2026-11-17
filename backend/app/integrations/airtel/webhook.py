"""Airtel Money webhook handler.

Airtel posts transaction status updates here. The payload is parsed
defensively (field names vary slightly between API versions) and handed
to PaymentService.handle_provider_callback, which is idempotent.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request, status

from app.core.dependencies import DbSession
from app.payments.service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/airtel", tags=["airtel-webhooks"])


@router.post("/payments", status_code=status.HTTP_202_ACCEPTED)
async def airtel_payment_webhook(request: Request, db: DbSession = Depends()) -> dict:
    """Airtel Money transaction callback (collection or disbursement)."""
    body = await request.body()
    try:
        payload = json.loads(body.decode("utf-8", errors="replace") or "{}")
    except json.JSONDecodeError:
        payload = {}
    data = payload.get("data", payload) if isinstance(payload, dict) else {}
    txn = data.get("transaction", data) if isinstance(data, dict) else {}

    ref = (
        payload.get("reference")
        or data.get("reference")
        or txn.get("id")
        or data.get("id")
    )
    txn_status = txn.get("status") or data.get("status") or payload.get("status")
    txn_id = txn.get("transactionId") or txn.get("airtel_money_id") or data.get("id")
    reason = txn.get("message") or data.get("message")

    logger.info(
        "airtel_payment_webhook",
        extra={"reference": ref, "status": txn_status},
    )

    if ref and txn_status:
        service = PaymentService(db)
        await service.handle_provider_callback(
            provider="airtel",
            provider_ref=str(ref),
            raw_status=str(txn_status),
            provider_txn_id=str(txn_id) if txn_id else None,
            reason=str(reason) if reason else None,
        )
        await db.commit()
    return {"received": True}
