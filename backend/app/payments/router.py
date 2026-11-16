"""Payment routes — MTN Mobile Money send/receive."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, Request, status

from app.auth.router import _client_ip
from app.core.dependencies import CurrentUser, DbSession, get_membership
from app.core.errors import NotFoundError
from app.core.rate_limit import rate_limit
from app.integrations.mtn.client import MtnClient
from app.models.group import Group, Membership
from app.payments.schemas import (
    MtnRequestToPayRequest,
    MtnTransferRequest,
    MtnStatusCheckResponse,
)
from app.payments.service import PaymentService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/mtn/request-to-pay",
    status_code=status.HTTP_202_ACCEPTED,
)
@rate_limit("payments.request_to_pay", limit=20, window_seconds=3600)
async def request_to_pay(
    payload: MtnRequestToPayRequest,
    request: Request,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> dict:
    """Ask MTN to collect money from a customer's wallet (inbound)."""
    service = PaymentService(db)
    membership = await db.get(Membership, payload.membership_id)
    if membership is None:
        raise NotFoundError("Membership not found.")
    group = await db.get(Group, membership.group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    await get_membership(
        db=db, group_id=group.id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    result = await service.initiate_request_to_pay(
        group=group,
        actor=user,
        membership_id=payload.membership_id,
        amount_rwf=payload.amount_rwf,
        payer_phone=payload.payer_phone,
        payer_message=payload.payer_message,
        payee_note=payload.payee_note,
        idempotency_key=payload.idempotency_key,
    )
    await db.commit()
    return result


@router.post(
    "/mtn/transfer",
    status_code=status.HTTP_202_ACCEPTED,
)
@rate_limit("payments.transfer", limit=20, window_seconds=3600)
async def transfer(
    payload: MtnTransferRequest,
    request: Request,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> dict:
    """Pay out from the group wallet to a member (outbound)."""
    service = PaymentService(db)
    membership = await db.get(Membership, payload.membership_id)
    if membership is None:
        raise NotFoundError("Membership not found.")
    group = await db.get(Group, membership.group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    actor_membership = await get_membership(
        db=db, group_id=group.id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    result = await service.initiate_transfer(
        group=group,
        actor=user,
        membership_id=payload.membership_id,
        amount_rwf=payload.amount_rwf,
        payee_phone=payload.payee_phone,
        payer_message=payload.payer_message,
        payee_note=payload.payee_note,
        idempotency_key=payload.idempotency_key,
    )
    await db.commit()
    return result


@router.get("/mtn/status/{reference_id}", response_model=MtnStatusCheckResponse)
async def mtn_status(
    reference_id: str = Path(...),
    channel: str = "collection",
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> MtnStatusCheckResponse:
    """Check the final status of an MTN transaction."""
    service = PaymentService(db)
    result = await service.check_status(reference_id=reference_id, channel=channel)
    return MtnStatusCheckResponse(
        reference_id=result["reference_id"],
        status=result["status"],
        external_transaction_id=result.get("external_transaction_id"),
        finished_at=result.get("finished_at"),
    )
