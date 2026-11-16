"""Outbox worker: delivers queued SMS and email messages.

The worker claims rows with FOR UPDATE SKIP LOCKED so multiple worker
instances can run without stepping on each other. Failed deliveries are
retried with exponential backoff until they move to dead.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import signal
import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_sessionmaker
from app.integrations.sms.sender import build_sms_sender
from app.integrations.sms.templates import render
from app.models.platform import OutboxMessage

logger = structlog.get_logger()


class OutboxWorker:
    """Polls the outbox and delivers messages through the configured sender."""

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        self.poll_interval = poll_interval_seconds
        self._running = False
        self.sender = build_sms_sender()

    async def run(self) -> None:
        """Run until cancelled."""
        self._running = True
        loop = asyncio.get_running_loop()
        stop = asyncio.Event()

        def _signal_handler() -> None:
            stop.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _signal_handler)
            except NotImplementedError:  # pragma: no cover - Windows
                pass

        logger.info("worker_started")
        try:
            while self._running and not stop.is_set():
                try:
                    await self._process_batch()
                except Exception as exc:  # noqa: BLE001 - worker must survive
                    logger.exception("worker_batch_failed", error=str(exc)[:200])
                await asyncio.wait_for(stop.wait(), timeout=self.poll_interval)
        finally:
            await self.sender.aclose() if hasattr(self.sender, "aclose") else None
            logger.info("worker_stopped")

    async def _process_batch(self) -> None:
        async with get_sessionmaker()() as session:
            # Claim due rows.
            rows = await session.execute(
                select(OutboxMessage)
                .where(OutboxMessage.status.in_(("pending", "failed")))
                .where(OutboxMessage.next_attempt_at <= dt.datetime.now(dt.timezone.utc))
                .order_by(OutboxMessage.next_attempt_at)
                .limit(50)
                .with_for_update(skip_locked=True)
            )
            messages = list(rows.scalars())
            for message in messages:
                await self._deliver(session, message)
            await session.commit()

    async def _deliver(self, session: AsyncSession, message: OutboxMessage) -> None:
        try:
            body = render(message.template, "en", message.payload)
            if message.channel == "sms":
                result = await self.sender.send(to=message.recipient, message=body)
            else:  # pragma: no cover - email adapter not wired yet
                result = None  # type: ignore[assignment]

            if result and result.success:
                message.status = "sent"
                message.sent_at = dt.datetime.now(dt.timezone.utc)
                message.provider_message_id = result.provider_message_id
                logger.info(
                    "outbox_sent",
                    channel=message.channel,
                    recipient=message.recipient[-4:] if message.recipient else "",
                )
            else:
                await self._fail(session, message, result.error if result else "unknown channel")
        except Exception as exc:  # noqa: BLE001
            await self._fail(session, message, str(exc)[:500])

    async def _fail(
        self,
        session: AsyncSession,
        message: OutboxMessage,
        error: str,
    ) -> None:
        message.attempts += 1
        message.last_error = error
        if message.attempts >= settings.outbox_max_attempts:
            message.status = "dead"
            logger.warning(
                "outbox_dead",
                channel=message.channel,
                recipient=message.recipient[-4:] if message.recipient else "",
                error=error,
            )
        else:
            message.status = "failed"
            backoff_seconds = min(300, 2 ** message.attempts * 5)
            message.next_attempt_at = dt.datetime.now(dt.timezone.utc) + __import__(
                "datetime"
            ).timedelta(seconds=backoff_seconds)
            logger.warning(
                "outbox_failed_retry",
                channel=message.channel,
                attempt=message.attempts,
                error=error,
            )
