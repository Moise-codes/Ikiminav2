"""Auth service: registration, OTP, login, token rotation, identity changes.

This module owns every rule about who may hold an account and how a session
is established. The router layer only translates HTTP into calls here.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.email import InvalidEmail, normalize_email
from app.common.phone import InvalidPhoneNumber, normalize_phone
from app.core.config import settings
from app.core.errors import (
    AccountLockedError,
    AuthenticationError,
    ConflictError,
    DuplicateEmailError,
    DuplicatePhoneError,
    InvalidCredentialsError,
    InvalidEmailError,
    PermissionDeniedError,
    PhoneNotVerifiedError,
    SmsBudgetExceededError,
    TooManyAttemptsError,
    TokenReuseDetectedError,
    ValidationError,
    WeakPasswordError,
)
from app.core.security import (
    generate_email_token,
    generate_family_id,
    generate_otp,
    generate_refresh_token,
    hash_password,
    hash_token,
    hmac_otp,
    needs_rehash,
    validate_password_strength,
    verify_otp_hmac,
    verify_password,
)
from app.models.identity import (
    EmailVerificationToken,
    OtpChallenge,
    RefreshToken,
    User,
)


def _now() -> dt.datetime:
    """Current UTC time. All timestamps are timezone-aware."""
    return dt.datetime.now(dt.timezone.utc)


class AuthService:
    """Business rules for identity and sessions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # registration
    # ------------------------------------------------------------------
    async def register(
        self,
        *,
        full_name: str,
        phone_raw: str,
        password: str,
        email_raw: str | None,
        preferred_language: str,
        ip: str | None = None,
    ) -> tuple[User, str]:
        """Create an unverified account and return it with the OTP to send.

        The phone number is normalized before anything else touches it, so
        ``0788123456`` and ``+250788123456`` can never create two accounts.
        """
        phone = self._normalize_phone(phone_raw)
        email = self._normalize_email(email_raw) if email_raw else None

        validate_password_strength(password, phone=phone.e164)

        existing = await self._user_by_phone(phone.e164)
        if existing is not None:
            raise DuplicatePhoneError()
        if email:
            clash = await self._user_by_email(email)
            if clash is not None:
                raise DuplicateEmailError()

        code = generate_otp()
        user = User(
            full_name=full_name,
            phone=phone.e164,
            phone_operator=phone.operator,
            password_hash=hash_password(password),
            email=email,
            preferred_language=preferred_language,
            status="active",
            privacy_notice_version=settings.privacy_notice_version,
            privacy_accepted_at=_now(),
        )
        self.db.add(user)
        try:
            await self.db.flush()
        except IntegrityError as exc:
            await self.db.rollback()
            # The unique index is the authority; the pre-check above only
            # produces a nicer error message.
            raise DuplicatePhoneError() from exc

        challenge = self._create_challenge(
            phone=phone.e164,
            purpose="verify_phone",
            user_id=user.id,
            ip=ip,
            code=code,
        )
        self.db.add(challenge)
        await self.db.flush()
        return user, code

    # ------------------------------------------------------------------
    # OTP verification
    # ------------------------------------------------------------------
    async def verify_phone(
        self, *, phone_raw: str, code: str, ip: str | None = None
    ) -> User:
        """Verify an OTP and activate the account."""
        phone = self._normalize_phone(phone_raw)
        user = await self._user_by_phone(phone.e164)
        if user is None:
            raise ValidationError(
                "No account is pending verification for this number.",
                code="NO_PENDING_VERIFICATION",
            )

        challenge = await self._active_challenge(
            phone=phone.e164, purpose="verify_phone"
        )
        if challenge is None:
            raise ValidationError(
                "The code has expired or was already used. Request a new one.",
                code="OTP_INVALID",
            )
        if challenge.attempts >= settings.otp_max_attempts:
            raise TooManyAttemptsError(
                "Too many incorrect codes. Request a new one."
            )

        if not verify_otp_hmac(code, phone.e164, challenge.code_hmac):
            challenge.attempts += 1
            await self.db.flush()
            if challenge.attempts >= settings.otp_max_attempts:
                raise TooManyAttemptsError(
                    "Too many incorrect codes. Request a new one."
                )
            raise ValidationError("The code is incorrect.", code="OTP_INVALID")

        challenge.consumed_at = _now()
        user.phone_verified_at = _now()
        await self.db.flush()
        return user

    async def resend_otp(
        self, *, phone_raw: str, purpose: str, ip: str | None = None
    ) -> str:
        """Issue a fresh OTP, enforcing the per-phone daily budget."""
        phone = self._normalize_phone(phone_raw)
        await self._enforce_otp_budget(phone.e164)

        user = await self._user_by_phone(phone.e164)
        code = generate_otp()
        await self.db.execute(
            update(OtpChallenge)
            .where(
                OtpChallenge.phone == phone.e164,
                OtpChallenge.purpose == purpose,
                OtpChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=_now())
        )
        self.db.add(
            self._create_challenge(
                phone=phone.e164,
                purpose=purpose,
                user_id=user.id if user else None,
                ip=ip,
                code=code,
            )
        )
        await self.db.flush()
        return code

    # ------------------------------------------------------------------
    # login
    # ------------------------------------------------------------------
    async def authenticate(self, *, phone_raw: str, password: str) -> User:
        """Verify credentials. Raises a generic error on any failure."""
        phone = self._normalize_phone(phone_raw)
        user = await self._user_by_phone(phone.e164)

        # Spend the same time whether or not the account exists, so the
        # response time does not reveal which phone numbers are registered.
        if user is None:
            verify_password(
                "$argon2id$v=19$m=65536,t=3,p=4$"
                "c29tZXNhbHRzb21lc2FsdA$0000000000000000000000000000000",
                password,
            )
            raise InvalidCredentialsError()

        if user.locked_until and user.locked_until > _now():
            raise AccountLockedError(
                details={"locked_until": user.locked_until.isoformat()}
            )
        if user.status == "anonymized":
            raise InvalidCredentialsError()
        if user.status == "deactivated":
            raise PermissionDeniedError(
                "This account has been deactivated.", code="ACCOUNT_DEACTIVATED"
            )

        if not user.password_hash or not verify_password(user.password_hash, password):
            user.failed_login_count += 1
            if user.failed_login_count >= settings.max_failed_logins:
                user.locked_until = _now() + dt.timedelta(minutes=settings.lockout_minutes)
                user.failed_login_count = 0
                user.status = "locked"
            await self.db.flush()
            raise InvalidCredentialsError()

        if not user.phone_verified_at:
            raise PhoneNotVerifiedError()

        user.failed_login_count = 0
        user.locked_until = None
        if user.status == "locked":
            user.status = "active"
        user.last_login_at = _now()

        # Upgrade the hash if the cost parameters have moved on.
        if user.password_hash and needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)

        await self.db.flush()
        return user

    async def issue_tokens(
        self,
        *,
        user: User,
        user_agent: str | None = None,
        ip: str | None = None,
        family_id: uuid.UUID | None = None,
    ) -> tuple[str, str, dt.datetime, dt.datetime]:
        """Create an access token and a refresh token.

        Returns the access token, the refresh token, the access expiry and
        the refresh expiry.
        """
        from app.core.security import create_access_token  # local import avoids a cycle

        family = family_id or generate_family_id()
        refresh_token = generate_refresh_token()
        refresh_expires_at = _now() + dt.timedelta(days=settings.refresh_token_ttl_days)

        self.db.add(
            RefreshToken(
                user_id=user.id,
                family_id=family,
                token_hash=hash_token(refresh_token),
                expires_at=refresh_expires_at,
                user_agent=(user_agent or "")[:255] or None,
                ip=ip,
            )
        )
        await self.db.flush()

        access_token, access_expires_at = create_access_token(
            user_id=user.id, session_id=family
        )
        return access_token, refresh_token, access_expires_at, refresh_expires_at

    async def rotate_refresh_token(
        self, *, refresh_token: str, user_agent: str | None, ip: str | None
    ) -> tuple[User, str, str, dt.datetime, dt.datetime]:
        """Rotate a refresh token, detecting reuse of a spent token."""
        token_hash = hash_token(refresh_token)
        record = await self.db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        if record is None:
            raise AuthenticationError("The session is not valid.")

        now = _now()
        if record.revoked_at is not None:
            raise TokenReuseDetectedError()
        if record.expires_at <= now:
            raise AuthenticationError("The session has expired. Please sign in again.")

        if record.used_at is not None:
            # This token was already exchanged. That means either a replay
            # attack or a stolen token, so the whole family dies.
            await self._revoke_family(record.family_id)
            raise TokenReuseDetectedError()

        user = await self.db.get(User, record.user_id)
        if user is None or user.status != "active":
            raise AuthenticationError("The session is not valid.")

        record.used_at = now
        await self.db.flush()

        access, new_refresh, access_exp, refresh_exp = await self.issue_tokens(
            user=user, user_agent=user_agent, ip=ip, family_id=record.family_id
        )
        return user, access, new_refresh, access_exp, refresh_exp

    async def logout(
        self, *, refresh_token: str | None, user: User, all_sessions: bool
    ) -> int:
        """Revoke one session or every session. Returns sessions revoked."""
        if all_sessions:
            result = await self.db.execute(
                update(RefreshToken)
                .where(
                    RefreshToken.user_id == user.id,
                    RefreshToken.revoked_at.is_(None),
                )
                .values(revoked_at=_now())
            )
            return result.rowcount or 0

        if not refresh_token:
            raise ValidationError("Provide a refresh token or set all_sessions.")
        record = await self.db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(refresh_token),
                RefreshToken.user_id == user.id,
            )
        )
        if record is None or record.revoked_at is not None:
            return 0
        record.revoked_at = _now()
        await self.db.flush()
        return 1

    async def list_sessions(self, *, user: User) -> list[RefreshToken]:
        """Active sessions for the account."""
        result = await self.db.scalars(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > _now(),
            )
            .order_by(RefreshToken.created_at.desc())
        )
        return list(result)

    async def revoke_family(self, family_id: uuid.UUID) -> int:
        """Public wrapper used by the dependency layer."""
        return await self._revoke_family(family_id)

    # ------------------------------------------------------------------
    # password reset
    # ------------------------------------------------------------------
    async def request_password_reset(self, *, phone_raw: str, ip: str | None) -> str:
        """Start a reset. Returns the OTP to send, or an empty string when
        the phone is unknown (the caller responds identically either way)."""
        phone = self._normalize_phone(phone_raw)
        user = await self._user_by_phone(phone.e164)
        if user is None:
            return ""
        await self._enforce_otp_budget(phone.e164)
        await self.db.execute(
            update(OtpChallenge)
            .where(
                OtpChallenge.phone == phone.e164,
                OtpChallenge.purpose == "reset_password",
                OtpChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=_now())
        )
        code = generate_otp()
        self.db.add(
            self._create_challenge(
                phone=phone.e164,
                purpose="reset_password",
                user_id=user.id,
                ip=ip,
                code=code,
            )
        )
        await self.db.flush()
        return code

    async def confirm_password_reset(
        self, *, phone_raw: str, code: str, new_password: str
    ) -> User:
        """Finish a reset and revoke every session."""
        phone = self._normalize_phone(phone_raw)
        user = await self._user_by_phone(phone.e164)
        if user is None:
            raise ValidationError("The reset request is not valid.", code="OTP_INVALID")

        challenge = await self._active_challenge(
            phone=phone.e164, purpose="reset_password"
        )
        if challenge is None:
            raise ValidationError("The code is not valid.", code="OTP_INVALID")
        if not verify_otp_hmac(code, phone.e164, challenge.code_hmac):
            challenge.attempts += 1
            await self.db.flush()
            raise ValidationError("The code is incorrect.", code="OTP_INVALID")

        validate_password_strength(new_password, phone=phone.e164)
        challenge.consumed_at = _now()
        user.password_hash = hash_password(new_password)
        user.failed_login_count = 0
        user.locked_until = None
        if user.status == "locked":
            user.status = "active"

        # A password reset must invalidate every existing session.
        await self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=_now())
        )
        await self.db.flush()
        return user

    # ------------------------------------------------------------------
    # phone change
    # ------------------------------------------------------------------
    async def request_phone_change(
        self, *, user: User, new_phone_raw: str, ip: str | None
    ) -> str:
        """Start moving the account to a new phone number."""
        new_phone = self._normalize_phone(new_phone_raw)
        if new_phone.e164 == user.phone:
            raise ConflictError(
                "That is already the phone number on this account.",
                code="PHONE_UNCHANGED",
            )
        clash = await self._user_by_phone(new_phone.e164)
        if clash is not None:
            raise DuplicatePhoneError()

        await self._enforce_otp_budget(new_phone.e164)
        await self.db.execute(
            update(OtpChallenge)
            .where(
                OtpChallenge.phone == new_phone.e164,
                OtpChallenge.purpose == "change_phone",
                OtpChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=_now())
        )
        code = generate_otp()
        self.db.add(
            self._create_challenge(
                phone=new_phone.e164,
                purpose="change_phone",
                user_id=user.id,
                ip=ip,
                code=code,
            )
        )
        await self.db.flush()
        return code

    async def confirm_phone_change(
        self, *, user: User, new_phone_raw: str, code: str
    ) -> User:
        """Complete a phone change. The new number becomes verified."""
        new_phone = self._normalize_phone(new_phone_raw)
        challenge = await self._active_challenge(
            phone=new_phone.e164, purpose="change_phone"
        )
        if challenge is None:
            raise ValidationError("The code is not valid.", code="OTP_INVALID")
        if not verify_otp_hmac(code, new_phone.e164, challenge.code_hmac):
            challenge.attempts += 1
            await self.db.flush()
            raise ValidationError("The code is incorrect.", code="OTP_INVALID")

        clash = await self._user_by_phone(new_phone.e164)
        if clash is not None and clash.id != user.id:
            raise DuplicatePhoneError()

        challenge.consumed_at = _now()
        user.phone = new_phone.e164
        user.phone_operator = new_phone.operator
        user.phone_verified_at = _now()
        await self.db.flush()
        return user

    # ------------------------------------------------------------------
    # email
    # ------------------------------------------------------------------
    async def add_email(self, *, user: User, email_raw: str) -> str:
        """Attach an email and return the verification token to email."""
        email = self._normalize_email(email_raw)
        clash = await self._user_by_email(email)
        if clash is not None and clash.id != user.id:
            raise DuplicateEmailError()

        user.email = email
        user.email_verified_at = None
        await self.db.flush()

        token = generate_email_token()
        self.db.add(
            EmailVerificationToken(
                user_id=user.id,
                email=email,
                token_hash=hash_token(token),
                expires_at=_now()
                + dt.timedelta(minutes=settings.email_token_ttl_minutes),
            )
        )
        await self.db.flush()
        return token

    async def verify_email(self, *, token: str) -> User:
        """Confirm an email address from the emailed token."""
        record = await self.db.scalar(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == hash_token(token)
            )
        )
        if record is None:
            raise ValidationError("The verification link is not valid.", code="EMAIL_TOKEN_INVALID")
        if record.consumed_at is not None:
            raise ValidationError("This link has already been used.", code="EMAIL_TOKEN_USED")
        if record.expires_at <= _now():
            raise ValidationError("This link has expired.", code="EMAIL_TOKEN_EXPIRED")

        user = await self.db.get(User, record.user_id)
        if user is None:
            raise ValidationError("The verification link is not valid.", code="EMAIL_TOKEN_INVALID")

        record.consumed_at = _now()
        user.email = record.email
        user.email_verified_at = _now()
        await self.db.flush()
        return user

    async def update_profile(
        self,
        *,
        user: User,
        full_name: str | None = None,
        preferred_language: str | None = None,
    ) -> User:
        """Update the mutable parts of a profile."""
        if full_name is not None:
            cleaned = " ".join(full_name.split())
            if not 2 <= len(cleaned) <= 100:
                raise ValidationError("Name must be between 2 and 100 characters.")
            user.full_name = cleaned
        if preferred_language is not None:
            user.preferred_language = preferred_language
        await self.db.flush()
        return user

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------
    @staticmethod
    def _normalize_phone(raw: str) -> Any:
        try:
            return normalize_phone(raw)
        except InvalidPhoneNumber as exc:
            raise ValidationError(
                f"The phone number is not valid ({exc.reason}).",
                code="INVALID_PHONE",
            ) from exc

    @staticmethod
    def _normalize_email(raw: str) -> str:
        try:
            return normalize_email(raw)
        except InvalidEmail as exc:
            raise InvalidEmailError(
                f"The email address is not valid ({exc.reason})."
            ) from exc

    async def _user_by_phone(self, phone: str) -> User | None:
        return await self.db.scalar(select(User).where(User.phone == phone))

    async def _user_by_email(self, email: str) -> User | None:
        return await self.db.scalar(select(User).where(User.email == email))

    def _create_challenge(
        self,
        *,
        phone: str,
        purpose: str,
        user_id: uuid.UUID | None,
        ip: str | None,
        code: str,
    ) -> OtpChallenge:
        """Build an OTP challenge row for a freshly generated code.

        The code itself is never persisted; only its HMAC is.
        """
        return OtpChallenge(
            phone=phone,
            purpose=purpose,
            user_id=user_id,
            code_hmac=hmac_otp(code, phone),
            expires_at=_now() + dt.timedelta(minutes=settings.otp_ttl_minutes),
            request_ip=ip,
        )

    async def _active_challenge(
        self, *, phone: str, purpose: str
    ) -> OtpChallenge | None:
        return await self.db.scalar(
            select(OtpChallenge)
            .where(
                OtpChallenge.phone == phone,
                OtpChallenge.purpose == purpose,
                OtpChallenge.consumed_at.is_(None),
                OtpChallenge.expires_at > _now(),
            )
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
        )

    async def _enforce_otp_budget(self, phone: str) -> None:
        """Cap how many codes a single phone number can request."""
        since = _now() - dt.timedelta(hours=24)
        count = await self.db.scalar(
            select(func.count())
            .select_from(OtpChallenge)
            .where(OtpChallenge.phone == phone, OtpChallenge.created_at >= since)
        )
        if (count or 0) >= settings.otp_daily_cap_per_phone:
            raise SmsBudgetExceededError()

    async def _revoke_family(self, family_id: uuid.UUID) -> int:
        result = await self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.family_id == family_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=_now())
        )
        await self.db.flush()
        return result.rowcount or 0
