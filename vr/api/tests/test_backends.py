"""Tests for PostgreSQL and Redis backend support (Phase 7 Step 1)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from vr_api import rate_limit
from vr_api.rate_limit import (
    RedisTokenBucket,
    TokenBucket,
    _get_bucket,
    close_bucket,
    reset_bucket,
)


# ── Database URL selection ───────────────────────────────────────────────────


class TestDatabaseURL:
    def test_vr_database_url_preferred(self, monkeypatch):
        monkeypatch.setenv("VR_DATABASE_URL", "postgresql+asyncpg://user:pass@host/db")
        monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///old.db")
        from vr_api.db import _default_url

        assert _default_url() == "postgresql+asyncpg://user:pass@host/db"

    def test_database_url_fallback(self, monkeypatch):
        monkeypatch.delenv("VR_DATABASE_URL", raising=False)
        monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///test.db")
        from vr_api.db import _default_url

        assert _default_url() == "sqlite+aiosqlite:///test.db"

    def test_default_sqlite(self, monkeypatch):
        monkeypatch.delenv("VR_DATABASE_URL", raising=False)
        monkeypatch.delenv("DATABASE_URL", raising=False)
        from vr_api.db import _default_url

        assert "sqlite" in _default_url()


# ── Bucket factory ───────────────────────────────────────────────────────────


class TestBucketFactory:
    def setup_method(self):
        reset_bucket()

    def teardown_method(self):
        reset_bucket()

    def test_default_returns_in_memory(self, monkeypatch):
        monkeypatch.delenv("VR_REDIS_URL", raising=False)
        bucket = _get_bucket()
        assert isinstance(bucket, TokenBucket)

    def test_redis_url_returns_redis_bucket(self, monkeypatch):
        monkeypatch.setenv("VR_REDIS_URL", "redis://localhost:6379/0")
        bucket = _get_bucket()
        assert isinstance(bucket, RedisTokenBucket)

    def test_custom_rate(self, monkeypatch):
        monkeypatch.delenv("VR_REDIS_URL", raising=False)
        monkeypatch.setenv("VR_RATE_LIMIT_PER_MINUTE", "120")
        bucket = _get_bucket()
        assert isinstance(bucket, TokenBucket)
        assert bucket.rate == 120

    def test_redis_bucket_rate(self, monkeypatch):
        monkeypatch.setenv("VR_REDIS_URL", "redis://localhost:6379/0")
        monkeypatch.setenv("VR_RATE_LIMIT_PER_MINUTE", "200")
        bucket = _get_bucket()
        assert isinstance(bucket, RedisTokenBucket)
        assert bucket.rate == 200


# ── RedisTokenBucket ─────────────────────────────────────────────────────────


class TestRedisTokenBucket:
    @pytest.mark.asyncio
    async def test_consume_allowed(self):
        bucket = RedisTokenBucket(rate=60, capacity=60, redis_url="redis://fake")
        mock_redis = AsyncMock()
        mock_redis.script_load = AsyncMock(return_value="fake_sha")
        mock_redis.evalsha = AsyncMock(return_value=1)
        bucket._redis = mock_redis

        assert await bucket.consume("test-key") is True
        mock_redis.evalsha.assert_called_once()

    @pytest.mark.asyncio
    async def test_consume_denied(self):
        bucket = RedisTokenBucket(rate=60, capacity=60, redis_url="redis://fake")
        mock_redis = AsyncMock()
        mock_redis.script_load = AsyncMock(return_value="fake_sha")
        mock_redis.evalsha = AsyncMock(return_value=0)
        bucket._redis = mock_redis

        assert await bucket.consume("test-key") is False

    @pytest.mark.asyncio
    async def test_script_loaded_once(self):
        bucket = RedisTokenBucket(rate=60, capacity=60, redis_url="redis://fake")
        mock_redis = AsyncMock()
        mock_redis.script_load = AsyncMock(return_value="sha123")
        mock_redis.evalsha = AsyncMock(return_value=1)
        bucket._redis = mock_redis

        await bucket.consume("k1")
        await bucket.consume("k2")
        # script_load should be called only once
        mock_redis.script_load.assert_called_once()

    @pytest.mark.asyncio
    async def test_close(self):
        bucket = RedisTokenBucket(rate=60, capacity=60, redis_url="redis://fake")
        mock_redis = AsyncMock()
        bucket._redis = mock_redis

        await bucket.close()
        mock_redis.close.assert_called_once()
        assert bucket._redis is None

    @pytest.mark.asyncio
    async def test_close_noop_when_not_connected(self):
        bucket = RedisTokenBucket(rate=60, capacity=60, redis_url="redis://fake")
        await bucket.close()  # should not raise
        assert bucket._redis is None


# ── close_bucket helper ──────────────────────────────────────────────────────


class TestCloseBucket:
    @pytest.mark.asyncio
    async def test_close_redis_bucket(self, monkeypatch):
        monkeypatch.setenv("VR_REDIS_URL", "redis://localhost:6379/0")
        reset_bucket()
        bucket = _get_bucket()
        assert isinstance(bucket, RedisTokenBucket)
        # Mock the redis client to avoid real connection
        bucket._redis = AsyncMock()
        await close_bucket()
        assert rate_limit._bucket is None

    @pytest.mark.asyncio
    async def test_close_memory_bucket(self, monkeypatch):
        monkeypatch.delenv("VR_REDIS_URL", raising=False)
        reset_bucket()
        _ = _get_bucket()
        await close_bucket()
        assert rate_limit._bucket is None
