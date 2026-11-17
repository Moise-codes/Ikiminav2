"""Payment transaction tracking.

Every mobile-money movement (collection or disbursement) gets a row here
when it is initiated. The provider webhook (or a status poll) flips it to
``successful``/``failed``. Only ``successful`` collections create ledger
contributions — money is never counted before the provider confirms it.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, uuid7

PAYMENT_DIRECTIONS = ("collection", "disbursement")
PAYMENT_CHANNELS = ("mtn_momo", "airtel_money")
PAYMENT_TXN_STATUSES = ("pending", "successful", "failed")
PAYMENT_PROVIDERS = ("mtn", "airtel")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    __table_args__ = (
        CheckConstraint(
            "direction IN ('collection','disbursement')",
            name="payment_txn_direction_check",
        ),
        CheckConstraint(
            "channel IN ('mtn_momo','airtel_money')",
            name="payment_txn_channel_check",
        ),
        CheckConstraint(
            "status IN ('pending','successful','failed')",
            name="payment_txn_status_check",
        ),
        CheckConstraint("amount_rwf > 0", name="payment_txn_amount_positive"),
        Index("payment_txn_provider_ref", "provider", "provider_ref", unique=True),
        Index("payment_txn_group_created", "group_id", "created_at"),
        Index(
            "payment_txn_pending",
            "status",
            postgresql_where="status = 'pending'",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    loan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("loans.id", ondelete="SET NULL")
    )
    direction: Mapped[str] = mapped_column(String(13), nullable=False)
    channel: Mapped[str] = mapped_column(String(12), nullable=False)
    provider: Mapped[str] = mapped_column(String(8), nullable=False)
    amount_rwf: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="pending"
    )
    provider_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_txn_id: Mapped[str | None] = mapped_column(String(64))
    counterparty_phone: Mapped[str | None] = mapped_column(String(13))
    idempotency_key: Mapped[str | None] = mapped_column(String(64))
    contribution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contributions.id", ondelete="SET NULL")
    )
    failure_reason: Mapped[str | None] = mapped_column(String(300))
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
