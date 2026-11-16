"""Domain errors and the single error envelope.

Every failure the API can produce is expressed as a domain exception with a
stable machine-readable code. One exception handler renders all of them, so
the error shape never varies by endpoint.
"""

from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for every error the API deliberately returns."""

    code: str = "INTERNAL_ERROR"
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        """Render the error body."""
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


# --- 400 ---------------------------------------------------------------
class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    status_code = 400
    message = "The request payload is invalid."


class InvalidPhoneError(ValidationError):
    code = "INVALID_PHONE"
    message = "The phone number is not a valid Rwandan mobile number."


class InvalidEmailError(ValidationError):
    code = "INVALID_EMAIL"
    message = "The email address is not valid."


class WeakPasswordError(AppError):
    code = "WEAK_PASSWORD"
    status_code = 400
    message = "The password does not meet the minimum requirements."


# --- 401 ---------------------------------------------------------------
class AuthenticationError(AppError):
    code = "UNAUTHENTICATED"
    status_code = 401
    message = "Authentication is required."


class InvalidCredentialsError(AuthenticationError):
    code = "INVALID_CREDENTIALS"
    message = "Phone number or password is incorrect."


class TokenExpiredError(AuthenticationError):
    code = "TOKEN_EXPIRED"
    message = "The token has expired."


class TokenReuseDetectedError(AuthenticationError):
    code = "TOKEN_REUSE_DETECTED"
    message = "This session has been revoked. Please sign in again."


# --- 403 ---------------------------------------------------------------
class PermissionDeniedError(AppError):
    code = "PERMISSION_DENIED"
    status_code = 403
    message = "You do not have permission to perform this action."


class PhoneNotVerifiedError(PermissionDeniedError):
    code = "PHONE_NOT_VERIFIED"
    message = "Your phone number must be verified before you can continue."


class EmailNotVerifiedError(PermissionDeniedError):
    code = "EMAIL_NOT_VERIFIED"
    message = "Your email address must be verified before you can continue."


class AccountLockedError(PermissionDeniedError):
    code = "ACCOUNT_LOCKED"
    status_code = 423
    message = "This account is temporarily locked. Try again later."


# --- 404 ---------------------------------------------------------------
class NotFoundError(AppError):
    code = "NOT_FOUND"
    status_code = 404
    message = "The requested resource does not exist."


# --- 409 ---------------------------------------------------------------
class ConflictError(AppError):
    code = "CONFLICT"
    status_code = 409
    message = "The request conflicts with the current state of the resource."


class DuplicatePhoneError(ConflictError):
    code = "PHONE_ALREADY_REGISTERED"
    message = "An account already exists for this phone number."


class DuplicateEmailError(ConflictError):
    code = "EMAIL_ALREADY_REGISTERED"
    message = "An account already exists for this email address."


class IdempotencyConflictError(ConflictError):
    code = "IDEMPOTENCY_KEY_REUSED"
    message = "This idempotency key was already used with a different payload."


class BusinessRuleViolation(AppError):
    code = "BUSINESS_RULE_VIOLATION"
    status_code = 409
    message = "The request violates a business rule."


# --- 422 ---------------------------------------------------------------
class UnprocessableError(AppError):
    code = "UNPROCESSABLE"
    status_code = 422
    message = "The request was understood but could not be processed."


# --- 429 ---------------------------------------------------------------
class RateLimitExceededError(AppError):
    code = "RATE_LIMIT_EXCEEDED"
    status_code = 429
    message = "Too many requests. Please slow down."


class TooManyAttemptsError(AppError):
    code = "TOO_MANY_ATTEMPTS"
    status_code = 429
    message = "Too many attempts. Please request a new code."


class SmsBudgetExceededError(AppError):
    code = "SMS_BUDGET_EXCEEDED"
    status_code = 429
    message = "Too many verification codes have been requested for this number."
