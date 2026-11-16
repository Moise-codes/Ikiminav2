"""Immutable ledger tables: contributions, disputes, repayments.

Nothing in this module is ever updated or deleted after insert. A mistake is
corrected by writing a reversal row that points back at the original, which
preserves the full history of what the treasurer recorded and when.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, uuid7

LEDGER_TYPES = ("payment", "reversal")
PAYMENT_METHODS = ("cash", "mtn_momo", "airtel_money", "bank")
DISPUTE_STATUSES = ("open", "upheld", "rejected")


class Contribution(Base):
    __tablename__ = "contributions"
    __table_args__ = (
        CheckConstraint("type IN ('payment','reversal')", name="contribution_type_check"),
        CheckConstraint(
            "method IN ('cash','mtn_momo','airtel_money','bank')",
            name="contribution_method_check",
        ),
        CheckConstraint("amount_rwf <> 0", name="contribution_amount_nonzero"),
        CheckConstraint(
            "(type = 'payment' AND amount_rwf > 0) OR (type = 'reversal' AND amount_rwf < 0)",
            name="contribution_sign_rule",
        ),
        CheckConstraint(
            "(type = 'payment' AND reverses_id IS NULL) OR (type = 'reversal' AND reverses_id IS NOT NULL)",
            name="contribution_reversal_link",
        ),
        CheckConstraint("paid_at <= created_at", name="contribution_paid_not_future"),
        Index("contributions_group_period_member", "group_id", "period", "membership_id"),
        Index("contributions_member_paid", "membership_id", "paid_at"),
        Index(
            "contributions_idempotency",
            "group_id",
            "idempotency_key",
            unique=True,
            postgresql_where="idempotency_key IS NOT NULL",
        ),
        Index(
            "contributions_unique_reversal",
            "reverses_id",
            unique=True,
            postgresql_where="reverses_id IS NOT NULL",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    period: Mapped[str] = mapped_column(String(8), nullable=False)
    type: Mapped[str] = mapped_column(String(8), nullable=False)
    amount_rwf: Mapped[int] = mapped_column(nullable=False)
    reverses_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contributions.id", ondelete="RESTRICT")
    )
    paid_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(64))
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ContributionDispute(Base):
    __tablename__ = "contribution_disputes"
    __table_args__ = (
        CheckConstraint(
            "status IN ('open','upheld','rejected')", name="dispute_status_check"
        ),
        Index("contribution_disputes_contribution", "contribution_id"),
        Index("contribution_disputes_group_status", "group_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    contribution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contributions.id", ondelete="RESTRICT"), nullable=False
    )
    raised_by_membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(
        String(8), nullable=False, server_default="open"
    )
    resolved_by_membership_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT")
    )
    resolution_note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class Repayment(Base):
    __tablename__ = "repayments"
    __table_args__ = (
        CheckConstraint("type IN ('payment','reversal')", name="repayment_type_check"),
        CheckConstraint(
            "method IN ('cash','mtn_momo','airtel_money','bank')",
            name="repayment_method_check",
        ),
        CheckConstraint(
            "(type = 'payment' AND amount_rwf > 0) OR (type = 'reversal' AND amount_rwf < 0)",
            name="repayment_sign_rule",
        ),
        CheckConstraint(
            "amount_rwf = principal_part_rwf + interest_part_rwf",
            name="repayment_split_check",
        ),
        CheckConstraint(
            "(type = 'payment' AND reverses_id IS NULL) OR (type = 'reversal' AND reverses_id IS NOT NULL)",
            name="repayment_reversal_link",
        ),
        Index("repayments_loan_paid", "loan_id", "paid_at"),
        Index("repayments_group_member", "group_id", "membership_id"),
        Index(
            "repayments_idempotency",
            "group_id",
            "idempotency_key",
            unique=True,
            postgresql_where="idempotency_key IS NOT NULL",
        ),
        Index(
            "repayments_unique_reversal",
            "reverses_id",
            unique=True,
            postgresql_where="reverses_id IS NOT NULL",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    loan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("loans.id", ondelete="RESTRICT"), nullable=False
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(8), nullable=False)
    amount_rwf: Mapped[int] = mapped_column(nullable=False)
    principal_part_rwf: Mapped[int] = mapped_column(nullable=False)
    interest_part_rwf: Mapped[int] = mapped_column(nullable=False)
    reverses_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("repayments.id", ondelete="RESTRICT")
    )
    paid_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(64))
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
