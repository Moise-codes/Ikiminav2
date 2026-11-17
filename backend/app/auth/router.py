"""Auth routes.

Every endpoint under ``/auth`` is rate limited, and every response that
could reveal whether an account exists is deliberately generic.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.auth.schemas import (
    AddEmailRequest,
    AuthResponse,
    ChangePhoneConfirm,
    ChangePhoneRequest,
    DeviceResponse,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterDeviceRequest,
    RegisterRequest,
    ResendOtpRequest,
    SessionInfo,
    TokenPair,
    UpdateProfileRequest,
    UserProfile,
    VerifyEmailRequest,
    VerifyPhoneRequest,
)
from app.auth.service import AuthService
from app.common.envelope import success
from app.core.config import settings
from app.core.dependencies import CurrentUser, DbSession
from app.core.errors import ValidationError
from app.core.rate_limit import RateLimit, rate_limit
from app.notifications.service import NotificationService

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    """Best-effort client address.

    ``X-Forwarded-For`` is only trusted when the request came through a
    configured proxy, otherwise a client could spoof it and bypass the
    per-IP rate limits.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and settings.trusted_proxies:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register with a phone number",
)
@rate_limit("register", limit=5, window_seconds=3600)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: DbSession,
) -> AuthResponse:
    """Create an account using a Rwandan mobile number.

    Only full name, phone, and password are required. Email is not
    collected at registration — it can be added later from settings as an
    optional account-recovery channel.

    The account is created immediately but cannot be used until the phone
    number is verified with the SMS code.
    """
    service = AuthService(db)
    notifications = NotificationService(db)
    user, code = await service.register(
        full_name=payload.full_name,
        phone_raw=payload.phone,
        password=payload.password,
        preferred_language=payload.preferred_language,
        ip=_client_ip(request),
    )
    await notifications.enqueue_sms(
        to=user.phone or "",
        template="verify_phone",
        payload={"code": code},
    )
    await db.commit()
    return AuthResponse(
        user=UserProfile.model_validate(user),
        tokens=None,
        message="Account created. We sent a 6-digit code to your phone — enter it to activate your account.",
    )


@router.post(
    "/verify-phone",
    response_model=AuthResponse,
    summary="Verify the phone number with the SMS code",
)
@rate_limit("otp", limit=10, window_seconds=600)
async def verify_phone(
    payload: VerifyPhoneRequest,
    request: Request,
    db: DbSession,
) -> AuthResponse:
    """Confirm control of the phone number and receive tokens."""
    service = AuthService(db)
    user = await service.verify_phone(
        phone_raw=payload.phone,
        code=payload.code,
        ip=_client_ip(request),
    )
    access, refresh, access_exp, refresh_exp = await service.issue_tokens(
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    await db.commit()
    return AuthResponse(
        user=UserProfile.model_validate(user),
        tokens=TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.access_token_ttl_minutes * 60,
            refresh_expires_in=settings.refresh_token_ttl_days * 24 * 3600,
        ),
        message="Phone verified. Welcome to Itsinda — your Ibimina, digitized.",
    )


