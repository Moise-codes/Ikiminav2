"""Loans: request, dual approval, repayment schedule, repayments.

The available pot is computed inside a row lock so two concurrent
approvals cannot spend the same money.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.common.envelope import Page
from app.common.money import build_schedule, simple_interest_rwf
from app.core.errors import (
    BusinessRuleViolation,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.dependencies import Pagination
from app.integrations.sms.templates import render
from app.models.group import Group, Membership
from app.models.identity import User
from app.models.loan import Loan, LoanScheduleItem
from app.models.ledger import Contribution, Repayment
from app.notifications.service import NotificationService

LOAN_STATUSES = (
    "requested", "approved", "rejected", "disbursed", "repaid",
    "overdue", "written_off",
)


class LoanService:
    """Business rules for loans and repayments."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # request
    # ------------------------------------------------------------------
    async def request_loan(
        self,
        *,
        group: Group,
        borrower_membership: Membership,
        principal_rwf: int,
        term_months: int,
        purpose: str | None,
    ) -> Loan:
        """Create a loan request. Approval happens separately."""
        # No overdue loan allowed.
        overdue = await self.db.scalar(
            select(Loan).where(
                Loan.membership_id == borrower_membership.id,
                Loan.status == "overdue",
            )
        )
        if overdue is not None:
            raise BusinessRuleViolation(
                "You have an overdue loan. Repay it before requesting another.",
                code="OVERDUE_LOAN",
            )

        from app.core.config import settings as _settings

        # Max concurrent active loans per member.
        active_loans = await self.db.scalar(
            select(func.count(Loan.id)).where(
                Loan.membership_id == borrower_membership.id,
                Loan.status.in_(("approved", "disbursed", "overdue")),
            )
        )
        if int(active_loans or 0) >= _settings.max_active_loans_per_member:
            raise BusinessRuleViolation(
                f"You already have {_settings.max_active_loans_per_member} "
                "active loan(s) in this group.",
                code="MAX_ACTIVE_LOANS",
            )

        # Minimum membership duration before borrowing.
        if _settings.loan_min_membership_months > 0 and borrower_membership.joined_at:
            months = (dt.date.today() - borrower_membership.joined_at.date()).days // 30
            if months < _settings.loan_min_membership_months:
                raise BusinessRuleViolation(
                    f"You must be a member for at least "
                    f"{_settings.loan_min_membership_months} month(s) "
                    "before requesting a loan.",
                    code="MEMBERSHIP_TOO_SHORT",
                )

        # Pot check — underfunded requests may be queued when allowed.
        available = await self._available_pot(group.id)
        if principal_rwf > available and not _settings.allow_underfunded_loan_requests:
            raise BusinessRuleViolation(
                "The requested amount exceeds the group's available pot.",
                code="POT_INSUFFICIENT",
            )

        # Group loan cap, if configured.
        if group.max_loan_multiple is not None:
            total_contributions = await self.db.scalar(
                select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
                    Contribution.group_id == group.id,
                    Contribution.membership_id == borrower_membership.id,
                    Contribution.type == "payment",
                )
            )
            cap = int(total_contributions or 0) * group.max_loan_multiple
            if principal_rwf > cap:
                raise BusinessRuleViolation(
                    f"The loan exceeds {group.max_loan_multiple}x your total contributions.",
                    code="LOAN_CAP_EXCEEDED",
                )

        loan = Loan(
            group_id=group.id,
            membership_id=borrower_membership.id,
            principal_rwf=principal_rwf,
            interest_bp=group.loan_interest_bp,
            term_months=term_months,
            purpose=purpose,
            status="requested",
        )
        self.db.add(loan)
        await self.db.flush()

        await AuditService(self.db).record(
            action="loan.requested",
            entity_type="loan",
            entity_id=loan.id,
            actor_user_id=borrower_membership.user_id,
            group_id=group.id,
            after_data={
                "principal_rwf": principal_rwf,
                "term_months": term_months,
            },
        )
        return loan

    # ------------------------------------------------------------------
    # approve / reject
    # ------------------------------------------------------------------
    async def decide_loan(
        self,
        *,
        group: Group,
        decider_membership: Membership,
        loan: Loan,
        decision: str,
        reason: str | None,
    ) -> Loan:
        """Approve or reject a loan. A member cannot decide their own loan."""
        if loan.status != "requested":
            raise ConflictError(
                f"This loan is already {loan.status}.", code="LOAN_NOT_REQUESTED"
            )
        if decider_membership.id == loan.membership_id:
            raise BusinessRuleViolation(
                "You cannot decide your own loan.", code="SELF_DECISION"
            )
        if decider_membership.role not in ("president", "treasurer"):
            raise PermissionDeniedError(
                "Only a leader can approve or reject loans.", code="LEADER_ONLY"
            )

        await self.db.execute(
            select(Group).where(Group.id == group.id).with_for_update()
        )

        if decision == "approved":
            # Re-check the pot inside the lock.
            available = await self._available_pot(group.id)
            if loan.principal_rwf > available:
                raise BusinessRuleViolation(
                    "The pot no longer covers this loan.", code="POT_INSUFFICIENT"
                )
            interest_total = simple_interest_rwf(
                loan.principal_rwf, loan.interest_bp, loan.term_months
            )
            loan.total_due_rwf = loan.principal_rwf + interest_total
            loan.outstanding_rwf = loan.total_due_rwf
            loan.status = "approved"
            loan.decided_by_membership_id = decider_membership.id
            loan.decided_at = dt.datetime.now(dt.timezone.utc)
            loan.decision_reason = reason

            # Build the repayment schedule with correct due dates.
            # Due dates are anchored to the group's contribution_day:
            #   - monthly/biweekly groups: contribution_day is day-of-month (1-28)
            #   - weekly groups: contribution_day is day-of-week (0=Mon…6=Sun)
            # We always compute from the NEXT occurrence of that day after today.
            schedule = build_schedule(
                loan.principal_rwf, loan.interest_bp, loan.term_months
            )
            today = dt.date.today()
            due_dates = _compute_due_dates(
                start=today,
                frequency=group.frequency,
                contribution_day=group.contribution_day,
                count=loan.term_months,
            )
            for index, ((principal_part, interest_part, total), due) in enumerate(
                zip(schedule, due_dates), start=1
            ):
                self.db.add(
                    LoanScheduleItem(
                        loan_id=loan.id,
                        installment_no=index,
                        due_date=due,
                        principal_rwf=principal_part,
                        interest_rwf=interest_part,
                        total_rwf=total,
                        paid_rwf=0,
                    )
                )

            await AuditService(self.db).record(
                action="loan.approved",
                entity_type="loan",
                entity_id=loan.id,
                actor_user_id=decider_membership.user_id,
                group_id=group.id,
                after_data={
                    "status": "approved",
                    "total_due_rwf": loan.total_due_rwf,
                    "decided_by": str(decider_membership.id),
                },
            )

            # Notify the borrower.
            await self._notify_loan_decision(loan, "loan_approved")
        else:
            if not reason:
                raise ValidationError("A reason is required for rejection.")
            loan.status = "rejected"
            loan.decided_by_membership_id = decider_membership.id
            loan.decided_at = dt.datetime.now(dt.timezone.utc)
            loan.decision_reason = reason

            await AuditService(self.db).record(
                action="loan.rejected",
                entity_type="loan",
                entity_id=loan.id,
                actor_user_id=decider_membership.user_id,
                group_id=group.id,
                after_data={"status": "rejected", "reason": reason},
            )
            await self._notify_loan_decision(loan, "loan_rejected")

        await self.db.flush()
        return loan

    # ------------------------------------------------------------------
    # repayment
    # ------------------------------------------------------------------
    async def record_repayment(
        self,
        *,
        group: Group,
        actor: User,
        loan_id: uuid.UUID,
        amount_rwf: int,
        paid_at: dt.datetime | None,
        principal_part_rwf: int,
        interest_part_rwf: int,
        method: str,
        reference: str | None,
        idempotency_key: str | None,
        ip: str | None,
    ) -> Repayment:
        """Record a repayment and reduce the outstanding balance."""
        loan = await self.db.get(Loan, loan_id)
        if loan is None or loan.group_id != group.id:
            raise NotFoundError("Loan not found.")
        if loan.status not in ("disbursed", "approved", "overdue"):
            raise ConflictError(
                f"Repayments are not accepted for a {loan.status} loan.",
                code="LOAN_NOT_DISBURSED",
            )

        membership = await self._get_membership(group.id, actor.id)
        if membership.id != loan.membership_id:
            raise PermissionDeniedError(
                "Only the borrower's treasurer records repayments.",
                code="NOT_BORROWER_TREASURER",
            )

        expected = principal_part_rwf + interest_part_rwf
        if amount_rwf != expected:
            raise ValidationError(
                "amount_rwf must equal principal_part_rwf + interest_part_rwf.",
                code="AMOUNT_MISMATCH",
            )

        schedule_item = await self.db.scalar(
            select(LoanScheduleItem).where(
                LoanScheduleItem.loan_id == loan_id,
                LoanScheduleItem.paid_rwf < LoanScheduleItem.total_rwf,
            )
            .order_by(LoanScheduleItem.installment_no)
            .limit(1)
        )
        if schedule_item is None:
            raise ConflictError("This loan is already fully repaid.", code="LOAN_REPAID")

        # Apply the payment to the oldest unpaid instalment.
        remaining = amount_rwf
        items_to_mark = []
        while remaining > 0:
            item = await self.db.scalar(
                select(LoanScheduleItem).where(
                    LoanScheduleItem.loan_id == loan_id,
                    LoanScheduleItem.paid_rwf < LoanScheduleItem.total_rwf,
                )
                .order_by(LoanScheduleItem.installment_no)
                .limit(1)
            )
            if item is None:
                break
            headroom = item.total_rwf - item.paid_rwf
            apply = min(remaining, headroom)
            item.paid_rwf += apply
            remaining -= apply
            items_to_mark.append(item)

        outstanding = max((loan.outstanding_rwf or 0) - amount_rwf, 0)
        loan.outstanding_rwf = outstanding
        if outstanding == 0:
            loan.status = "repaid"

        repayment = Repayment(
            loan_id=loan_id,
            group_id=group.id,
            membership_id=membership.id,
            type="payment",
            amount_rwf=amount_rwf,
            principal_part_rwf=principal_part_rwf,
            interest_part_rwf=interest_part_rwf,
            paid_at=paid_at or dt.datetime.now(dt.timezone.utc),
            method=method,
            reference=reference,
            recorded_by_user_id=actor.id,
            idempotency_key=idempotency_key,
        )
        self.db.add(repayment)

        await AuditService(self.db).record(
            action="repayment.recorded",
            entity_type="repayment",
            entity_id=repayment.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "loan_id": str(loan_id),
                "amount_rwf": amount_rwf,
                "outstanding_rwf": outstanding,
            },
            ip=ip,
        )
        await self.db.flush()
        return repayment

    # ------------------------------------------------------------------
    # queries
    # ------------------------------------------------------------------
    async def list_loans(
        self,
        *,
        group: Group,
        membership_id: uuid.UUID | None,
        status: str | None,
        pagination: Pagination,
    ) -> Page[Loan]:
        query = select(Loan).where(Loan.group_id == group.id)
        if membership_id is not None:
            query = query.where(Loan.membership_id == membership_id)
        if status is not None:
            query = query.where(Loan.status == status)
        query = query.order_by(Loan.requested_at.desc())

        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))
        result = await self.db.execute(
            query.offset(pagination.offset).limit(pagination.limit)
        )
        items = list(result.scalars())
        return Page.build(
            items,
            total=total or 0,
            page=pagination.page,
            per_page=pagination.per_page,
        )

    async def schedule_for_loan(
        self, *, loan: Loan
    ) -> list[LoanScheduleItem]:
        result = await self.db.execute(
            select(LoanScheduleItem)
            .where(LoanScheduleItem.loan_id == loan.id)
            .order_by(LoanScheduleItem.installment_no)
        )
        return list(result.scalars())

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------
    async def _available_pot(self, group_id: uuid.UUID) -> int:
        """Cash available for new lending — shared canonical calculation."""
        from app.common.pot import available_pot

        return await available_pot(self.db, group_id)

    async def _get_membership(self, group_id: uuid.UUID, user_id: uuid.UUID):
        return await self.db.scalar(
            select(Membership).where(
                Membership.group_id == group_id, Membership.user_id == user_id
            )
        )

    async def _notify_loan_decision(self, loan: Loan, template: str) -> None:
        membership = await self.db.get(Membership, loan.membership_id)
        if not membership or not membership.user_id:
            return
        user = await self.db.get(User, membership.user_id)
        if not user or not user.phone:
            return
        notifications = NotificationService(self.db)
        await notifications.notify(
            user_id=user.id,
            phone=user.phone,
            template=template,
            payload={"amount": loan.principal_rwf, "group_id": str(loan.group_id)},
        )


