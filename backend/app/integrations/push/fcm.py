"""Firebase Cloud Messaging sender (HTTP v1 API).

Auth flow: the service-account JSON is exchanged for an OAuth2 access
token via a signed JWT (RS256), cached until ~1 minute before expiry.
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass

import httpx
import jwt
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


@dataclass
class PushResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None
    invalid_token: bool = False


class FcmPushSender:
    """Sends push notifications through FCM HTTP v1."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=15.0)
        self._access_token: str | None = None
        self._token_expiry: dt.datetime | None = None
        self._sa: dict | None = None

    @property
    def configured(self) -> bool:
        return bool(settings.fcm_project_id and settings.fcm_service_account_json)

    def _service_account(self) -> dict | None:
        if self._sa is None and settings.fcm_service_account_json:
            try:
                self._sa = json.loads(settings.fcm_service_account_json)
            except json.JSONDecodeError:
                logger.error("fcm_service_account_invalid_json")
                self._sa = {}
        return self._sa or None

    async def _get_access_token(self) -> str | None:
        now = dt.datetime.now(dt.timezone.utc)
        if self._access_token and self._token_expiry and now < self._token_expiry:
            return self._access_token
        sa = self._service_account()
        if not sa:
            return None
        now_ts = int(now.timestamp())
        assertion = jwt.encode(
            {
                "iss": sa["client_email"],
                "scope": _FCM_SCOPE,
                "aud": sa.get("token_uri", "https://oauth2.googleapis.com/token"),
                "iat": now_ts,
                "exp": now_ts + 3600,
            },
            sa["private_key"],
            algorithm="RS256",
        )
        resp = await self._client.post(
            sa.get("token_uri", "https://oauth2.googleapis.com/token"),
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        if resp.status_code != 200:
            logger.error("fcm_token_exchange_failed", status=resp.status_code)
            return None
        data = resp.json()
        self._access_token = data["access_token"]
        self._token_expiry = now + dt.timedelta(seconds=int(data.get("expires_in", 3600)) - 60)
        return self._access_token

    async def send(
        self,
        *,
        token: str,
        title: str | None = None,
        body: str | None = None,
        data: dict | None = None,
    ) -> PushResult:
        if not self.configured:
            return PushResult(success=False, error="fcm_not_configured")
        access = await self._get_access_token()
        if not access:
            return PushResult(success=False, error="fcm_auth_failed")

        message: dict = {"token": token, "data": {k: str(v) for k, v in (data or {}).items()}}
        if title or body:
            message["notification"] = {"title": title or "", "body": body or ""}

        try:
            resp = await self._client.post(
                f"https://fcm.googleapis.com/v1/projects/{settings.fcm_project_id}/messages:send",
                headers={"Authorization": f"Bearer {access}"},
                json={"message": message},
            )
        except httpx.HTTPError as exc:
            return PushResult(success=False, error=str(exc)[:300])

        if resp.status_code == 200:
            name = resp.json().get("name", "")
            return PushResult(success=True, provider_message_id=name or None)

        error_text = resp.text[:300]
        invalid = resp.status_code in (400, 404) or "UNREGISTERED" in error_text or "INVALID_ARGUMENT" in error_text
        logger.warning("fcm_send_failed", status=resp.status_code, error=error_text)
        return PushResult(success=False, error=error_text, invalid_token=invalid)

    async def aclose(self) -> None:
        await self._client.aclose()
