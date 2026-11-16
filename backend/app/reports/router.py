"""Reports routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Path, Query

from app.core.dependencies import CurrentUser, DbSession, get_membership
from app.core.errors import NotFoundError, PermissionDeniedError
from app.models.group import Group
from app.models.identity import User
from app.reports.schemas import (
    GroupSummaryResponse,
    LateMembersResponse,
    MemberStatementResponse,
)
from app.reports.service import ReportsService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/groups/{group_id}/summary", response_model=GroupSummaryResponse)
async def group_summary(
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> GroupSummaryResponse:
    service = ReportsService(db)
    await get_membership(db=db, group_id=group_id, user_id=user.id)
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    summary = await service.group_summary(group=group)
    return GroupSummaryResponse(**summary)


@router.get("/groups/{group_id}/members/{membership_id}/statement", response_model=MemberStatementResponse)
async def member_statement(
    group_id: uuid.UUID = Path(...),
    membership_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> MemberStatementResponse:
    service = ReportsService(db)
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    statement = await service.member_statement(
        group=group, membership_id=membership_id, caller_id=user.id
    )
    return MemberStatementResponse(**statement)


@router.get("/groups/{group_id}/late-members", response_model=LateMembersResponse)
async def late_members(
    group_id: uuid.UUID = Path(...),
    period: str = Query(..., pattern=r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$"),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> LateMembersResponse:
    service = ReportsService(db)
    membership = await get_membership(
        db=db, group_id=group_id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    result = await service.late_members(group=group, period=period)
    return LateMembersResponse(**result)