# ---------------------------------------------------------------------------
# Due-date calendar helpers
# ---------------------------------------------------------------------------

def _next_monthly_due(start: dt.date, day_of_month: int) -> dt.date:
    """Return the next occurrence of ``day_of_month`` on or after ``start``.

    ``day_of_month`` is 1–28 (clamped so Feb always has a valid date).
    """
    day = min(day_of_month, 28)
    if start.day <= day:
        # This month still has that day ahead
        try:
            return start.replace(day=day)
        except ValueError:
            pass
    # Move to next month
    if start.month == 12:
        return dt.date(start.year + 1, 1, day)
    return dt.date(start.year, start.month + 1, day)


def _add_months(d: dt.date, months: int) -> dt.date:
    """Add ``months`` to a date, clamped to 28 to avoid month-end issues."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, 28)
    return dt.date(year, month, day)


def _compute_due_dates(
    *,
    start: dt.date,
    frequency: str,
    contribution_day: int,
    count: int,
) -> list[dt.date]:
    """Compute ``count`` due dates anchored to the group's contribution_day.

    ``frequency`` is ``"weekly"`` | ``"biweekly"`` | ``"monthly"``.

    For monthly/biweekly groups ``contribution_day`` is 1–28 (day of month).
    For weekly groups ``contribution_day`` is 0–6 (0=Monday … 6=Sunday).

    The first due date is always at least one full period ahead of ``start``
    so the borrower has time to repay.
    """
    dates: list[dt.date] = []

    if frequency == "monthly":
        first = _next_monthly_due(start, contribution_day)
        # Ensure at least one month ahead
        if first <= start:
            first = _add_months(first, 1)
        for i in range(count):
            dates.append(_add_months(first, i))

    elif frequency == "biweekly":
        # Biweekly: treat contribution_day as day-of-month, every 2 months
        first = _next_monthly_due(start, contribution_day)
        if first <= start:
            first = _add_months(first, 2)
        for i in range(count):
            dates.append(_add_months(first, i * 2))

    else:
        # Weekly: contribution_day is 0=Monday … 6=Sunday
        target_weekday = contribution_day % 7
        days_ahead = (target_weekday - start.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7  # always at least one full week ahead
        first = start + dt.timedelta(days=days_ahead)
        for i in range(count):
            dates.append(first + dt.timedelta(weeks=i))

    return dates