@router.post(
    "/resend-otp",
    summary="Send another verification code",
)
@rate_limit("otp", limit=5, window_seconds=600)
async def resend_otp(
    payload: ResendOtpRequest,
    request: Request,
    db: DbSession,
) -> dict:
    """Issue a fresh code. The response is identical either way."""
    service = AuthService(db)
    notifications = NotificationService(db)
    code = await service.resend_otp(
        phone_raw=payload.phone,
        purpose=payload.purpose,
        ip=_client_ip(request),
    )
    if code:
        await notifications.enqueue_sms(
            to=payload.phone, template=payload.purpose, payload={"code": code}
        )
    await db.commit()
    return success(
        {"message": "If the number is registered, a new code has been sent."}
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Sign in with phone number and password",
)
@rate_limit("login", limit=10, window_seconds=300)
async def login(
    payload: LoginRequest,
    request: Request,
    db: DbSession,
) -> AuthResponse:
    """Exchange credentials for a token pair."""
    service = AuthService(db)
    user = await service.authenticate(
        phone_raw=payload.phone, password=payload.password
    )
    access, refresh, access_exp, refresh_exp = await service.issue_tokens(
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    await db.commit()
    return AuthResponse(
        user=UserProfile.model_validate(user),
        tokens=TokenPair(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.access_token_ttl_minutes * 60,
            refresh_expires_in=settings.refresh_token_ttl_days * 24 * 3600,
        ),
        message="Signed in successfully.",
    )


@router.post("/refresh", response_model=TokenPair, summary="Rotate the access token")
@rate_limit("refresh", limit=60, window_seconds=300)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: DbSession,
) -> TokenPair:
    """Exchange a refresh token for a fresh pair.

    Presenting an already-rotated token revokes the entire session family.
    """
    service = AuthService(db)
    user, access, new_refresh, access_exp, refresh_exp = await service.rotate_refresh_token(
        refresh_token=payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip=_client_ip(request),
    )
    await db.commit()
    return TokenPair(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=settings.access_token_ttl_minutes * 60,
        refresh_expires_in=settings.refresh_token_ttl_days * 24 * 3600,
    )


