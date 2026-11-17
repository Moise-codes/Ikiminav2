"""Contribution ledger routes."""

from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, Path, Request, status

from app.auth.router import _client_ip
from app.common.envelope import Page
from app.core.dependencies import CurrentUser, DbSession, PageParams, get_membership
from app.core.errors import NotFoundError, PermissionDeniedError
from app.core.rate_limit import rate_limit
from app.contributions.schemas import (
    ContributionResponse,
    ContributionDisputeResponse,
    DisputeRequest,
    DisputeResolveRequest,
    RecordContributionRequest,
    RecordPenaltyRequest,
    ReverseContributionRequest,
)
from app.contributions.service import ContributionService
from app.models.contributions import Contribution, ContributionDispute
from app.models.group import Group, Membership

router = APIRouter(prefix="/contributions", tags=["contributions"])


def _contribution_response(item: Contribution) -> ContributionResponse:
    return ContributionResponse.model_validate(item)


def _dispute_response(item: ContributionDispute) -> ContributionDisputeResponse:
    return ContributionDisputeResponse.model_validate(item)


@router.post(
    "", response_model=ContributionResponse, status_code=status.HTTP_201_CREATED
)
@rate_limit("contributions.record", limit=60, window_seconds=3600)
async def record_contribution(
    payload: RecordContributionRequest,
    request: Request,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> ContributionResponse:
    """Record a contribution (treasurer or president only)."""
    service = ContributionService(db)
    # The group is resolved from the membership being credited.
    target_membership = await db.get(Membership, payload.membership_id)
    if target_membership is None:
        raise NotFoundError("Membership not found.")
    group = await db.get(Group, target_membership.group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    # Re-check authorization against the target group.
    await get_membership(
        db=db,
        group_id=group.id,
        user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    contribution = await service.record_contribution(
        group=group,
        actor=user,
        membership_id=payload.membership_id,
        period=payload.period,
        amount_rwf=payload.amount_rwf,
        paid_at=payload.paid_at,
        method=payload.method,
        reference=payload.reference,
        idempotency_key=payload.idempotency_key,
        ip=_client_ip(request),
    )
    await db.commit()
    return _contribution_response(contribution)


@router.post(
    "/penalties",
    response_model=ContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit("contributions.penalty", limit=60, window_seconds=3600)
async def record_penalty(
    payload: RecordPenaltyRequest,
    request: Request,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> ContributionResponse:
    """Record a late-payment fine against a member (treasurer or president only).

    Penalties are stored separately from regular contributions so they appear
    distinctly in member statements and group reports.
    """
    service = ContributionService(db)
    target_membership = await db.get(Membership, payload.membership_id)
    if target_membership is None:
        raise NotFoundError("Membership not found.")
    group = await db.get(Group, target_membership.group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    await get_membership(
        db=db,
        group_id=group.id,
        user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    penalty = await service.record_penalty(
        group=group,
        actor=user,
        membership_id=payload.membership_id,
        period=payload.period,
        amount_rwf=payload.amount_rwf,
        reason=payload.reason,
        method=payload.method,
        idempotency_key=payload.idempotency_key,
        ip=_client_ip(request),
    )
    await db.commit()
    return _contribution_response(penalty)


@router.post(
    "/reverse",
    response_model=ContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit("contributions.reverse", limit=30, window_seconds=3600)
async def reverse_contribution(
    payload: ReverseContributionRequest,
    request: Request,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> ContributionResponse:
    """Correct a contribution with a reversal entry (leader only)."""
    service = ContributionService(db)
    contribution = await db.get(Contribution, payload.contribution_id)
    if contribution is None:
        raise NotFoundError("Contribution not found.")
    group = await db.get(Group, contribution.group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    await get_membership(
        db=db,
        group_id=group.id,
        user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    reversal = await service.reverse_contribution(
        group=group,
        actor=user,
        contribution_id=payload.contribution_id,
        reason=payload.reason,
        idempotency_key=payload.idempotency_key,
        ip=_client_ip(request),
    )
    await db.commit()
    return _contribution_response(reversal)


@router.get("", response_model=Page[ContributionResponse])
async def list_contributions(
    group_id: uuid.UUID | None = None,
    membership_id: uuid.UUID | None = None,
    period: str | None = None,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
    pagination: PageParams = Depends(),
) -> Page[ContributionResponse]:
    """List contributions. Scope to one group if provided."""
    service = ContributionService(db)
    if group_id is not None:
        await get_membership(db=db, group_id=group_id, user_id=user.id)
        group = await db.get(Group, group_id)
        if group is None:
            raise NotFoundError("Group not found.")
    elif membership_id is not None:
        membership = await db.get(Membership, membership_id)
        if membership is None or membership.user_id != user.id:
            raise PermissionDeniedError("Not your membership.")
        group = await db.get(Group, membership.group_id)
    else:
        raise NotFoundError("Provide a group_id or membership_id.")
    page = await service.list_contributions(
        group=group,
        membership_id=membership_id,
        period=period,
        pagination=pagination,
    )
    return Page[ContributionResponse].build(
        items=[_contribution_response(i) for i in page.items],
        total=page.pagination.total,
        page=page.pagination.page,
        per_page=page.pagination.per_page,
    )


@router.post(
    "/disputes",
    response_model=ContributionDisputeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def raise_dispute(
    payload: DisputeRequest,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> ContributionDisputeResponse:
    """A member disputes a contribution they paid."""
    service = ContributionService(db)
    contribution = await db.get(Contribution, payload.contribution_id)
    if contribution is None:
        raise NotFoundError("Contribution not found.")
    group = await db.get(Group, contribution.group_id)
    membership = await get_membership(
        db=db, group_id=group.id, user_id=user.id, allow_invited=False
    )
    dispute = await service.raise_dispute(
        group=group,
        membership=membership,
        contribution_id=payload.contribution_id,
        reason=payload.reason,
    )
    await db.commit()
    return _dispute_response(dispute)


@router.patch("/disputes/{dispute_id}", response_model=ContributionDisputeResponse)
async def resolve_dispute(
    payload: DisputeResolveRequest,
    dispute_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> ContributionDisputeResponse:
    """A leader resolves a dispute."""
    service = ContributionService(db)
    dispute = await db.get(ContributionDispute, dispute_id)
    if dispute is None:
        raise NotFoundError("Dispute not found.")
    group = await db.get(Group, dispute.group_id)
    await get_membership(
        db=db, group_id=group.id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    resolved = await service.resolve_dispute(
        group=group,
        actor=user,
        dispute_id=dispute_id,
        status=payload.status,
        resolution_note=payload.resolution_note,
    )
    await db.commit()
    return _dispute_response(resolved)
