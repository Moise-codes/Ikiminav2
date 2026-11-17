"""Shared FastAPI dependencies: authentication, authorization, pagination."""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.models.group import Membership
from app.models.identity import User

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    request: Request,
    db: DbSession,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> User:
    """Resolve the authenticated user from the bearer token.

    A missing, malformed or expired token all produce the same error so the
    client cannot tell them apart.
    """
    if credentials is None or not credentials.credentials:
        raise AuthenticationError()

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError(
            "The access token has expired.", code="TOKEN_EXPIRED"
        ) from exc
    except jwt.PyJWTError as exc:
        raise AuthenticationError() from exc

    if payload.get("typ") != "access":
        raise AuthenticationError()

    # Check the token has not been explicitly blacklisted (password change /
    # logout-all revokes the access token immediately in Redis).
    jti = payload.get("jti")
    if jti:
        from app.core.security import is_token_blacklisted
        try:
            blacklisted = await is_token_blacklisted(jti)
        except Exception:
            # Redis outage must not take down every authenticated request —
            # the blacklist is a revocation optimisation, not the primary check.
            blacklisted = False
        if blacklisted:
            raise AuthenticationError(
                "This session has been revoked.", code="TOKEN_REVOKED"
            )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise AuthenticationError() from exc

    user = await db.get(User, user_id)
    if user is None:
        raise AuthenticationError()
    if user.status != "active":
        if user.status == "locked":
            raise AuthenticationError(
                "This account is locked.", code="ACCOUNT_LOCKED"
            )
        raise AuthenticationError("This account is not active.", code="ACCOUNT_INACTIVE")

    request.state.user_id = user.id
    request.state.token_payload = payload
    request.state.access_token = credentials.credentials
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_membership(
    *,
    db: AsyncSession,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    required_roles: tuple[str, ...] | None = None,
    allow_invited: bool = False,
) -> Membership:
    """Load the caller's membership in a group, enforcing the role set.

    This is the single place group authorization is decided. Every route
    that touches group data goes through it.
    """
    membership = await db.scalar(
        select(Membership).where(
            Membership.group_id == group_id,
            Membership.user_id == user_id,
        )
    )
    if membership is None or membership.status == "left":
        raise PermissionDeniedError(
            "You are not a member of this group.", code="NOT_A_GROUP_MEMBER"
        )
    if membership.status == "suspended":
        raise PermissionDeniedError(
            "Your membership of this group is suspended.", code="MEMBERSHIP_SUSPENDED"
        )
    if membership.status == "invited" and not allow_invited:
        raise PermissionDeniedError(
            "Your membership is not active yet.", code="MEMBERSHIP_NOT_ACTIVE"
        )
    if required_roles and membership.role not in required_roles:
        raise PermissionDeniedError(
            "Your role in this group does not allow this action.",
            code="ROLE_NOT_ALLOWED",
            details={"required_roles": list(required_roles), "your_role": membership.role},
        )
    return membership


class Pagination:
    """Page and per-page bounds from the query string."""

    def __init__(self, page: int = 1, per_page: int = 20) -> None:
        self.page = max(1, page)
        self.per_page = min(100, max(1, per_page))

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


def pagination(page: int = 1, per_page: int = 20) -> Pagination:
    """Dependency providing :class:`Pagination`."""
    return Pagination(page=page, per_page=per_page)


PageParams = Annotated[Pagination, Depends(pagination)]
