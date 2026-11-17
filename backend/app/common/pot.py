"""Canonical group-pot calculation shared by reports and lending checks.

Cash accounting:

    pot = contributions(payments) + penalties + repayments_received
          - principal of every loan that was ever disbursed

A loan's principal counts as money-out from the moment it is approved
(``approved`` is the de-facto disbursed state — nothing else sets
``disbursed``). Repayments bring cash back, so a fully repaid loan nets to
its interest only. ``requested``/``rejected`` loans never moved money and
are excluded.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ledger import Contribution, Repayment
from app.models.loan import Loan
from app.models.payment import PaymentTransaction

#: Loans whose principal has left (or is committed to leave) the pot.
COMMITTED_LOAN_STATUSES = (
    "approved",
    "disbursed",
    "overdue",
    "repaid",
    "written_off",
)

#: Loans with money still owed by members.
ACTIVE_LOAN_STATUSES = ("approved", "disbursed", "overdue")


async def pot_breakdown(db: AsyncSession, group_id: uuid.UUID) -> dict:
    """Return the cash components of a group's pot."""
    paid = await db.scalar(
        select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
            Contribution.group_id == group_id,
            Contribution.type == "payment",
        )
    )
    penalties = await db.scalar(
        select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
            Contribution.group_id == group_id,
            Contribution.type == "penalty",
        )
    )
    repaid = await db.scalar(
        select(func.coalesce(func.sum(Repayment.amount_rwf), 0)).where(
            Repayment.group_id == group_id,
            Repayment.type == "payment",
        )
    )
    interest = await db.scalar(
        select(func.coalesce(func.sum(Repayment.interest_part_rwf), 0)).where(
            Repayment.group_id == group_id,
            Repayment.type == "payment",
        )
    )
    lent_out = await db.scalar(
        select(func.coalesce(func.sum(Loan.principal_rwf), 0)).where(
            Loan.group_id == group_id,
            Loan.status.in_(COMMITTED_LOAN_STATUSES),
        )
    )
    active_principal = await db.scalar(
        select(func.coalesce(func.sum(Loan.principal_rwf), 0)).where(
            Loan.group_id == group_id,
            Loan.status.in_(ACTIVE_LOAN_STATUSES),
        )
    )
    active_principal_repaid = await db.scalar(
        select(func.coalesce(func.sum(Repayment.principal_part_rwf), 0))
        .join(Loan, Repayment.loan_id == Loan.id)
        .where(
            Repayment.group_id == group_id,
            Repayment.type == "payment",
            Loan.status.in_(ACTIVE_LOAN_STATUSES),
        )
    )

    payouts = await db.scalar(
        select(func.coalesce(func.sum(PaymentTransaction.amount_rwf), 0)).where(
            PaymentTransaction.group_id == group_id,
            PaymentTransaction.direction == "disbursement",
            PaymentTransaction.status == "successful",
            PaymentTransaction.loan_id.is_(None),
        )
    )

    paid_i = int(paid or 0)
    penalties_i = int(penalties or 0)
    repaid_i = int(repaid or 0)
    interest_i = int(interest or 0)
    lent_i = int(lent_out or 0)
    payouts_i = int(payouts or 0)
    outstanding = max(
        int(active_principal or 0) - int(active_principal_repaid or 0), 0
    )

    return {
        "total_contributed_rwf": paid_i,
        "total_penalties_rwf": penalties_i,
        # Lifetime principal that has left the pot (approved and beyond).
        "total_loaned_rwf": lent_i,
        "total_repaid_rwf": repaid_i,
        "interest_earned_rwf": interest_i,
        # Principal still owed on active loans (for display only).
        "outstanding_principal_rwf": outstanding,
        # Confirmed mobile-money payouts that are not loan disbursements.
        "total_payouts_rwf": payouts_i,
        "available_pot_rwf": max(
            paid_i + penalties_i + repaid_i - lent_i - payouts_i, 0
        ),
    }


async def available_pot(db: AsyncSession, group_id: uuid.UUID) -> int:
    """Cash the group can still commit to a new loan or payout."""
    return int((await pot_breakdown(db, group_id))["available_pot_rwf"])
