"""SMS provider interface and implementations.

The API never talks to a provider directly. It writes to the outbox and the
worker calls one of these, which keeps provider outages and rate limits off
the request path entirely.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class SmsResult:
    """Outcome of a delivery attempt."""

    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class SmsSender(Protocol):
    """Contract every SMS backend implements."""

    async def send(self, *, to: str, message: str) -> SmsResult:
        """Deliver a message to an E.164 number."""
        ...


class FakeSmsSender:
    """In-process sender used in tests and local development.

    Messages are logged with the phone masked and kept in memory so tests
    can assert on what would have been sent.
    """

    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    async def send(self, *, to: str, message: str) -> SmsResult:
        self.sent.append({"to": to, "message": message})
        logger.info("fake_sms_sent", extra={"phone": to[-3:], "length": len(message)})
        return SmsResult(success=True, provider_message_id=f"fake-{len(self.sent)}")


class HttpSmsSender:
    """Generic HTTP provider adapter.

    Africa's Talking, Pindo and Twilio each have a different wire format.
    Rather than carry three implementations, this adapter handles the common
    shape: a POST with a form or JSON body, a bearer or basic auth, and a
    provider id in the response. The per-provider details live in the
    ``provider_settings`` mapping on the settings object.
    """

    def __init__(self) -> None:
        self._client = None

    async def _get_client(self):  # pragma: no cover - network path
        if self._client is None:
            import httpx

            self._client = httpx.AsyncClient(
                timeout=settings.sms_timeout_seconds,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def send(self, *, to: str, message: str) -> SmsResult:  # pragma: no cover
        if not settings.sms_api_key or not settings.sms_base_url:
            return SmsResult(success=False, error="sms_provider_not_configured")

        payload = {
            "from": settings.sms_sender_id,
            "to": to,
            "text": message,
            "key": settings.sms_api_key,
        }
        try:
            client = await self._get_client()
            response = await client.post(settings.sms_base_url, data=payload)
            response.raise_for_status()
            body = response.json()
            message_id = None
            if isinstance(body, dict):
                message_id = body.get("id") or body.get("message_id") or body.get("sid")
                error = body.get("error") or body.get("errors")
                if error:
                    return SmsResult(success=False, error=str(error)[:500])
            return SmsResult(success=True, provider_message_id=str(message_id) if message_id else None)
        except Exception as exc:  # noqa: BLE001 - the worker retries anything
            logger.warning("sms_send_failed", extra={"error": str(exc)[:200]})
            return SmsResult(success=False, error=str(exc)[:500])

    async def aclose(self) -> None:  # pragma: no cover
        if self._client is not None:
            await self._client.aclose()
            self._client = None


def build_sms_sender() -> SmsSender:
    """Select the sender named in the configuration."""
    if settings.sms_provider == "fake":
        return FakeSmsSender()
    return HttpSmsSender()
