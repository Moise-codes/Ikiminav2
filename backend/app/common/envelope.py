"""Response envelope and pagination.

Every successful response has the same shape::

    {"data": ..., "meta": {...}}

so a frontend can write one response handler and trust it everywhere.
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Cursor-free pagination metadata."""

    page: int = Field(ge=1)
    per_page: int = Field(ge=1)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class Page(BaseModel, Generic[T]):
    """A page of results plus its metadata."""

    items: list[T]
    pagination: PaginationMeta

    @classmethod
    def build(
        cls, items: list[T], *, total: int, page: int, per_page: int
    ) -> "Page[T]":
        """Construct a page, deriving the page count."""
        total_pages = (total + per_page - 1) // per_page if per_page else 0
        return cls(
            items=items,
            pagination=PaginationMeta(
                page=page,
                per_page=per_page,
                total=total,
                total_pages=total_pages,
            ),
        )


def success(data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    """Wrap a payload in the standard success envelope."""
    body: dict[str, Any] = {"data": data}
    if meta:
        body["meta"] = meta
    return body
