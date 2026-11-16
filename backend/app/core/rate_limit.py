"""Redis-backed rate limiting with a per-user and per-IP key space."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, ParamSpec

import redis.asyncio as redis
from fastapi import Request

from app.core.config import settings
from app.core.errors import RateLimitExceededError

P = ParamSpec("P")

_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


class RateLimit:
    """Decide whether a request should be admitted.

    Usage::

        @rate_limit("login", limit=10, window_seconds=300)
        async def login(...): ...
    """

    def __init__(
        self,
        name: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> None:
        self.name = name
        self.limit = limit
        self.window_seconds = window_seconds

    def __call__(
        self, func: Callable[P, Awaitable[Any]]
    ) -> Callable[P, Awaitable[Any]]:
        import functools

        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> Any:
            if not settings.rate_limit_enabled:
                return await func(*args, **kwargs)

            request = self._find_request(args, kwargs)
            key = self._key_for(request)
            allowed = await self._check(key)
            if not allowed:
                raise RateLimitExceededError()
            return await func(*args, **kwargs)

        return wrapper

    def _find_request(self, args: tuple, kwargs: dict) -> Request | None:
        for arg in args:
            if isinstance(arg, Request):
                return arg
        for value in kwargs.values():
            if isinstance(value, Request):
                return value
        return None

    def _key_for(self, request: Request | None) -> str:
        if request is None:
            return f"rl:{self.name}:unknown"
        user_id = getattr(request.state, "user_id", None)
        if user_id is not None:
            return f"rl:{self.name}:user:{user_id}"
        client = request.client.host if request.client else "unknown"
        return f"rl:{self.name}:ip:{client}"

    async def _check(self, key: str) -> bool:
        client = _get_redis()
        pipe = client.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()
        count = results[0]
        return count <= self.limit
