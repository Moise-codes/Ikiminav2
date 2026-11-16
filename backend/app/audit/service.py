"""Audit writer.

Audit rows are appended in the same transaction as the business change, so
the log can never disagree with the data it describes.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import AuditLog

#: Field names that must never reach the audit log.
REDACTED_FIELDS = frozenset(
    {
        "password",
        "password_hash",
        "token",
        "access_token",
        "refresh_token",
        "token_hash",
        "code",
        "code_hmac",
        "secret",
    }
)


def scrub(data: dict[str, Any] | None) -> dict[str, Any] | None:
    """Remove secrets and mask personal identifiers in a snapshot."""
    if not data:
        return None
    clean: dict[str, Any] = {}
    for key, value in data.items():
        if key in REDACTED_FIELDS:
            clean[key] = "[redacted]"
        elif key == "phone" and isinstance(value, str) and len(value) >= 7:
            clean[key] = f"{value[:7]}***{value[-3:]}"
        elif key == "email" and isinstance(value, str) and "@" in value:
            local, _, domain = value.partition("@")
            clean[key] = f"{local[:1]}***@{domain}"
        else:
            clean[key] = value
    return clean


class AuditService:
    """Writes audit entries."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def record(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID,
        actor_user_id: uuid.UUID | None = None,
        group_id: uuid.UUID | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        ip: str | None = None,
        request_id: str | None = None,
    ) -> AuditLog:
        """Append one audit entry."""
        entry = AuditLog(
            actor_user_id=actor_user_id,
            group_id=group_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=scrub(before),
            after_data=scrub(after),
            ip=ip,
            request_id=request_id,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry
