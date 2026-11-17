"""Add penalty contributions, pot distribution tables, device tokens,
fix contribution_day range for weekly groups.

Revision ID: 0002_v2_market
Revises: 0001_initial
Create Date: 2026-11-17

Changes
-------
1. contributions.type CHECK — add 'penalty' type, update sign rule.
2. groups.contribution_day CHECK — widen from 1-28 to 0-28 to allow
   weekly groups (0=Monday … 6=Sunday).
3. New table: pot_distributions
4. New table: distribution_shares
5. New table: device_tokens (mobile push notification tokens)
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_v2_market"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. contributions — add 'penalty' type
    #    Drop the old constraints and recreate with the new values.
    #    PostgreSQL does not support ALTER CONSTRAINT, so we drop + add.
    # ------------------------------------------------------------------
    op.drop_constraint("contribution_type_check", "contributions", type_="check")
    op.drop_constraint("contribution_sign_rule", "contributions", type_="check")
    op.drop_constraint("contribution_reversal_link", "contributions", type_="check")

    op.create_check_constraint(
        "contribution_type_check",
        "contributions",
        "type IN ('payment','reversal','penalty')",
    )
    op.create_check_constraint(
        "contribution_sign_rule",
        "contributions",
        "(type IN ('payment','penalty') AND amount_rwf > 0) "
        "OR (type = 'reversal' AND amount_rwf < 0)",
    )
    op.create_check_constraint(
        "contribution_reversal_link",
        "contributions",
        "(type IN ('payment','penalty') AND reverses_id IS NULL) "
        "OR (type = 'reversal' AND reverses_id IS NOT NULL)",
    )

    # ------------------------------------------------------------------
    # 2. groups — widen contribution_day to 0-28
    #    0-6  = day-of-week for weekly groups (0=Monday)
    #    1-28 = day-of-month for monthly/biweekly groups
    # ------------------------------------------------------------------
    op.drop_constraint("groups_contribution_day_range", "groups", type_="check")
    op.create_check_constraint(
        "groups_contribution_day_range",
        "groups",
        "contribution_day >= 0 AND contribution_day <= 28",
    )

    # ------------------------------------------------------------------
    # 3. pot_distributions
    # ------------------------------------------------------------------
    op.create_table(
        "pot_distributions",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period", sa.String(length=8), nullable=False),
        sa.Column("total_amount_rwf", sa.BigInteger(), nullable=False),
        sa.Column(
            "equal_shares",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "total_amount_rwf > 0", name="distribution_amount_positive"
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "distributions_group_period",
        "pot_distributions",
        ["group_id", "period"],
    )

    # ------------------------------------------------------------------
    # 4. distribution_shares
    # ------------------------------------------------------------------
    op.create_table(
        "distribution_shares",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column(
            "distribution_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount_rwf", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("amount_rwf > 0", name="share_amount_positive"),
        sa.ForeignKeyConstraint(
            ["distribution_id"],
            ["pot_distributions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "distribution_id",
            "membership_id",
            name="uq_share_per_member",
        ),
    )
    op.create_index(
        "shares_distribution",
        "distribution_shares",
        ["distribution_id"],
    )

    # ------------------------------------------------------------------
    # 5. device_tokens
    # ------------------------------------------------------------------
    op.create_table(
        "device_tokens",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=8), nullable=False),
        sa.Column("app_version", sa.String(length=32), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "platform IN ('android','ios','web')",
            name="device_token_platform_check",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_device_token"),
    )
    op.create_index("device_tokens_user_id", "device_tokens", ["user_id"])


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse in reverse order
    # ------------------------------------------------------------------
    op.drop_table("device_tokens")
    op.drop_table("distribution_shares")
    op.drop_table("pot_distributions")

    # Revert contribution_day constraint
    op.drop_constraint("groups_contribution_day_range", "groups", type_="check")
    op.create_check_constraint(
        "groups_contribution_day_range",
        "groups",
        "contribution_day >= 1 AND contribution_day <= 28",
    )

    # Revert contribution type constraints
    op.drop_constraint("contribution_type_check", "contributions", type_="check")
    op.drop_constraint("contribution_sign_rule", "contributions", type_="check")
    op.drop_constraint("contribution_reversal_link", "contributions", type_="check")

    op.create_check_constraint(
        "contribution_type_check",
        "contributions",
        "type IN ('payment','reversal')",
    )
    op.create_check_constraint(
        "contribution_sign_rule",
        "contributions",
        "(type = 'payment' AND amount_rwf > 0) "
        "OR (type = 'reversal' AND amount_rwf < 0)",
    )
    op.create_check_constraint(
        "contribution_reversal_link",
        "contributions",
        "(type = 'payment' AND reverses_id IS NULL) "
        "OR (type = 'reversal' AND reverses_id IS NOT NULL)",
    )
