"""FastAPI exception handlers for the domain error envelope."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.errors import AppError


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Render any domain error as the standard envelope."""
    body = {
        "statusCode": exc.status_code,
        "error": exc.to_dict(),
    }
    return JSONResponse(status_code=exc.status_code, content=body)


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """Turn database constraint violations into generic 409s without leaking SQL."""
    body = {
        "statusCode": 409,
        "error": {"code": "CONFLICT", "message": "The request conflicts with current state."},
    }
    return JSONResponse(status_code=409, content=body)
