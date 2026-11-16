"""FastAPI application factory."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import dispose_engine
from app.core.errors import AppError
from app.core.exceptions import app_error_handler, integrity_error_handler
from app.core.middleware import RequestIdMiddleware, SecurityHeadersMiddleware
from app.core.rate_limit import _get_redis
from app.integrations.mtn.client import MtnClient
from app.integrations.mtn.webhook import router as mtn_webhook_router

# Routers — imported here so OpenAPI documents every endpoint.
from app.auth.router import router as auth_router  # noqa: E402
from app.contributions.router import router as contributions_router  # noqa: E402
from app.groups.router import router as groups_router  # noqa: E402
from app.loans.router import router as loans_router  # noqa: E402
from app.payments.router import router as payments_router  # noqa: E402
from app.reports.router import router as reports_router  # noqa: E402


def create_app() -> FastAPI:
    """Build the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version="2.0.0",
        description=(
            "Production backend API for Rwandan savings groups (ibimina / itsinda). "
            "Phone-first identity, immutable RWF ledger, MTN Mobile Money "
            "send/receive, database-enforced constraints."
        ),
        docs_url=f"{settings.api_prefix}/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        redoc_url=None,
    )

    # --- middleware ----------------------------------------------------
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-Request-Id",
            "X-Signature",
            "X-Reference-Id",
            "X-External-Id",
            "X-Status",
            "X-Reason",
        ],
        max_age=86400,
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)

    # --- error handlers ------------------------------------------------
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Never leak stack traces to the client."""
        body = {
            "statusCode": 500,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            },
        }
        return JSONResponse(status_code=500, content=body)

    # --- health --------------------------------------------------------
    @app.get("/health", tags=["ops"])
    async def health() -> dict:
        return {"status": "ok", "service": settings.app_name, "version": "2.0.0"}

    @app.get(f"{settings.api_prefix}/health/ready", tags=["ops"])
    async def readiness() -> dict:
        redis_ok = False
        db_ok = False
        try:
            redis_client = _get_redis()
            await redis_client.ping()
            redis_ok = True
        except Exception:  # noqa: BLE001
            pass
        try:
            from app.core.database import get_engine
            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute("SELECT 1")
            db_ok = True
        except Exception:  # noqa: BLE001
            pass
        ready = redis_ok and db_ok
        return {"ready": ready, "redis": redis_ok, "database": db_ok}

    # --- startup / shutdown -------------------------------------------
    @app.on_event("startup")
    async def _startup() -> None:
        redis_client = _get_redis()
        await redis_client.ping()
        MtnClient()  # validate MTN config can be instantiated

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await dispose_engine()

    # --- routers -------------------------------------------------------
    app.include_router(auth_router)
    app.include_router(groups_router)
    app.include_router(contributions_router)
    app.include_router(loans_router)
    app.include_router(payments_router)
    app.include_router(reports_router)
    app.include_router(mtn_webhook_router)

    return app


app = create_app()
