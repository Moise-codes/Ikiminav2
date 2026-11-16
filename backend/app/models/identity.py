"""Identity tables: users, phone/email challenges, refresh tokens.

Phone is the primary identifier. Email is an optional, secondary contact that
must be verified before it can be used for anything sensitive.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import (
    Boolean,
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
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid7

#: Rwandan mobile numbers are exactly +250 followed by 9 digits whose operator
#: prefix is 72/73 (Airtel) or 78/79 (MTN).
PHONE_CHECK = "phone ~ '^\\+250(72|73|78|79)[0-9]{7}$'"

USER_STATUSES = ("active", "locked", "deactivated", "anonymized")
OTP_PURPOSES = (
    "verify_phone",
    "reset_password",
    "change_phone",
    "verify_email",
    "login_2fa",
)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(PHONE_CHECK, name="users_phone_format"),
        CheckConstraint(
            "status IN ('active','locked','deactivated','anonymized')",
            name="users_status_check",
        ),
        CheckConstraint(
            "preferred_language IN ('rw','en','fr')",
            name="users_language_check",
        ),
        CheckConstraint(
            "email IS NULL OR email = lower(email)", name="users_email_lowercase"
        ),
        CheckConstraint(
            "(status = 'anonymized') = (phone IS NULL AND email IS NULL)",
            name="users_anonymized_clears_pii",
        ),
        Index("users_phone_unique", "phone", unique=True),
        Index("users_email_unique", "email", unique=True, postgresql_where="email IS NOT NULL"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(13))
    phone_operator: Mapped[str | None] = mapped_column(String(12))
    phone_verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    email: Mapped[str | None] = mapped_column(String(254))
    email_verified_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    password_hash: Mapped[str | None] = mapped_column(Text)
    preferred_language: Mapped[str] = mapped_column(String(2), nullable=False, server_default="rw")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default="active"
    )
    is_platform_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    privacy_notice_version: Mapped[str] = mapped_column(String(16), nullable=False)
    privacy_accepted_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    failed_login_count: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default="0"
    )
    locked_until: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    anonymized_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @property
    def has_verified_phone(self) -> bool:
        return self.phone_verified_at is not None


class OtpChallenge(Base):
    """A one-time code sent over SMS.

    The code itself is never stored. We keep an HMAC so an attacker with a
    database dump still cannot brute-force 6 digits offline against a
    challenge row.
    """

    __tablename__ = "otp_challenges"
    __table_args__ = (
        CheckConstraint(
            "purpose IN ('verify_phone','reset_password','change_phone',"
            "'verify_email','login_2fa')",
            name="otp_purpose_check",
        ),
        CheckConstraint("attempts >= 0 AND attempts <= 5", name="otp_attempts_check"),
        Index("otp_phone_purpose_created", "phone", "purpose", created_at.desc()),
        Index("otp_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    phone: Mapped[str] = mapped_column(String(13), nullable=False)
    purpose: Mapped[str] = mapped_column(String(24), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    code_hmac: Mapped[str] = mapped_column(String(64), nullable=False)
    attempts: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, server_default="0"
    )
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    request_ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class EmailVerificationToken(Base):
    """Token emailed to confirm ownership of an email address."""

    __tablename__ = "email_verification_tokens"
    __table_args__ = (Index("email_token_hash", "token_hash", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class RefreshToken(Base):
    """Rotating refresh token.

    Tokens belong to a family (one login). Presenting a token that was already
    rotated is treated as theft: the entire family is revoked.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index("refresh_token_hash", "token_hash", unique=True),
        Index("refresh_user_id", "user_id"),
        Index("refresh_family_id", "family_id"),
        Index("refresh_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid7)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    family_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    used_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
