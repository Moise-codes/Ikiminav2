"""Resend email sender.

Resend is a modern email API service with excellent deliverability and a
generous free tier. This implementation uses their REST API.

API Documentation: https://resend.com/docs/api-reference/emails/send-email
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class EmailResult:
    """Outcome of an email delivery attempt."""

    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class ResendEmailSender:
    """Resend email sender implementation.

    Uses the Resend API to send transactional emails. Supports HTML and
    plain text content, custom from addresses, and reply-to.
    """

    BASE_URL = "https://api.resend.com/emails"

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=settings.sms_timeout_seconds,  # Reuse timeout setting
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def send(
        self,
        *,
        to: str,
        subject: str,
        html: str | None = None,
        text: str | None = None,
        from_email: str | None = None,
        reply_to: str | None = None,
    ) -> EmailResult:
        """Send an email via Resend.

        Args:
            to: Recipient email address
            subject: Email subject line
            html: HTML content (optional)
            text: Plain text content (optional)
            from_email: Sender email (defaults to settings.email_from)
            reply_to: Reply-to email address (optional)

        Returns:
            EmailResult with success status and provider message ID
        """
        if not settings.resend_api_key:
            logger.error("resend_not_configured")
            return EmailResult(success=False, error="resend_not_configured")

        # Prepare request payload
        payload = {
            "from": from_email or settings.email_from,
            "to": [to],
            "subject": subject,
        }

        if html:
            payload["html"] = html
        if text:
            payload["text"] = text
        if reply_to:
            payload["reply_to"] = reply_to

        # Prepare headers with API key
        headers = {
            "Authorization": f"Bearer {settings.resend_api_key}",
        }

        try:
            client = await self._get_client()
            response = await client.post(
                self.BASE_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()

            result = response.json()
            message_id = result.get("id")

            logger.info(
                "resend_email_sent",
                extra={
                    "to": to[-10:] if to else "",  # Mask email for privacy
                    "message_id": message_id,
                    "subject": subject[:50],
                },
            )

            return EmailResult(success=True, provider_message_id=message_id)

        except httpx.HTTPStatusError as exc:
            error_msg = exc.response.text[:500]
            logger.error(
                "resend_http_error",
                extra={
                    "status_code": exc.response.status_code,
                    "response": error_msg,
                },
            )
            return EmailResult(
                success=False,
                error=f"http_{exc.response.status_code}: {error_msg[:200]}",
            )
        except Exception as exc:
            logger.error("resend_error", extra={"error": str(exc)[:500]})
            return EmailResult(success=False, error=str(exc)[:500])

    async def aclose(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
