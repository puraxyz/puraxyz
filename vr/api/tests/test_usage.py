"""Tests for usage tracking - record_usage, get_usage, and GET /usage endpoint."""

from __future__ import annotations

import asyncio


from vr_api.db import (
    close_db,
    get_usage,
    init_db,
    record_usage,
)


# ══════════════════════════════════════════════════════════════════════════════
# Database CRUD unit tests
# ══════════════════════════════════════════════════════════════════════════════


class TestUsageCrud:
    def _run(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    def test_record_and_get_usage(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                record_usage(
                    api_key="key-1",
                    endpoint="/verify",
                    method="POST",
                    status_code=200,
                    latency_ms=50,
                )
            )
            self._run(
                record_usage(
                    api_key="key-1",
                    endpoint="/verify",
                    method="POST",
                    status_code=200,
                    latency_ms=100,
                )
            )
            self._run(
                record_usage(
                    api_key="key-2",
                    endpoint="/health",
                    method="GET",
                    status_code=200,
                    latency_ms=10,
                )
            )

            # Get all usage
            usage = self._run(get_usage())
            assert len(usage) == 2  # two distinct keys

            # key-1 has 2 requests
            key1 = next(u for u in usage if u["api_key"] == "key-1")
            assert key1["request_count"] == 2
            assert key1["avg_latency_ms"] == 75.0

            # key-2 has 1 request
            key2 = next(u for u in usage if u["api_key"] == "key-2")
            assert key2["request_count"] == 1
        finally:
            self._run(close_db())

    def test_get_usage_filtered_by_key(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                record_usage("key-a", "/verify", "POST", 200, 50)
            )
            self._run(
                record_usage("key-b", "/health", "GET", 200, 10)
            )
            usage = self._run(get_usage(api_key="key-a"))
            assert len(usage) == 1
            assert usage[0]["api_key"] == "key-a"
        finally:
            self._run(close_db())

    def test_empty_usage(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            usage = self._run(get_usage())
            assert usage == []
        finally:
            self._run(close_db())


# ══════════════════════════════════════════════════════════════════════════════
# API endpoint tests
# ══════════════════════════════════════════════════════════════════════════════


class TestUsageEndpoint:
    def test_usage_endpoint_returns_200(self, client):
        """GET /v1/usage should return usage data."""
        resp = client.get("/v1/usage")
        assert resp.status_code == 200
        data = resp.json()
        assert "usage" in data
        assert isinstance(data["usage"], list)

    def test_usage_records_requests(self, client):
        """Usage middleware should track requests."""
        # Make a few requests
        client.get("/health")
        client.get("/v1/verifiers")
        client.post("/v1/verify", json={
            "verifier_id": "vr/tau2.policy.constraint_not_violated",
            "completions": ["done"],
            "ground_truth": {
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100}
                ],
                "actions": [{"type": "buy", "amount": 50}],
            },
        })

        resp = client.get("/v1/usage")
        data = resp.json()
        # Should have at least some usage records
        assert len(data["usage"]) >= 1
        total_reqs = sum(u["request_count"] for u in data["usage"])
        assert total_reqs >= 3
