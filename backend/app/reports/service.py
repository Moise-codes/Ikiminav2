"""Read-only reports: group summary, member statements, late members.

Changes from original
---------------------
* Fixed missing ``Loan`` import (was referenced but never imported — caused
  a NameError at runtime).
* ``group_summary`` now includes ``total_penalties_rwf`` and correctly
  computes ``available_pot_rwf`` as contributions + interest − active loans.
* ``member_statement`` now includes ``total_penalties_rwf`` so the frontend
  can show penalties separately from regular contributions.
* ``late_members`` now returns the member's suggested contribution amount so
  the frontend can display the expected payment next to each late member.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, PermissionDeniedError
from app.models.ledger import Contribution, Repayment
from app.models.group import Group, Membership
from app.models.identity import User
from app.models.loan import Loan  # was missing — caused NameError


class ReportsService:
    """Read-only aggregates for groups and members."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # group summary
    # ------------------------------------------------------------------
    async def group_summary(self, *, group: Group) -> dict:
        """Financial snapshot for a group.

        Returns:
        - total_contributed_rwf  : sum of all payment-type contributions
        - total_penalties_rwf    : sum of all penalty-type contributions
        - total_loaned_rwf       : lifetime principal that has left the pot
        - total_repaid_rwf       : sum of all repayment payments
        - interest_earned_rwf    : interest component of all repayments
        - available_pot_rwf      : cash still available (shared pot_breakdown)
        """
        from app.common.pot import pot_breakdown

        breakdown = await pot_breakdown(self.db, group.id)
        breakdown["group_id"] = str(group.id)
        return breakdown

    # ------------------------------------------------------------------
    # member statement
    # ------------------------------------------------------------------
    async def member_statement(
        self, *, group: Group, membership_id: uuid.UUID, caller_id: uuid.UUID
    ) -> dict:
        """Detailed statement for one member.

        Any member can view their own. A president or treasurer can view
        any member's statement.
        """
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
                    Membership.role.in_(("president", "treasurer")),
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
        penalties = await self.db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
                Contribution.group_id == group.id,
                Contribution.membership_id == membership_id,
                Contribution.type == "penalty",
            )
        )
        from app.common.pot import COMMITTED_LOAN_STATUSES, ACTIVE_LOAN_STATUSES

        borrowed = await self.db.scalar(
            select(func.coalesce(func.sum(Loan.principal_rwf), 0)).where(
                Loan.group_id == group.id,
                Loan.membership_id == membership_id,
                Loan.status.in_(COMMITTED_LOAN_STATUSES),
            )
        )
        repaid = await self.db.scalar(
            select(func.coalesce(func.sum(Repayment.amount_rwf), 0)).where(
                Repayment.group_id == group.id,
                Repayment.membership_id == membership_id,
                Repayment.type == "payment",
            )
        )
        outstanding = await self.db.scalar(
            select(func.coalesce(func.sum(Loan.outstanding_rwf), 0)).where(
                Loan.group_id == group.id,
                Loan.membership_id == membership_id,
                Loan.status.in_(ACTIVE_LOAN_STATUSES),
            )
        )
        return {
            "membership_id": str(membership_id),
            "total_contributed_rwf": int(contributed or 0),
            "total_penalties_rwf": int(penalties or 0),
            "total_borrowed_rwf": int(borrowed or 0),
            "total_repaid_rwf": int(repaid or 0),
            "outstanding_rwf": int(outstanding or 0),
            "periods": [],
        }

    # ------------------------------------------------------------------
    # late members
    # ------------------------------------------------------------------
    async def late_members(self, *, group: Group, period: str) -> dict:
        """Members who have no payment contribution recorded for a period.

        Returns each late member's ``suggested_contribution_rwf`` so the
        frontend can show how much they owe next to their name.
        """
        members_result = await self.db.scalars(
            select(Membership).where(
                Membership.group_id == group.id,
                Membership.status == "active",
            )
        )
        active_members = list(members_result)

        paid_result = await self.db.scalars(
            select(Contribution.membership_id).where(
                Contribution.group_id == group.id,
                Contribution.period == period,
                Contribution.type == "payment",
            ).distinct()
        )
        paid_ids = set(paid_result)

        late = [
            {
                "membership_id": str(m.id),
                "user_id": str(m.user_id) if m.user_id else None,
                "role": m.role,
                # Amount they owe — custom if set, otherwise group default
                "expected_rwf": m.suggested_contribution_rwf
                or group.default_contribution_rwf,
            }
            for m in active_members
            if m.id not in paid_ids
        ]
        return {
            "group_id": str(group.id),
            "period": period,
            "late_count": len(late),
            "late_members": late,
        }
