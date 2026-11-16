"""Base declarative class and shared column types."""

from __future__ import annotations

import datetime as dt
import os
import time
import uuid
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def uuid7() -> uuid.UUID:
    """Return a time-ordered UUIDv7.

    Time-ordered ids keep B-tree inserts on the primary key append-only, which
    matters once the ledger tables hold millions of rows.
    """
    millis = time.time_ns() // 1_000_000
    rand = os.urandom(10)
    raw = bytearray(16)
    raw[0:6] = millis.to_bytes(6, "big")
    raw[6] = (rand[0] & 0x0F) | 0x70  # version 7
    raw[7] = rand[1]
    raw[8] = (rand[2] & 0x3F) | 0x80  # variant
    raw[9:16] = rand[3:10]
    return uuid.UUID(bytes=bytes(raw))


class Base(DeclarativeBase):
    """Declarative base for every ORM model."""


class TimestampMixin:
    """created_at / updated_at for mutable tables.

    Ledger tables deliberately do not use this mixin: they are append-only.
    """

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def jsonb_column(**kwargs: Any) -> Any:
    """JSONB column that defaults to an empty object rather than NULL."""
    return mapped_column(JSONB, **kwargs)
