"""Application settings.

Every setting is validated at startup. The app refuses to boot on a bad
configuration rather than failing at the first request that happens to need
the broken value.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "ci", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- application -----------------------------------------------------
    app_name: str = "Itsinda API"
    environment: Environment = "local"
    debug: bool = False
    api_prefix: str = "/api/v1"
    timezone: str = "Africa/Kigali"

    # --- database ---------------------------------------------------------
    database_url: str = Field(
        default="postgresql+asyncpg://itsinda:itsinda@localhost:5432/itsinda"
    )
    db_pool_size: int = Field(default=10, ge=1, le=100)
    db_max_overflow: int = Field(default=20, ge=0, le=200)
    db_pool_timeout_seconds: int = Field(default=30, ge=1)
    db_echo: bool = False

    # --- redis ------------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"

    # --- security ---------------------------------------------------------
    secret_key: str = Field(default="dev-only-change-me", min_length=16)
    jwt_secret: str = Field(default="dev-only-change-me-jwt", min_length=16)
    otp_hmac_secret: str = Field(default="dev-only-change-me-otp", min_length=16)
    access_token_ttl_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_ttl_days: int = Field(default=30, ge=1, le=365)
    otp_ttl_minutes: int = Field(default=5, ge=1, le=30)
    otp_max_attempts: int = Field(default=5, ge=1, le=10)
    otp_daily_cap_per_phone: int = Field(default=10, ge=1, le=100)
    password_min_length: int = Field(default=8, ge=8, le=64)
    max_failed_logins: int = Field(default=5, ge=1, le=20)
    lockout_minutes: int = Field(default=15, ge=1, le=1440)
    argon2_time_cost: int = Field(default=3, ge=1, le=10)
    argon2_memory_cost: int = Field(default=64 * 1024, ge=8 * 1024)
    argon2_parallelism: int = Field(default=4, ge=1, le=16)

    # --- tokens -----------------------------------------------------------
    email_token_ttl_minutes: int = Field(default=60 * 24, ge=10)

    # --- cors / proxy -----------------------------------------------------
    allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    trusted_proxies: list[str] = Field(default_factory=list)

    # --- sms --------------------------------------------------------------
    sms_provider: Literal["fake", "africastalking", "pindo", "twilio"] = "fake"
    sms_sender_id: str = "ITSINDA"
    sms_api_key: str | None = None  # Africa's Talking username
    sms_api_secret: str | None = None  # Africa's Talking API key
    sms_base_url: str | None = None  # Optional override
    sms_timeout_seconds: int = Field(default=15, ge=1, le=60)

    # --- mtn mobile money -------------------------------------------------
    mtn_environment: Literal["sandbox", "production"] = "sandbox"
    mtn_collection_base_url: str = "https://sandbox.momodeveloper.mtn.com/collection"
    mtn_disbursement_base_url: str = "https://sandbox.momodeveloper.mtn.com/disbursement"
    mtn_collection_api_user: str = ""
    mtn_collection_api_key: str = ""
    mtn_disbursement_api_user: str = ""
    mtn_disbursement_api_key: str = ""
    mtn_webhook_secret: str = ""
    mtn_callback_base_url: str = "http://localhost:8000"

    # --- email (transactional) -------------------------------------------
    email_provider: Literal["fake", "smtp", "resend"] = "fake"
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@itsinda.rw"
    email_from: str = "no-reply@itsinda.rw"
    resend_api_key: str | None = None
    public_base_url: str = "http://localhost:8000"

    # --- rate limiting ----------------------------------------------------
    rate_limit_enabled: bool = True
    rate_limit_default_per_minute: int = 120
    rate_limit_login_per_minute: int = 10
    rate_limit_otp_per_minute: int = 5
    rate_limit_otp_per_hour: int = 20

    # --- observability ----------------------------------------------------
    log_level: str = "INFO"
    log_json: bool = True
    sentry_dsn: str | None = None
    metrics_enabled: bool = True

    # --- business defaults -------------------------------------------------
    privacy_notice_version: str = "2026-11-14"
    idempotency_ttl_hours: int = Field(default=24, ge=1, le=168)
    outbox_max_attempts: int = Field(default=5, ge=1, le=20)

    @field_validator("allowed_origins", "trusted_proxies", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Accept both a JSON list and a plain comma-separated string."""
        if isinstance(value, str) and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("secret_key", "jwt_secret", "otp_hmac_secret")
    @classmethod
    def _reject_default_secrets_in_production(cls, value: str, info: object) -> str:
        """Refuse to run production with the shipped development secrets."""
        environment = getattr(info, "data", {}).get("environment")
        if environment == "production" and value.startswith("dev-only-change-me"):
            raise ValueError(
                f"{info.field_name} must be set to a real secret in production"
            )
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor."""
    return Settings()


settings = get_settings()
