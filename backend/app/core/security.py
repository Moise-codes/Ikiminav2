"""Cryptographic primitives: password hashing, token hashing, OTP HMAC."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher(
    time_cost=settings.argon2_time_cost,
    memory_cost=settings.argon2_memory_cost,
    parallelism=settings.argon2_parallelism,
)

#: Passwords that are never allowed, regardless of length.
COMMON_PASSWORDS: frozenset[str] = frozenset(
    {
        "password",
        "password1",
        "password123",
        "12345678",
        "123456789",
        "qwertyui",
        "qwerty123",
        "iloveyou",
        "admin123",
        "welcome1",
        "letmein1",
        "monkey123",
        "abc12345",
        "passw0rd",
        "ikimina1",
        "ikimina123",
        "qwertyuiop",
        "00000000",
        "11111111",
        "12312312",
    }
)


class WeakPasswordError(ValueError):
    """Raised when a password fails the strength rules."""


def hash_password(password: str) -> str:
    """Hash a password with argon2id."""
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify a password against an argon2 hash. Never raises."""
    try:
        _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return True


def needs_rehash(password_hash: str) -> bool:
    """True when the stored hash uses outdated parameters."""
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def validate_password_strength(password: str, *, phone: str | None = None) -> None:
    """Enforce the password rules from the SRS.

    Rules: 8 to 128 characters, not the phone number, not a common password.
    """
    if len(password) < settings.password_min_length:
        raise WeakPasswordError(
            f"password must be at least {settings.password_min_length} characters"
        )
    if len(password) > 128:
        raise WeakPasswordError("password must be at most 128 characters")
    if password.lower() in COMMON_PASSWORDS:
        raise WeakPasswordError("password is too common")
    if phone:
        digits = "".join(ch for ch in phone if ch.isdigit())
        if digits and len(digits) >= 6 and digits in password.replace(" ", ""):
            raise WeakPasswordError("password must not contain your phone number")


def hash_token(token: str) -> str:
    """Hash a refresh or email token for storage.

    SHA-256 is appropriate here (unlike for passwords) because these tokens
    are high-entropy random values, not user-chosen secrets.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hmac_otp(code: str, phone: str) -> str:
    """HMAC an OTP against a server secret and the target phone.

    Binding the HMAC to the phone means a code captured for one number
    cannot be replayed against another, and a database leak does not allow
    offline brute force of the 6-digit space.
    """
    message = f"{phone}:{code}".encode("utf-8")
    return hmac.new(
        settings.otp_hmac_secret.encode("utf-8"), message, hashlib.sha256
    ).hexdigest()


def verify_otp_hmac(code: str, phone: str, expected_hmac: str) -> bool:
    """Constant-time comparison of an OTP against its stored HMAC."""
    return hmac.compare_digest(hmac_otp(code, phone), expected_hmac)


def generate_otp() -> str:
    """Generate a 6-digit OTP using a cryptographically secure source."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_refresh_token() -> str:
    """Generate an opaque refresh token."""
    return secrets.token_urlsafe(48)


def generate_email_token() -> str:
    """Generate an opaque email verification token."""
    return secrets.token_urlsafe(32)


def generate_family_id() -> uuid.UUID:
    """Identifier shared by every token in one login family."""
    return uuid.uuid4()


def create_access_token(
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    extra: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    """Create a signed access token. Returns the token and its expiry."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_ttl_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "sid": str(session_id),
        "typ": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": secrets.token_urlsafe(12),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify an access token.

    Raises :class:`jwt.PyJWTError` on any problem; callers translate that
    into a 401 without leaking why.
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
