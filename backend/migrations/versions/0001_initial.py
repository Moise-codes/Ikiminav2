"""Initial schema for Itsinda Platform v2.

Creates all 14 core tables plus platform support tables with every constraint,
index and trigger from the design document. This is the single source of truth
for the v1 database layout; do not edit it after it has been applied.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from app.models.base import uuid7

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # --- users -----------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=13), nullable=True),
        sa.Column("phone_operator", sa.String(length=12), nullable=True),
        sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column(
            "preferred_language",
            sa.String(length=2),
            nullable=False,
            server_default="rw",
        ),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("privacy_notice_version", sa.String(length=16), nullable=False),
        sa.Column(
            "privacy_accepted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("failed_login_count", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True),
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
            "phone ~ '^\\+250(72|73|78|79)[0-9]{7}$'",
            name="users_phone_format",
        ),
        sa.CheckConstraint(
            "status IN ('active','locked','deactivated','anonymized')",
            name="users_status_check",
        ),
        sa.CheckConstraint(
            "preferred_language IN ('rw','en','fr')",
            name="users_language_check",
        ),
        sa.CheckConstraint(
            "email IS NULL OR email = lower(email)",
            name="users_email_lowercase",
        ),
        sa.CheckConstraint(
            "(status = 'anonymized') = (phone IS NULL AND email IS NULL)",
            name="users_anonymized_clears_pii",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("users_phone_unique", "users", ["phone"], unique=True)
    op.create_index(
        "users_email_unique",
        "users",
        ["email"],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )

    # --- groups ----------------------------------------------------------
    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("district", sa.String(length=50), nullable=True),
        sa.Column("sector", sa.String(length=50), nullable=True),
        sa.Column("default_contribution_rwf", sa.BigInteger(), nullable=False),
        sa.Column(
            "frequency", sa.String(length=8), nullable=False
        ),
        sa.Column("contribution_day", sa.SmallInteger(), nullable=False),
        sa.Column(
            "loan_interest_bp", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("max_loan_multiple", sa.SmallInteger(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("rules_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
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
            "frequency IN ('weekly','biweekly','monthly')",
            name="groups_frequency_check",
        ),
        sa.CheckConstraint(
            "status IN ('active','suspended','closed')",
            name="groups_status_check",
        ),
        sa.CheckConstraint(
            "default_contribution_rwf >= 100 AND default_contribution_rwf <= 100000000",
            name="groups_contribution_range",
        ),
        sa.CheckConstraint(
            "loan_interest_bp >= 0 AND loan_interest_bp <= 5000",
            name="groups_interest_range",
        ),
        sa.CheckConstraint(
            "contribution_day >= 1 AND contribution_day <= 28",
            name="groups_contribution_day_range",
        ),
        sa.CheckConstraint("rules_version >= 1", name="groups_rules_version_check"),
        sa.ForeignKeyConstraint(
            ["created_by"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("groups_created_by", "groups", ["created_by"])

    # --- group_rule_versions ---------------------------------------------
    op.create_table(
        "group_rule_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("default_contribution_rwf", sa.BigInteger(), nullable=False),
        sa.Column("frequency", sa.String(length=8), nullable=False),
        sa.Column("contribution_day", sa.SmallInteger(), nullable=False),
        sa.Column("loan_interest_bp", sa.Integer(), nullable=False),
        sa.Column("max_loan_multiple", sa.SmallInteger(), nullable=True),
        sa.Column("effective_from_period", sa.String(length=8), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["changed_by"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "version", name="uq_group_rule_version"),
    )
    op.create_index("group_rule_versions_group", "group_rule_versions", ["group_id"])

    # --- memberships -----------------------------------------------------
    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("invited_phone", sa.String(length=13), nullable=True),
        sa.Column("role", sa.String(length=16), nullable=False, server_default="member"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="invited"),
        sa.Column("suggested_contribution_rwf", sa.BigInteger(), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("added_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            "role IN ('president','treasurer','member')",
            name="membership_role_check",
        ),
        sa.CheckConstraint(
            "status IN ('invited','active','suspended','left')",
            name="membership_status_check",
        ),
        sa.CheckConstraint(
            "user_id IS NOT NULL OR invited_phone IS NOT NULL",
            name="membership_has_identity",
        ),
        sa.CheckConstraint(
            "invited_phone IS NULL OR invited_phone ~ '^\\+250(72|73|78|79)[0-9]{7}$'",
            name="membership_invited_phone_format",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["added_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "memberships_unique_user_group",
        "memberships",
        ["group_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("status <> 'left' AND user_id IS NOT NULL"),
    )
    op.create_index(
        "memberships_unique_invite",
        "memberships",
        ["group_id", "invited_phone"],
        unique=True,
        postgresql_where=sa.text("status = 'invited'"),
    )
    op.create_index(
        "memberships_one_president",
        "memberships",
        ["group_id"],
        unique=True,
        postgresql_where=sa.text("role = 'president' AND status = 'active'"),
    )
    op.create_index(
        "memberships_one_treasurer",
        "memberships",
        ["group_id"],
        unique=True,
        postgresql_where=sa.text("role = 'treasurer' AND status = 'active'"),
    )
    op.create_index("memberships_user_status", "memberships", ["user_id", "status"])

    # --- contributions (immutable ledger) --------------------------------
    op.create_table(
        "contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period", sa.String(length=8), nullable=False),
        sa.Column("type", sa.String(length=8), nullable=False),
        sa.Column("amount_rwf", sa.BigInteger(), nullable=False),
        sa.Column("reverses_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=True),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "type IN ('payment','reversal')",
            name="contribution_type_check",
        ),
        sa.CheckConstraint(
            "method IN ('cash','mtn_momo','airtel_money','bank')",
            name="contribution_method_check",
        ),
        sa.CheckConstraint("amount_rwf <> 0", name="contribution_amount_nonzero"),
        sa.CheckConstraint(
            "(type = 'payment' AND amount_rwf > 0) OR "
            "(type = 'reversal' AND amount_rwf < 0)",
            name="contribution_sign_rule",
        ),
        sa.CheckConstraint(
            "(type = 'payment' AND reverses_id IS NULL) OR "
            "(type = 'reversal' AND reverses_id IS NOT NULL)",
            name="contribution_reversal_link",
        ),
        sa.CheckConstraint("paid_at <= created_at", name="contribution_paid_not_future"),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["reverses_id"], ["contributions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "contributions_group_period_member",
        "contributions",
        ["group_id", "period", "membership_id"],
    )
    op.create_index(
        "contributions_member_paid", "contributions", ["membership_id", "paid_at"]
    )
    op.create_index(
        "contributions_idempotency",
        "contributions",
        ["group_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "contributions_unique_reversal",
        "contributions",
        ["reverses_id"],
        unique=True,
        postgresql_where=sa.text("reverses_id IS NOT NULL"),
    )

    # --- contribution_disputes ------------------------------------------
    op.create_table(
        "contribution_disputes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contribution_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "raised_by_membership_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=8), nullable=False, server_default="open"),
        sa.Column(
            "resolved_by_membership_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("resolution_note", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('open','upheld','rejected')",
            name="dispute_status_check",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["contribution_id"], ["contributions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["raised_by_membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by_membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "contribution_disputes_contribution",
        "contribution_disputes",
        ["contribution_id"],
    )
    op.create_index(
        "contribution_disputes_group_status",
        "contribution_disputes",
        ["group_id", "status"],
    )

    # --- loans -----------------------------------------------------------
    op.create_table(
        "loans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("principal_rwf", sa.BigInteger(), nullable=False),
        sa.Column("interest_bp", sa.Integer(), nullable=False),
        sa.Column("term_months", sa.SmallInteger(), nullable=False),
        sa.Column("purpose", sa.String(length=300), nullable=True),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="requested",
        ),
        sa.Column("total_due_rwf", sa.BigInteger(), nullable=True),
        sa.Column("outstanding_rwf", sa.BigInteger(), nullable=True),
        sa.Column(
            "decided_by_membership_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.String(length=300), nullable=True),
        sa.Column("disbursed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
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
            "status IN ('requested','approved','rejected','disbursed','repaid',"
            "'overdue','written_off')",
            name="loan_status_check",
        ),
        sa.CheckConstraint("principal_rwf > 0", name="loan_principal_positive"),
        sa.CheckConstraint(
            "interest_bp >= 0 AND interest_bp <= 5000", name="loan_interest_range"
        ),
        sa.CheckConstraint(
            "term_months >= 1 AND term_months <= 36", name="loan_term_range"
        ),
        sa.CheckConstraint(
            "outstanding_rwf IS NULL OR outstanding_rwf >= 0",
            name="loan_outstanding_non_negative",
        ),
        sa.CheckConstraint(
            "total_due_rwf IS NULL OR total_due_rwf >= principal_rwf",
            name="loan_total_due_check",
        ),
        sa.CheckConstraint(
            "decided_by_membership_id IS NULL OR "
            "decided_by_membership_id <> membership_id",
            name="loan_no_self_approval",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["decided_by_membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("loans_group_status", "loans", ["group_id", "status"])
    op.create_index("loans_member_status", "loans", ["membership_id", "status"])

    # --- loan_schedule_items ---------------------------------------------
    op.create_table(
        "loan_schedule_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("loan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("installment_no", sa.SmallInteger(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("principal_rwf", sa.BigInteger(), nullable=False),
        sa.Column("interest_rwf", sa.BigInteger(), nullable=False),
        sa.Column("total_rwf", sa.BigInteger(), nullable=False),
        sa.Column("paid_rwf", sa.BigInteger(), nullable=False, server_default="0"),
        sa.CheckConstraint(
            "installment_no >= 1", name="schedule_installment_positive"
        ),
        sa.CheckConstraint(
            "total_rwf = principal_rwf + interest_rwf", name="schedule_sum_check"
        ),
        sa.CheckConstraint(
            "paid_rwf >= 0 AND paid_rwf <= total_rwf", name="schedule_paid_range"
        ),
        sa.ForeignKeyConstraint(
            ["loan_id"], ["loans.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("loan_id", "installment_no", name="uq_loan_installment"),
    )
    op.create_index("schedule_due_date", "loan_schedule_items", ["due_date"])

    # --- repayments (immutable ledger) ----------------------------------
    op.create_table(
        "repayments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("loan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("membership_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=8), nullable=False),
        sa.Column("amount_rwf", sa.BigInteger(), nullable=False),
        sa.Column("principal_part_rwf", sa.BigInteger(), nullable=False),
        sa.Column("interest_part_rwf", sa.BigInteger(), nullable=False),
        sa.Column("reverses_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False),
        sa.Column("reference", sa.String(length=64), nullable=True),
        sa.Column("recorded_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "type IN ('payment','reversal')", name="repayment_type_check"
        ),
        sa.CheckConstraint(
            "method IN ('cash','mtn_momo','airtel_money','bank')",
            name="repayment_method_check",
        ),
        sa.CheckConstraint(
            "(type = 'payment' AND amount_rwf > 0) OR "
            "(type = 'reversal' AND amount_rwf < 0)",
            name="repayment_sign_rule",
        ),
        sa.CheckConstraint(
            "amount_rwf = principal_part_rwf + interest_part_rwf",
            name="repayment_split_check",
        ),
        sa.CheckConstraint(
            "(type = 'payment' AND reverses_id IS NULL) OR "
            "(type = 'reversal' AND reverses_id IS NOT NULL)",
            name="repayment_reversal_link",
        ),
        sa.ForeignKeyConstraint(
            ["loan_id"], ["loans.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["membership_id"], ["memberships.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["reverses_id"], ["repayments.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("repayments_loan_paid", "repayments", ["loan_id", "paid_at"])
    op.create_index(
        "repayments_group_member", "repayments", ["group_id", "membership_id"]
    )
    op.create_index(
        "repayments_idempotency",
        "repayments",
        ["group_id", "idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )
    op.create_index(
        "repayments_unique_reversal",
        "repayments",
        ["reverses_id"],
        unique=True,
        postgresql_where=sa.text("reverses_id IS NOT NULL"),
    )

    # --- otp_challenges --------------------------------------------------
    op.create_table(
        "otp_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("phone", sa.String(length=13), nullable=False),
        sa.Column("purpose", sa.String(length=24), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("code_hmac", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("request_ip", postgresql.INET(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "purpose IN ('verify_phone','reset_password','change_phone',"
            "'verify_email','login_2fa')",
            name="otp_purpose_check",
        ),
        sa.CheckConstraint(
            "attempts >= 0 AND attempts <= 5", name="otp_attempts_check"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "otp_phone_purpose_created",
        "otp_challenges",
        ["phone", "purpose", sa.text("created_at DESC")],
    )
    op.create_index("otp_expires_at", "otp_challenges", ["expires_at"])

    # --- email_verification_tokens ---------------------------------------
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_email_token_hash"),
    )
    op.create_index("email_token_hash", "email_verification_tokens", ["token_hash"], unique=True)

    # --- refresh_tokens --------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_token_hash"),
    )
    op.create_index("refresh_token_hash", "refresh_tokens", ["token_hash"], unique=True)
    op.create_index("refresh_user_id", "refresh_tokens", ["user_id"])
    op.create_index("refresh_family_id", "refresh_tokens", ["family_id"])
    op.create_index("refresh_expires_at", "refresh_tokens", ["expires_at"])

    # --- audit_logs ------------------------------------------------------
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("before_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("audit_group_created", "audit_logs", ["group_id", sa.text("created_at DESC")])
    op.create_index("audit_actor_created", "audit_logs", ["actor_user_id", sa.text("created_at DESC")])
    op.create_index("audit_entity", "audit_logs", ["entity_type", "entity_id"])

    # --- idempotency_keys ------------------------------------------------
    op.create_table(
        "idempotency_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("status_code", sa.SmallInteger(), nullable=True),
        sa.Column(
            "response_body", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "key", name="uq_idempotency_user_key"),
    )
    op.create_index("idempotency_created", "idempotency_keys", ["created_at"])

    # --- outbox_messages -------------------------------------------------
    op.create_table(
        "outbox_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=uuid7),
        sa.Column("channel", sa.String(length=8), nullable=False),
        sa.Column("recipient", sa.String(length=254), nullable=False),
        sa.Column("template", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status", sa.String(length=8), nullable=False, server_default="pending"
        ),
        sa.Column("attempts", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column(
            "next_attempt_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("provider_message_id", sa.String(length=64), nullable=True),
        sa.Column("last_error", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "channel IN ('sms','email')", name="outbox_channel_check"
        ),
        sa.CheckConstraint(
            "status IN ('pending','sent','failed','dead')",
            name="outbox_status_check",
        ),
        sa.CheckConstraint("attempts >= 0", name="outbox_attempts_check"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "outbox_due",
        "outbox_messages",
        ["next_attempt_at"],
        postgresql_where=sa.text("status IN ('pending','failed')"),
    )

    # --- immutable ledger triggers ---------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_ledger_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'Ledger rows are immutable. Use a reversal entry instead.';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in ("contributions", "repayments", "audit_logs"):
        op.execute(
            f"""
            CREATE TRIGGER {table}_immutable
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION reject_ledger_mutation();
            """
        )

    # --- ledger reconciliation helper ------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION recalc_group_pot(p_group_id uuid)
        RETURNS bigint AS $$
        DECLARE
            v_contributed bigint;
            v_lent bigint;
        BEGIN
            SELECT COALESCE(SUM(amount_rwf), 0) INTO v_contributed
            FROM contributions
            WHERE group_id = p_group_id AND type = 'payment';

            SELECT COALESCE(SUM(principal_rwf), 0) INTO v_lent
            FROM loans
            WHERE group_id = p_group_id
              AND status IN ('approved','disbursed','overdue');

            RETURN GREATEST(v_contributed - v_lent, 0);
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    for table in ("contributions", "repayments", "audit_logs"):
        op.execute(f"DROP TRIGGER IF EXISTS {table}_immutable ON {table}")
    op.execute("DROP FUNCTION IF EXISTS reject_ledger_mutation()")
    op.execute("DROP FUNCTION IF EXISTS recalc_group_pot(uuid)")
    op.drop_table("outbox_messages")
    op.drop_table("idempotency_keys")
    op.drop_table("audit_logs")
    op.drop_table("refresh_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_table("otp_challenges")
    op.drop_table("repayments")
    op.drop_table("loan_schedule_items")
    op.drop_table("loans")
    op.drop_table("contribution_disputes")
    op.drop_table("contributions")
    op.drop_table("memberships")
    op.drop_table("group_rule_versions")
    op.drop_table("groups")
    op.drop_table("users")