@router.post("/logout", summary="Sign out of one or all sessions")
async def logout(
    payload: LogoutRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """Revoke the current session or every session for the account."""
    service = AuthService(db)
    revoked = await service.logout(
        refresh_token=payload.refresh_token, user=user, all_sessions=payload.all_sessions
    )
    await db.commit()
    return success({"revoked_sessions": revoked})


@router.get("/sessions", summary="List active sessions")
async def list_sessions(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """Show every device signed in to this account."""
    service = AuthService(db)
    sessions = await service.list_sessions(user=user)
    current_family = getattr(request.state, "session_id", None)
    payload = [
        SessionInfo(
            id=session.id,
            user_agent=session.user_agent,
            ip=session.ip,
            created_at=session.created_at,
            current=session.family_id == current_family,
        ).model_dump(mode="json")
        for session in sessions
    ]
    return success(payload)


@router.post(
    "/password/forgot",
    summary="Start a password reset",
)
@rate_limit("otp", limit=5, window_seconds=3600)
async def forgot_password(
    payload: PasswordResetRequest,
    request: Request,
    db: DbSession,
) -> dict:
    """Send a reset code. The response never reveals account existence."""
    service = AuthService(db)
    notifications = NotificationService(db)
    code = await service.request_password_reset(
        phone_raw=payload.phone, ip=_client_ip(request)
    )
    if code:
        await notifications.enqueue_sms(
            to=payload.phone, template="reset_password", payload={"code": code}
        )
    await db.commit()
    return success(
        {"message": "If the number is registered, a reset code has been sent."}
    )


@router.post("/password/reset", summary="Complete a password reset")
@rate_limit("otp", limit=10, window_seconds=600)
async def reset_password(
    payload: PasswordResetConfirm,
    db: DbSession,
) -> dict:
    """Set a new password and revoke every existing session."""
    service = AuthService(db)
    user = await service.confirm_password_reset(
        phone_raw=payload.phone,
        code=payload.code,
        new_password=payload.new_password,
    )
    await db.commit()
    return success({"message": "Password updated. Please sign in again."})


@router.post("/phone/change", summary="Start a phone number change")
@rate_limit("otp", limit=5, window_seconds=3600)
async def change_phone(
    payload: ChangePhoneRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """Send a code to the new number to confirm the move."""
    service = AuthService(db)
    notifications = NotificationService(db)
    code = await service.request_phone_change(
        user=user, new_phone_raw=payload.new_phone, ip=_client_ip(request)
    )
    await notifications.enqueue_sms(
        to=payload.new_phone, template="change_phone", payload={"code": code}
    )
    await db.commit()
    return success({"message": "A confirmation code was sent to the new number."})


@router.post("/phone/change/confirm", summary="Confirm a phone number change")
@rate_limit("otp", limit=10, window_seconds=600)
async def confirm_phone_change(
    payload: ChangePhoneConfirm,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """Move the account to the new number."""
    service = AuthService(db)
    updated = await service.confirm_phone_change(
        user=user, new_phone_raw=payload.new_phone, code=payload.code
    )
    await db.commit()
    return success({"user": UserProfile.model_validate(updated).model_dump(mode="json")})


@router.post("/email", summary="Add an email address")
async def add_email(
    payload: AddEmailRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> dict:
    """Attach an email address and send a verification link."""
    service = AuthService(db)
    notifications = NotificationService(db)
    token = await service.add_email(user=user, email_raw=payload.email)
    link = f"{settings.public_base_url}/verify-email?token={token}"
    await notifications.enqueue_email(
        to=payload.email.lower(),
        template="email_verification",
        payload={"link": link},
    )
    await db.commit()
    return success({"message": "Check your inbox to confirm the email address."})


@router.post("/email/verify", summary="Confirm an email address")
async def verify_email(payload: VerifyEmailRequest, db: DbSession) -> dict:
    """Mark the email address as verified."""
    service = AuthService(db)
    user = await service.verify_email(token=payload.token)
    await db.commit()
    return success({"user": UserProfile.model_validate(user).model_dump(mode="json")})


@router.get("/me", response_model=UserProfile, summary="Get the current profile")
async def get_me(user: CurrentUser) -> UserProfile:
    """Return the signed-in user's profile."""
    return UserProfile.model_validate(user)


@router.patch("/me", response_model=UserProfile, summary="Update the current profile")
async def update_me(
    payload: UpdateProfileRequest,
    user: CurrentUser,
    db: DbSession,
) -> UserProfile:
    """Change the name or preferred language."""
    service = AuthService(db)
    updated = await service.update_profile(
        user=user,
        full_name=payload.full_name,
        preferred_language=payload.preferred_language,
    )
    await db.commit()
    return UserProfile.model_validate(updated)


# ---------------------------------------------------------------------------
# Device token management (push notifications)
# ---------------------------------------------------------------------------

@router.post(
    "/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a device for push notifications",
)
@rate_limit("devices.register", limit=20, window_seconds=3600)
async def register_device(
    payload: RegisterDeviceRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> DeviceResponse:
    """Register or refresh an FCM / APNS token for the calling user.

    Call this on every app start so stale tokens are refreshed automatically.
    If the token already exists it is re-activated and the app version updated.
    One user can have multiple active device tokens (phone + tablet + web).
    """
    from sqlalchemy import select
    from app.models.identity import DeviceToken

    existing = await db.scalar(
        select(DeviceToken).where(DeviceToken.token == payload.token)
    )
    if existing is not None:
        # Re-activate and update version if the token already exists
        existing.is_active = True
        existing.app_version = payload.app_version
        existing.user_id = user.id  # re-claim if previously another user
        await db.commit()
        return DeviceResponse.model_validate(existing)

    device = DeviceToken(
        user_id=user.id,
        token=payload.token,
        platform=payload.platform,
        app_version=payload.app_version,
        is_active=True,
    )
    db.add(device)
    await db.commit()
    return DeviceResponse.model_validate(device)


@router.delete(
    "/devices/{token}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unregister a device (stop push notifications)",
)
async def unregister_device(
    token: str,
    user: CurrentUser,
    db: DbSession,
) -> None:
    """Deactivate a push token when the user logs out on a specific device.

    Does not delete the row — sets ``is_active=False`` so the token history
    is preserved for debugging delivery failures.
    """
    from sqlalchemy import select
    from app.models.identity import DeviceToken

    device = await db.scalar(
        select(DeviceToken).where(
            DeviceToken.token == token,
            DeviceToken.user_id == user.id,
        )
    )
    if device is not None:
        device.is_active = False
        await db.commit()
