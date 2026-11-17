"""Add payment_transactions table for provider-confirmed money movement.

Revision ID: 0003_payment_txn
Revises: 0002_v2_market
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_payment_txn"
down_revision: Union[str, None] = "0002_v2_market"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "payment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("loan_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("direction", sa.String(length=13), nullable=False),
        sa.Column("channel", sa.String(length=12), nullable=False),
        sa.Column("provider", sa.String(length=8), nullable=False),
        sa.Column("amount_rwf", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False, server_default="pending"),
        sa.Column("provider_ref", sa.String(length=64), nullable=False),
        sa.Column("provider_txn_id", sa.String(length=64), nullable=True),
        sa.Column("counterparty_phone", sa.String(length=13), nullable=True),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
        sa.Column("contribution_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("failure_reason", sa.String(length=300), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("direction IN ('collection','disbursement')", name="payment_txn_direction_check"),
        sa.CheckConstraint("channel IN ('mtn_momo','airtel_money')", name="payment_txn_channel_check"),
        sa.CheckConstraint("status IN ('pending','successful','failed')", name="payment_txn_status_check"),
        sa.CheckConstraint("amount_rwf > 0", name="payment_txn_amount_positive"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["membership_id"], ["memberships.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["loan_id"], ["loans.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["contribution_id"], ["contributions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("payment_txn_provider_ref", "payment_transactions", ["provider", "provider_ref"], unique=True)
    op.create_index("payment_txn_group_created", "payment_transactions", ["group_id", "created_at"])
    op.create_index(
        "payment_txn_pending", "payment_transactions", ["status"],
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_table("payment_transactions")
