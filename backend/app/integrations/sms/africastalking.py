"""Africa's Talking SMS sender for Rwanda.

Africa's Talking is the leading SMS provider in Africa with excellent
coverage in Rwanda. This implementation uses their REST API v1.

API Documentation: https://developers.africastalking.com/docs/sms/sending
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class SmsResult:
    """Outcome of a delivery attempt."""

    success: bool
    provider_message_id: str | None = None
    error: str | None = None


class AfricaTalkingSmsSender:
    """Africa's Talking SMS sender implementation.

    Uses the Africa's Talking SMS API to send messages to Rwandan phone
    numbers. Supports alphanumeric sender IDs and delivery reports.
    """

    BASE_URL = "https://api.africastalking.com/version1/messaging"

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=settings.sms_timeout_seconds,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def send(self, *, to: str, message: str) -> SmsResult:
        """Send an SMS via Africa's Talking.

        Args:
            to: Phone number in E.164 format (e.g., +250788123456)
            message: SMS message content

        Returns:
            SmsResult with success status and provider message ID
        """
        if not settings.sms_api_key or not settings.sms_api_secret:
            logger.error("africastalking_not_configured")
            return SmsResult(success=False, error="africastalking_not_configured")

        # Remove + from phone number for Africa's Talking
        # They expect format: 250788123456
        phone = to.lstrip("+")

        # Prepare form data
        data = {
            "username": settings.sms_api_key,  # Africa's Talking uses username as API key
            "to": phone,
            "message": message,
            "from": settings.sms_sender_id if settings.sms_sender_id else "ITSINDA",
        }

        # Prepare headers with API key
        headers = {
            "apiKey": settings.sms_api_secret,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }

        try:
            client = await self._get_client()
            response = await client.post(
                self.BASE_URL,
                data=data,
                headers=headers,
            )
            response.raise_for_status()

            result = response.json()

            # Africa's Talking response structure
            # {
            #   "SMSMessageData": {
            #     "Message": "Sent to 1/1 Total Cost: X",
            #     "Recipients": [
            #       {
            #         "statusCode": 101,
            #         "number": "250788123456",
            #         "status": "Success",
            #         "messageId": "ATXid_...",
            #         "cost": "X"
            #       }
            #     ]
            #   }
            # }

            sms_data = result.get("SMSMessageData", {})
            recipients = sms_data.get("Recipients", [])

            if not recipients:
                logger.warning("africastalking_no_recipients", extra={"response": result})
                return SmsResult(success=False, error="no_recipients_in_response")

            recipient = recipients[0]
            status_code = recipient.get("statusCode")
            status = recipient.get("status", "").lower()
            message_id = recipient.get("messageId")

            # Status code 101 means success
            if status_code == 101 or status == "success":
                logger.info(
                    "africastalking_sms_sent",
                    extra={
                        "phone": phone[-4:],
                        "message_id": message_id,
                        "cost": recipient.get("cost"),
                    },
                )
                return SmsResult(success=True, provider_message_id=message_id)
            else:
                error_msg = recipient.get("status", "unknown_error")
                logger.warning(
                    "africastalking_sms_failed",
                    extra={
                        "phone": phone[-4:],
                        "status_code": status_code,
                        "error": error_msg,
                    },
                )
                return SmsResult(success=False, error=f"{status_code}: {error_msg}")

        except httpx.HTTPStatusError as exc:
            logger.error(
                "africastalking_http_error",
                extra={
                    "status_code": exc.response.status_code,
                    "response": exc.response.text[:500],
                },
            )
            return SmsResult(
                success=False,
                error=f"http_{exc.response.status_code}: {exc.response.text[:200]}",
            )
        except Exception as exc:
            logger.error("africastalking_error", extra={"error": str(exc)[:500]})
            return SmsResult(success=False, error=str(exc)[:500])

    async def aclose(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None
