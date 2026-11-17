"""Groups routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, status

from app.auth.router import _client_ip
from app.common.envelope import Page
from app.core.dependencies import CurrentUser, DbSession, PageParams, get_membership
from app.core.errors import NotFoundError
from app.core.rate_limit import rate_limit
from app.groups.schemas import (
    AddMemberRequest,
    CreateGroupRequest,
    DistributePotRequest,
    GroupResponse,
    MembershipResponse,
    PotDistributionResponse,
    DistributionShareResponse,
    UpdateGroupRulesRequest,
    UpdateMemberRequest,
)
from app.groups.service import GroupService
from app.models.group import Group, Membership

router = APIRouter(prefix="/groups", tags=["groups"])


def _group_response(group: Group) -> GroupResponse:
    return GroupResponse.model_validate(group)


def _membership_response(member: Membership) -> MembershipResponse:
    return MembershipResponse.model_validate(member)


@router.post(
    "", response_model=GroupResponse, status_code=status.HTTP_201_CREATED
)
@rate_limit("groups.create", limit=10, window_seconds=3600)
async def create_group(
    payload: CreateGroupRequest,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> GroupResponse:
    """Create a savings group. The caller becomes its president."""
    service = GroupService(db)
    group = await service.create_group(
        creator=user,
        name=payload.name,
        description=payload.description,
        district=payload.district,
        sector=payload.sector,
        default_contribution_rwf=payload.default_contribution_rwf,
        frequency=payload.frequency,
        contribution_day=payload.contribution_day,
        loan_interest_bp=payload.loan_interest_bp,
        max_loan_multiple=payload.max_loan_multiple,
    )
    await db.commit()
    return _group_response(group)


@router.get("", response_model=Page[GroupResponse])
async def list_groups(
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
    pagination: PageParams = Depends(),
) -> Page[GroupResponse]:
    """List groups the caller belongs to."""
    service = GroupService(db)
    page = await service.list_groups_for_user(user=user, pagination=pagination)
    return Page[GroupResponse].build(
        items=[_group_response(g) for g in page.items],
        total=page.pagination.total,
        page=page.pagination.page,
        per_page=page.pagination.per_page,
    )


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> GroupResponse:
    """Get a group the caller belongs to."""
    service = GroupService(db)
    group = await service.get_group(group_id)
    await get_membership(db=db, group_id=group_id, user_id=user.id)
    return _group_response(group)


@router.patch("/{group_id}/rules", response_model=GroupResponse)
async def update_group_rules(
    payload: UpdateGroupRulesRequest,
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> GroupResponse:
    """Change group rules. Only the president may do this."""
    service = GroupService(db)
    await get_membership(
        db=db, group_id=group_id, user_id=user.id, required_roles=("president",)
    )
    group = await service.get_group(group_id)
    updates = payload.model_dump(exclude_unset=True, exclude={"effective_from_period"})
    # Replace loan_interest_pct with loan_interest_bp for the service layer
    if "loan_interest_pct" in updates:
        updates["loan_interest_bp"] = payload.loan_interest_bp
        del updates["loan_interest_pct"]
    updated = await service.update_rules(
        group=group,
        actor=user,
        updates=updates,
        effective_from_period=payload.effective_from_period,
    )
    await db.commit()
    return _group_response(updated)


@router.post(
    "/{group_id}/members",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit("groups.add_member", limit=20, window_seconds=3600)
async def add_member(
    payload: AddMemberRequest,
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> MembershipResponse:
    """Invite a member by phone number."""
    service = GroupService(db)
    await get_membership(
        db=db,
        group_id=group_id,
        user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    group = await service.get_group(group_id)
    created = await service.add_member(
        group=group,
        actor=user,
        phone_raw=payload.phone,
        role=payload.role,
        suggested_contribution_rwf=payload.suggested_contribution_rwf,
    )
    await service.notify_invitation(membership=created, actor=user)
    await db.commit()
    return _membership_response(created)


@router.get("/{group_id}/members", response_model=Page[MembershipResponse])
async def list_members(
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
    pagination: PageParams = Depends(),
) -> Page[MembershipResponse]:
    """List active members of a group."""
    service = GroupService(db)
    await get_membership(db=db, group_id=group_id, user_id=user.id)
    group = await service.get_group(group_id)
    page = await service.list_members(group=group, pagination=pagination)
    return Page[MembershipResponse].build(
        items=[_membership_response(m) for m in page.items],
        total=page.pagination.total,
        page=page.pagination.page,
        per_page=page.pagination.per_page,
    )


@router.patch("/{group_id}/members/{membership_id}", response_model=MembershipResponse)
async def update_member(
    payload: UpdateMemberRequest,
    group_id: uuid.UUID = Path(...),
    membership_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> MembershipResponse:
    """Change a member's role or suspend/reactivate them. President only."""
    service = GroupService(db)
    await get_membership(
        db=db, group_id=group_id, user_id=user.id, required_roles=("president",)
    )
    membership = await db.get(Membership, membership_id)
    if membership is None or membership.group_id != group_id:
        raise NotFoundError("Membership not found.")
    updates = payload.model_dump(exclude_unset=True)
    updated = await service.update_membership(
        group=await service.get_group(group_id),
        actor=user,
        membership=membership,
        updates=updates,
    )
    await db.commit()
    return _membership_response(updated)


