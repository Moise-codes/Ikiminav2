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

    Phone is required and becomes the primary key of the account. Email is
    optional and secondary: it can be added later and must be verified
    before it is trusted.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    email: str | None = Field(default=None, max_length=254)
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
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '’-."
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
    """Start a password reset."""

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
    """Attach an email address to the account."""

    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(max_length=254)


class VerifyEmailRequest(BaseModel):
    """Confirm an email with the token from the link."""

    token: str = Field(min_length=10, max_length=512)


class UpdateProfileRequest(BaseModel):
    """Update the mutable parts of the caller's own profile."""

    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    preferred_language: str | None = Field(default=None, pattern="^(rw|en|fr)$")


class UserProfile(BaseModel):
    """The caller's own profile."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None
    phone_operator: str | None
    phone_verified_at: dt.datetime | None
    email: str | None
    email_verified_at: dt.datetime | None
    preferred_language: str
    status: str
    privacy_notice_version: str
    privacy_accepted_at: dt.datetime
    created_at: dt.datetime


class TokenPair(BaseModel):
    """Access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class AuthResponse(BaseModel):
    """Registration and verification responses."""

    user: UserProfile
    tokens: TokenPair | None = None
    message: str


class SessionInfo(BaseModel):
    """One active session, for the "where am I signed in" screen."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_agent: str | None
    ip: str | None
    created_at: dt.datetime
    current: bool = False
