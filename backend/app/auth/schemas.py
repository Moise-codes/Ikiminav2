"""Request and response schemas for the auth feature."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.common.phone import InvalidPhoneNumber, normalize_phone


def _normalize(value: str) -> str:
    """Normalize a phone field to E.164 or raise a validation error."""
    try:
        return normalize_phone(value).e164
    except InvalidPhoneNumber as exc:
        raise ValueError(f"invalid phone: {exc.reason}") from exc


class RegisterRequest(BaseModel):
    """Registration payload.

    Phone is the sole identity required. Email is intentionally removed
    from registration — our users are Rwandan mobile users who identify by
    phone number only. Email can be added later from account settings as
    an optional recovery channel.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    preferred_language: str = Field(default="rw", pattern="^(rw|en|fr)$")

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)

    @field_validator("full_name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not 2 <= len(cleaned) <= 100:
            raise ValueError("name must be between 2 and 100 characters")
        allowed = set(
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ''-."
        )
        if not set(cleaned) <= allowed:
            raise ValueError("name contains unsupported characters")
        return cleaned


class VerifyPhoneRequest(BaseModel):
    """Submit the OTP that was sent to the phone number."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class ResendOtpRequest(BaseModel):
    """Ask for another code to be sent."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    purpose: str = Field(default="verify_phone", pattern="^(verify_phone|login_2fa)$")

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class LoginRequest(BaseModel):
    """Sign in with phone number and password."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class RefreshRequest(BaseModel):
    """Exchange a refresh token for a new access token."""

    refresh_token: str = Field(min_length=20, max_length=512)


class LogoutRequest(BaseModel):
    """Revoke the current session or every session."""

    refresh_token: str | None = Field(default=None, max_length=512)
    all_sessions: bool = False


class PasswordResetRequest(BaseModel):
    """Start a password reset via SMS OTP."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class PasswordResetConfirm(BaseModel):
    """Complete a password reset with the OTP."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class ChangePhoneRequest(BaseModel):
    """Ask to move the account to a new phone number."""

    model_config = ConfigDict(str_strip_whitespace=True)

    new_phone: str

    @field_validator("new_phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class ChangePhoneConfirm(BaseModel):
    """Confirm a phone change with the code sent to the new number."""

    model_config = ConfigDict(str_strip_whitespace=True)

    new_phone: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

    @field_validator("new_phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize(value)


class AddEmailRequest(BaseModel):
    """Attach an email address to the account (optional, settings only).

    Email is for account recovery and optional report delivery. It is
    never required for login or for using any app feature.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(max_length=254)


class VerifyEmailRequest(BaseModel):
    """Confirm an email address with the token from the verification link."""

    token: str = Field(min_length=10, max_length=512)


class UpdateProfileRequest(BaseModel):
    """Update the mutable parts of the caller's own profile."""

    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    preferred_language: str | None = Field(default=None, pattern="^(rw|en|fr)$")


class UserProfile(BaseModel):
    """The caller's own profile.

    ``phone_operator`` is either ``"mtn"`` or ``"airtel"`` and is used by
    the frontend to display the correct operator badge (MTN yellow / Airtel
    red) next to the phone number.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None
    # "mtn" | "airtel" | None — derived at registration from the phone prefix
    phone_operator: str | None
    phone_verified_at: dt.datetime | None
    email: str | None
    email_verified_at: dt.datetime | None
    preferred_language: str
    status: str
    is_platform_admin: bool
    privacy_notice_version: str
    privacy_accepted_at: dt.datetime
    created_at: dt.datetime
    updated_at: dt.datetime


class TokenPair(BaseModel):
    """Access and refresh token pair returned after a successful auth."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class AuthResponse(BaseModel):
    """Envelope for registration and verification responses.

    ``tokens`` is None after registration (phone not yet verified).
    It is populated after verify-phone and login.
    """

    user: UserProfile
    tokens: TokenPair | None = None
    message: str


class SessionInfo(BaseModel):
    """One active session, used on the 'active devices' settings screen."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_agent: str | None
    ip: str | None
    created_at: dt.datetime
    current: bool = False


class RegisterDeviceRequest(BaseModel):
    """Register a mobile device for push notifications.

    ``token`` is the FCM registration token (Android / web) or the APNS
    device token (iOS). It is replaced automatically when the OS rotates it.
    ``platform`` must be ``"android"``, ``"ios"``, or ``"web"``.
    ``app_version`` is optional but useful for debugging delivery failures.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    token: str = Field(min_length=10, max_length=512)
    platform: str = Field(pattern="^(android|ios|web)$")
    app_version: str | None = Field(default=None, max_length=32)


class DeviceResponse(BaseModel):
    """Registered device confirmation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    platform: str
    app_version: str | None
    is_active: bool
    created_at: dt.datetime