@router.delete("/{group_id}/members/{membership_id}", status_code=204)
async def remove_member(
    group_id: uuid.UUID = Path(...),
    membership_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> None:
    """Remove a member. President only; financial history stays."""
    service = GroupService(db)
    await get_membership(
        db=db, group_id=group_id, user_id=user.id, required_roles=("president",)
    )
    membership = await db.get(Membership, membership_id)
    if membership is None or membership.group_id != group_id:
        raise NotFoundError("Membership not found.")
    await service.remove_member(
        group=await service.get_group(group_id), actor=user, membership=membership
    )
    await db.commit()
    return None


@router.post(
    "/{group_id}/distributions",
    response_model=PotDistributionResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit("groups.distribute", limit=5, window_seconds=3600)
async def distribute_pot(
    payload: DistributePotRequest,
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> PotDistributionResponse:
    """Record a year-end or cycle-end pot distribution (president only).

    Calculates each active member's share — either equally or proportional
    to their contributions — and returns the full breakdown.
    """
    service = GroupService(db)
    await get_membership(
        db=db, group_id=group_id, user_id=user.id, required_roles=("president",)
    )
    group = await service.get_group(group_id)
    distribution, shares = await service.distribute_pot(
        group=group,
        actor=user,
        period=payload.period,
        total_amount_rwf=payload.total_amount_rwf,
        equal_shares=payload.equal_shares,
        notes=payload.notes,
    )
    await db.commit()
    return PotDistributionResponse(
        id=distribution.id,
        group_id=distribution.group_id,
        period=distribution.period,
        total_amount_rwf=distribution.total_amount_rwf,
        equal_shares=distribution.equal_shares,
        notes=distribution.notes,
        recorded_by_user_id=distribution.recorded_by_user_id,
        created_at=distribution.created_at,
        shares=[
            DistributionShareResponse(
                id=s.id,
                distribution_id=s.distribution_id,
                membership_id=s.membership_id,
                amount_rwf=s.amount_rwf,
                created_at=s.created_at,
            )
            for s in shares
        ],
    )


@router.get(
    "/{group_id}/distributions",
    response_model=Page[PotDistributionResponse],
)
async def list_distributions(
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
    pagination: PageParams = Depends(),
) -> Page[PotDistributionResponse]:
    """List all pot distributions for a group (any member can view)."""
    from sqlalchemy import select, func
    from app.models.group import PotDistribution, DistributionShare

    await get_membership(db=db, group_id=group_id, user_id=user.id)

    query = (
        select(PotDistribution)
        .where(PotDistribution.group_id == group_id)
        .order_by(PotDistribution.created_at.desc())
    )
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(pagination.offset).limit(pagination.limit))
    distributions = list(result.scalars())

    items = []
    for dist in distributions:
        shares_result = await db.scalars(
            select(DistributionShare).where(
                DistributionShare.distribution_id == dist.id
            )
        )
        share_list = list(shares_result)
        items.append(
            PotDistributionResponse(
                id=dist.id,
                group_id=dist.group_id,
                period=dist.period,
                total_amount_rwf=dist.total_amount_rwf,
                equal_shares=dist.equal_shares,
                notes=dist.notes,
                recorded_by_user_id=dist.recorded_by_user_id,
                created_at=dist.created_at,
                shares=[
                    DistributionShareResponse(
                        id=s.id,
                        distribution_id=s.distribution_id,
                        membership_id=s.membership_id,
                        amount_rwf=s.amount_rwf,
                        created_at=s.created_at,
                    )
                    for s in share_list
                ],
            )
        )

    return Page[PotDistributionResponse].build(
        items=items,
        total=total or 0,
        page=pagination.page,
        per_page=pagination.per_page,
    )
