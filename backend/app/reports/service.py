"""Read-only reports: group summary, member statements, late members."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, PermissionDeniedError
from app.core.dependencies import get_membership
from app.models.contributions import Contribution, Repayment
from app.models.group import Group, Membership
from app.models.identity import User


class ReportsService:
    """Read-only aggregates for groups and members."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def group_summary(self, *, group: Group) -> dict:
        contributed = await self.db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
                Contribution.group_id == group.id,
                Contribution.type == "payment",
            )
        )
        loaned = await self.db.scalar(
            select(func.coalesce(func.sum(Loan.principal_rwf), 0)).where(
                Loan.group_id == group.id,
                Loan.status.in_(("approved", "disbursed", "overdue")),
            )
        )
        repaid = await self.db.scalar(
            select(func.coalesce(func.sum(Repayment.amount_rwf), 0)).where(
                Repayment.group_id == group.id,
                Repayment.type == "payment",
            )
        )
        return {
            "group_id": str(group.id),
            "total_contributed_rwf": int(contributed or 0),
            "total_loaned_rwf": int(loaned or 0),
            "total_repaid_rwf": int(repaid or 0),
            "interest_earned_rwf": 0,
            "available_pot_rwf": max(int(contributed or 0) - int(loaned or 0), 0),
        }

    async def member_statement(
        self, *, group: Group, membership_id: uuid.UUID, caller_id: uuid.UUID
    ) -> dict:
        # Caller must see only their own statement unless they lead the group.
        membership = await self.db.scalar(
            select(Membership).where(
                Membership.id == membership_id,
                Membership.group_id == group.id,
            )
        )
        if membership is None:
            raise NotFoundError("Membership not found.")
        if membership.user_id != caller_id:
            leader = await self.db.scalar(
                select(Membership).where(
                    Membership.group_id == group.id,
                    Membership.user_id == caller_id,
                    Membership.role.in_(
                        ("president", "treasurer")
                    ),
                    Membership.status == "active",
                )
            )
            if leader is None:
                raise PermissionDeniedError("You can only view your own statement.")

        contributed = await self.db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
                Contribution.group_id == group.id,
                Contribution.membership_id == membership_id,
                Contribution.type == "payment",
            )
        )
        borrowed = await self.db.scalar(
            select(func.coalesce(func.sum(Loan.principal_rwf), 0)).where(
                Loan.group_id == group.id,
                Loan.membership_id == membership_id,
            )
        )
        repaid = await self.db.scalar(
            select(func.coalesce(func.sum(Repayment.amount_rwf), 0)).where(
                Repayment.group_id == group.id,
                Repayment.membership_id == membership_id,
                Repayment.type == "payment",
            )
        )
        return {
            "membership_id": str(membership_id),
            "total_contributed_rwf": int(contributed or 0),
            "total_borrowed_rwf": int(borrowed or 0),
            "total_repaid_rwf": int(repaid or 0),
            "outstanding_rwf": max(int(borrowed or 0) - int(repaid or 0), 0),
            "periods": [],
        }

    async def late_members(self, *, group: Group, period: str) -> dict:
        # Members expected to contribute who have no payment recorded for the period.
        members = await self.db.scalars(
            select(Membership).where(
                Membership.group_id == group.id,
                Membership.status == "active",
            )
        )
        active_members = list(members)
        paid = await self.db.scalars(
            select(Contribution.membership_id).where(
                Contribution.group_id == group.id,
                Contribution.period == period,
                Contribution.type == "payment",
            ).distinct()
        )
        paid_ids = set(paid)
        late = [
            {
                "membership_id": str(m.id),
                "user_id": str(m.user_id) if m.user_id else None,
                "role": m.role,
            }
            for m in active_members
            if m.id not in paid_ids
        ]
        return {
            "group_id": str(group.id),
            "period": period,
            "late_members": late,
        }
