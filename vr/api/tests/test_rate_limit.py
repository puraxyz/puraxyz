"""Rate-limiting tests for the vr-api service."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from vr_api import rate_limit
from vr_api.app import app


@pytest.fixture
def limited_client(monkeypatch):
    """Client with a very low rate limit (3 req/min) and auth disabled."""
    monkeypatch.delenv("VR_API_KEYS", raising=False)
    monkeypatch.setenv("VR_RATE_LIMIT_PER_MINUTE", "3")
    rate_limit.reset_bucket()
    return TestClient(app)


class TestRateLimit:
    def test_under_limit_passes(self, limited_client):
        for _ in range(3):
            resp = limited_client.get("/v1/verifiers")
            assert resp.status_code == 200

    def test_over_limit_rejected(self, limited_client):
        for _ in range(3):
            limited_client.get("/v1/verifiers")
        resp = limited_client.get("/v1/verifiers")
        assert resp.status_code == 429
        assert "rate limit" in resp.json()["detail"].lower()

    def test_different_keys_independent(self, monkeypatch):
        """Each API key gets its own bucket."""
        monkeypatch.setenv("VR_API_KEYS", "key-a,key-b")
        monkeypatch.setenv("VR_RATE_LIMIT_PER_MINUTE", "2")
        rate_limit.reset_bucket()
        c = TestClient(app)

        # Exhaust key-a
        for _ in range(2):
            resp = c.get("/v1/verifiers", headers={"X-API-Key": "key-a"})
            assert resp.status_code == 200
        resp = c.get("/v1/verifiers", headers={"X-API-Key": "key-a"})
        assert resp.status_code == 429

        # key-b still has quota
        resp = c.get("/v1/verifiers", headers={"X-API-Key": "key-b"})
        assert resp.status_code == 200

    def test_health_not_rate_limited(self, limited_client):
        """Health endpoint has no rate-limit dependency."""
        # Exhaust the bucket
        for _ in range(3):
            limited_client.get("/v1/verifiers")
        assert limited_client.get("/v1/verifiers").status_code == 429
        # Health still works
        assert limited_client.get("/health").status_code == 200
