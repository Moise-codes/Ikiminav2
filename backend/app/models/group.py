"""Group and membership tables.

Roles live on the membership, not on the user, so one person can be president
of one group and an ordinary member of another.
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
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid7

ROLES = ("president", "treasurer", "member")
MEMBERSHIP_STATUSES = ("invited", "active", "suspended", "left")
FREQUENCIES = ("weekly", "biweekly", "monthly")
GROUP_STATUSES = ("active", "suspended", "closed")


class Group(TimestampMixin, Base):
    __tablename__ = "groups"
    __table_args__ = (
        CheckConstraint(
            "frequency IN ('weekly','biweekly','monthly')", name="groups_frequency_check"
        ),
        CheckConstraint(
            "status IN ('active','suspended','closed')", name="groups_status_check"
        ),
        CheckConstraint(
            "default_contribution_rwf >= 100 AND default_contribution_rwf <= 100000000",
            name="groups_contribution_range",
        ),
        CheckConstraint(
            "loan_interest_bp >= 0 AND loan_interest_bp <= 5000",
            name="groups_interest_range",
        ),
        CheckConstraint(
            "contribution_day >= 0 AND contribution_day <= 28",
            name="groups_contribution_day_range",
        ),
        CheckConstraint("rules_version >= 1", name="groups_rules_version_check"),
        Index("groups_created_by", "created_by"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    district: Mapped[str | None] = mapped_column(String(50))
    sector: Mapped[str | None] = mapped_column(String(50))
    default_contribution_rwf: Mapped[int] = mapped_column(nullable=False)
    frequency: Mapped[str] = mapped_column(String(8), nullable=False)
    contribution_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    loan_interest_bp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    max_loan_multiple: Mapped[int | None] = mapped_column(SmallInteger)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="active")
    rules_version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class GroupRuleVersion(Base):
    """Snapshot of a group's rules.

    Keeping the history means a rule change only affects future periods:
    a contribution recorded in March is still judged against the March rules.
    """

    __tablename__ = "group_rule_versions"
    __table_args__ = (
        UniqueConstraint("group_id", "version", name="uq_group_rule_version"),
        Index("group_rule_versions_group", "group_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    default_contribution_rwf: Mapped[int] = mapped_column(nullable=False)
    frequency: Mapped[str] = mapped_column(String(8), nullable=False)
    contribution_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    loan_interest_bp: Mapped[int] = mapped_column(Integer, nullable=False)
    max_loan_multiple: Mapped[int | None] = mapped_column(SmallInteger)
    effective_from_period: Mapped[str] = mapped_column(String(8), nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Membership(TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        CheckConstraint("role IN ('president','treasurer','member')", name="membership_role_check"),
        CheckConstraint(
            "status IN ('invited','active','suspended','left')",
            name="membership_status_check",
        ),
        CheckConstraint(
            "user_id IS NOT NULL OR invited_phone IS NOT NULL",
            name="membership_has_identity",
        ),
        CheckConstraint(
            "invited_phone IS NULL OR invited_phone ~ '^\\+250(72|73|78|79)[0-9]{7}$'",
            name="membership_invited_phone_format",
        ),
        # One live membership per user per group.
        Index(
            "memberships_unique_user_group",
            "group_id",
            "user_id",
            unique=True,
            postgresql_where="status <> 'left' AND user_id IS NOT NULL",
        ),
        # One pending invitation per phone per group.
        Index(
            "memberships_unique_invite",
            "group_id",
            "invited_phone",
            unique=True,
            postgresql_where="status = 'invited'",
        ),
        # Exactly one active president.
        Index(
            "memberships_one_president",
            "group_id",
            unique=True,
            postgresql_where="role = 'president' AND status = 'active'",
        ),
        # At most one active treasurer.
        Index(
            "memberships_one_treasurer",
            "group_id",
            unique=True,
            postgresql_where="role = 'treasurer' AND status = 'active'",
        ),
        Index("memberships_user_status", "user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    invited_phone: Mapped[str | None] = mapped_column(String(13))
    role: Mapped[str] = mapped_column(String(16), nullable=False, server_default="member")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="invited"
    )
    suggested_contribution_rwf: Mapped[int | None] = mapped_column()
    joined_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    left_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    added_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


# ---------------------------------------------------------------------------
# Pot distribution (year-end / cycle-end)
# ---------------------------------------------------------------------------

class PotDistribution(Base):
    """Records a year-end or cycle-end distribution of the group pot.

    When a group closes a savings cycle, the president records the total
    amount being distributed and whether it is split equally or
    proportionally. Individual shares are stored in ``DistributionShare``.

    This table is append-only — distributions are never deleted or edited.
    """

    __tablename__ = "pot_distributions"
    __table_args__ = (
        CheckConstraint("total_amount_rwf > 0", name="distribution_amount_positive"),
        Index("distributions_group_period", "group_id", "period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="RESTRICT"), nullable=False
    )
    period: Mapped[str] = mapped_column(String(8), nullable=False)
    total_amount_rwf: Mapped[int] = mapped_column(nullable=False)
    equal_shares: Mapped[bool] = mapped_column(nullable=False, server_default="false")
    notes: Mapped[str | None] = mapped_column(String(500))
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class DistributionShare(Base):
    """One member's share in a pot distribution.

    Rows are created by the service when a distribution is recorded and
    are never modified afterward.
    """

    __tablename__ = "distribution_shares"
    __table_args__ = (
        CheckConstraint("amount_rwf > 0", name="share_amount_positive"),
        UniqueConstraint("distribution_id", "membership_id", name="uq_share_per_member"),
        Index("shares_distribution", "distribution_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    distribution_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pot_distributions.id", ondelete="CASCADE"), nullable=False
    )
    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="RESTRICT"), nullable=False
    )
    amount_rwf: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
