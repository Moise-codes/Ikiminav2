"""Outbox writer.

Notifications are queued in the same transaction as the change that caused
them, which guarantees the API never sends a message about something that
was rolled back.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import OutboxMessage


class NotificationService:
    """Queues outbound messages."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def enqueue_sms(
        self,
        *,
        to: str,
        template: str,
        payload: dict[str, Any],
        channel: str = "sms",
    ) -> OutboxMessage:
        """Queue a message for the worker to deliver."""
        message = OutboxMessage(
            channel=channel,
            recipient=to,
            template=template,
            payload=payload,
            status="pending",
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def enqueue_email(
        self, *, to: str, template: str, payload: dict[str, Any]
    ) -> OutboxMessage:
        """Queue an email for the worker to deliver."""
        return await self.enqueue_sms(
            to=to, template=template, payload=payload, channel="email"
        )
