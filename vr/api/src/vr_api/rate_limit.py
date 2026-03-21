"""Per-key token-bucket rate limiter - in-memory or Redis-backed.

When ``VR_REDIS_URL`` is set, a Redis-backed bucket provides persistence
across restarts and multi-instance deployments.  When unset, the original
in-memory bucket is used (zero-config dev experience).

Reads ``VR_RATE_LIMIT_PER_MINUTE`` from the environment (default **60**).
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from typing import Any

from fastapi import HTTPException, Request


class TokenBucket:
    """Simple token-bucket rate limiter keyed by API key."""

    def __init__(self, rate: float, capacity: float):
        self.rate = rate  # tokens per minute
        self.capacity = capacity
        self._tokens: dict[str, float] = defaultdict(lambda: capacity)
        self._last_refill: dict[str, float] = defaultdict(time.monotonic)

    def consume(self, key: str) -> bool:
        """Try to consume one token. Returns ``True`` if allowed."""
        now = time.monotonic()
        elapsed = now - self._last_refill[key]
        self._last_refill[key] = now
        self._tokens[key] = min(
            self.capacity,
            self._tokens[key] + elapsed * self.rate / 60.0,
        )
        if self._tokens[key] >= 1.0:
            self._tokens[key] -= 1.0
            return True
        return False


class RedisTokenBucket:
    """Redis-backed token-bucket rate limiter for multi-instance deployments.

    Uses an atomic Lua script so the check-and-decrement is a single
    round-trip.  Keys auto-expire after 120 s of inactivity.
    """

    _LUA_SCRIPT = """\
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now
local elapsed = now - last_refill
tokens = math.min(capacity, tokens + elapsed * rate / 60.0)
if tokens >= 1.0 then
    tokens = tokens - 1.0
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 120)
    return 1
else
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 120)
    return 0
end
"""

    def __init__(self, rate: float, capacity: float, redis_url: str):
        self.rate = rate
        self.capacity = capacity
        self._redis_url = redis_url
        self._redis: Any = None
        self._script_sha: str | None = None

    async def _get_redis(self) -> Any:
        if self._redis is None:
            try:
                import redis.asyncio as aioredis
            except ImportError:
                raise RuntimeError(
                    "VR_REDIS_URL is set but 'redis' package is not installed. "
                    "Install with: pip install 'redis[hiredis]'"
                )
            self._redis = aioredis.from_url(
                self._redis_url, decode_responses=True,
            )
        return self._redis

    async def consume(self, key: str) -> bool:
        """Try to consume one token via an atomic Lua script."""
        r = await self._get_redis()
        if self._script_sha is None:
            self._script_sha = await r.script_load(self._LUA_SCRIPT)
        result = await r.evalsha(
            self._script_sha, 1,
            f"vr:ratelimit:{key}",
            str(self.rate), str(self.capacity), str(time.time()),
        )
        return int(result) == 1

    async def close(self) -> None:
        """Close the Redis connection pool."""
        if self._redis is not None:
            await self._redis.close()
            self._redis = None


_bucket: TokenBucket | RedisTokenBucket | None = None


def _get_bucket() -> TokenBucket | RedisTokenBucket:
    global _bucket
    if _bucket is None:
        rate = int(os.environ.get("VR_RATE_LIMIT_PER_MINUTE", "60"))
        redis_url = os.environ.get("VR_REDIS_URL", "")
        if redis_url:
            _bucket = RedisTokenBucket(rate=rate, capacity=rate, redis_url=redis_url)
        else:
            _bucket = TokenBucket(rate=rate, capacity=rate)
    return _bucket


def reset_bucket() -> None:
    """Destroy the singleton bucket so the next call re-reads env vars."""
    global _bucket
    _bucket = None


async def close_bucket() -> None:
    """Close any async resources held by the rate-limit bucket."""
    global _bucket
    if isinstance(_bucket, RedisTokenBucket):
        await _bucket.close()
    _bucket = None


async def check_rate_limit(request: Request) -> None:
    """FastAPI dependency - raises 429 when the bucket is exhausted."""
    key = request.headers.get("X-API-Key", "anonymous")
    bucket = _get_bucket()
    if isinstance(bucket, RedisTokenBucket):
        allowed = await bucket.consume(key)
    else:
        allowed = bucket.consume(key)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
