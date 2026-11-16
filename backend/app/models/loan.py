"""Loan and repayment-schedule tables."""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid7

LOAN_STATUSES = (
    "requested",
    "approved",
    "rejected",
    "disbursed",
    "repaid",
    "overdue",
    "written_off",
)


class Loan(TimestampMixin, Base):
    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint(
            "status IN ('requested','approved','rejected','disbursed','repaid',"
            "'overdue','written_off')",
            name="loan_status_check",
        ),
        CheckConstraint("principal_rwf > 0", name="loan_principal_positive"),
        CheckConstraint(
            "interest_bp >= 0 AND interest_bp <= 5000", name="loan_interest_range"
        ),
        CheckConstraint(
            "term_months >= 1 AND term_months <= 36", name="loan_term_range"
        ),
        CheckConstraint(
            "outstanding_rwf IS NULL OR outstanding_rwf >= 0",
            name="loan_outstanding_non_negative",
        ),
        CheckConstraint(
            "total_due_rwf IS NULL OR total_due_rwf >= principal_rwf",
            name="loan_total_due_check",
        ),
        # A borrower may never decide their own loan.
        CheckConstraint(
            "decided_by_membership_id IS NULL OR decided_by_membership_id <> membership_id",
            name="loan_no_self_approval",
        ),
        Index("loans_group_status", "group_id", "status"),
        Index("loans_member_status", "membership_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    principal_rwf: Mapped[int] = mapped_column(nullable=False)
    interest_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    term_months: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    purpose: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="requested"
    )
    total_due_rwf: Mapped[int | None] = mapped_column()
    outstanding_rwf: Mapped[int | None] = mapped_column()
    decided_by_membership_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT")
    )
    decided_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    decision_reason: Mapped[str | None] = mapped_column(String(300))
    disbursed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    requested_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class LoanScheduleItem(Base):
    __tablename__ = "loan_schedule_items"
    __table_args__ = (
        UniqueConstraint("loan_id", "installment_no", name="uq_loan_installment"),
        CheckConstraint("installment_no >= 1", name="schedule_installment_positive"),
        CheckConstraint("total_rwf = principal_rwf + interest_rwf", name="schedule_sum_check"),
        CheckConstraint(
            "paid_rwf >= 0 AND paid_rwf <= total_rwf", name="schedule_paid_range"
        ),
        Index("schedule_due_date", "due_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    loan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("loans.id", ondelete="CASCADE"), nullable=False
    )
    installment_no: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    due_date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    principal_rwf: Mapped[int] = mapped_column(nullable=False)
    interest_rwf: Mapped[int] = mapped_column(nullable=False)
    total_rwf: Mapped[int] = mapped_column(nullable=False)
    paid_rwf: Mapped[int] = mapped_column(nullable=False, server_default="0")
