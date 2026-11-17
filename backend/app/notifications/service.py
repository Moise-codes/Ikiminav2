"""Outbox writer.

Notifications are queued in the same transaction as the change that caused
them, which guarantees the API never sends a message about something that
was rolled back.

Channels
--------
* ``sms``   — Africa's Talking or Pindo; delivered by the outbox worker.
* ``email`` — Resend or SMTP; delivered by the outbox worker.
* ``push``  — FCM (Android/web) or APNS (iOS); delivered by the outbox worker
              to every active device token for the target user.

Push flow
---------
1. Mobile app registers → ``POST /auth/devices`` stores the FCM/APNS token.
2. Event happens (loan approved, contribution recorded, group invitation …).
3. Service calls ``enqueue_push(user_id=…, template=…, payload=…)``.
4. Outbox worker fetches all active device tokens for that user and sends
   one push per device via FCM HTTP v1 or APNS.
5. If FCM/APNS responds "token no longer valid" the worker marks
   ``device_tokens.is_active = false`` so the next event skips it.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import OutboxMessage


class NotificationService:
    """Queues outbound messages into the transactional outbox."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # SMS
    # ------------------------------------------------------------------
    async def enqueue_sms(
        self,
        *,
        to: str,
        template: str,
        payload: dict[str, Any],
        channel: str = "sms",
    ) -> OutboxMessage:
        """Queue an SMS (or any channel) for the worker to deliver."""
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

    # ------------------------------------------------------------------
    # Email
    # ------------------------------------------------------------------
    async def enqueue_email(
        self, *, to: str, template: str, payload: dict[str, Any]
    ) -> OutboxMessage:
        """Queue a transactional email for the worker to deliver."""
        return await self.enqueue_sms(
            to=to, template=template, payload=payload, channel="email"
        )

    # ------------------------------------------------------------------
    # Push notifications (FCM / APNS)
    # ------------------------------------------------------------------
    async def enqueue_push(
        self,
        *,
        user_id: uuid.UUID,
        template: str,
        payload: dict[str, Any],
        title: str | None = None,
        body: str | None = None,
    ) -> list[OutboxMessage]:
        """Queue a push notification to every active device of a user.

        One ``OutboxMessage`` row is inserted per active device token so the
        outbox worker can track delivery per-device and deactivate stale
        tokens independently.

        ``template`` is used by the worker to look up the notification text
        in the localization table when ``title``/``body`` are not supplied
        directly (the preferred approach so Kinyarwanda, English and French
        all work without extra API calls).

        Returns the list of queued messages (may be empty if the user has no
        registered devices, which is fine — SMS is always sent as a fallback).
        """
        from app.models.identity import DeviceToken  # local to avoid circular

        result = await self.db.scalars(
            select(DeviceToken).where(
                DeviceToken.user_id == user_id,
                DeviceToken.is_active.is_(True),
            )
        )
        devices = list(result)

        messages: list[OutboxMessage] = []
        for device in devices:
            push_payload: dict[str, Any] = {
                **payload,
                "device_token": device.token,
                "platform": device.platform,
            }
            if title:
                push_payload["title"] = title
            if body:
                push_payload["body"] = body

            message = OutboxMessage(
                channel="push",
                # recipient stores the device token so the worker can send
                # without an extra DB lookup
                recipient=device.token,
                template=template,
                payload=push_payload,
                status="pending",
            )
            self.db.add(message)
            messages.append(message)

        if messages:
            await self.db.flush()
        return messages

    # ------------------------------------------------------------------
    # Combined: SMS + push (most events trigger both)
    # ------------------------------------------------------------------
    async def notify(
        self,
        *,
        user_id: uuid.UUID,
        phone: str,
        template: str,
        payload: dict[str, Any],
        title: str | None = None,
        body: str | None = None,
        skip_sms: bool = False,
        skip_push: bool = False,
    ) -> None:
        """Send SMS and push for the same event in one call.

        Use this in service methods instead of calling enqueue_sms and
        enqueue_push separately to keep the notification logic in one place.
        ``skip_sms`` and ``skip_push`` let callers opt out of one channel
        (e.g. skip SMS for silent data pushes to the app).
        """
        if not skip_sms:
            await self.enqueue_sms(to=phone, template=template, payload=payload)
        if not skip_push:
            await self.enqueue_push(
                user_id=user_id,
                template=template,
                payload=payload,
                title=title,
                body=body,
            )
