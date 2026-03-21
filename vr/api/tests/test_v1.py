"""Tests for vr-api /v1/ routes, batch, evidence list, and quota."""

from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from vr_api.app import app
from vr_api.db import set_quota


# ── Helpers ──────────────────────────────────────────────────────────────────

_POLICY_PASS = {
    "verifier_id": "vr/tau2.policy.constraint_not_violated",
    "completions": ["done"],
    "ground_truth": {
        "policies": [
            {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
        ],
        "actions": [{"type": "buy", "amount": 50}],
    },
}

_POLICY_FAIL = {
    "verifier_id": "vr/tau2.policy.constraint_not_violated",
    "completions": ["done"],
    "ground_truth": {
        "policies": [
            {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
        ],
        "actions": [{"type": "buy", "amount": 200}],
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# /v1/ Routes
# ══════════════════════════════════════════════════════════════════════════════


class TestV1Verify:
    def test_pass(self, client):
        resp = client.post("/v1/verify", json=_POLICY_PASS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["verdict"] == "PASS"

    def test_fail(self, client):
        resp = client.post("/v1/verify", json=_POLICY_FAIL)
        assert resp.status_code == 200
        assert resp.json()["results"][0]["verdict"] == "FAIL"

    def test_unknown_verifier(self, client):
        body = {**_POLICY_PASS, "verifier_id": "vr/nonexistent"}
        resp = client.post("/v1/verify", json=body)
        assert resp.status_code == 404


class TestV1Evidence:
    def test_not_found(self, client):
        resp = client.get("/v1/evidence/abc123")
        assert resp.status_code == 404

    def test_store_and_retrieve(self, client):
        # Verify to store evidence
        client.post("/v1/verify", json=_POLICY_PASS)
        # List evidence to get a hash
        resp = client.get("/v1/evidence")
        assert resp.status_code == 200
        data = resp.json()
        if data["count"] > 0:
            artifact_hash = data["evidence"][0]["artifact_hash"]
            resp2 = client.get(f"/v1/evidence/{artifact_hash}")
            assert resp2.status_code == 200
            assert resp2.json()["verifier_id"] == "vr/tau2.policy.constraint_not_violated"


class TestV1EvidenceList:
    def test_empty_list(self, client):
        resp = client.get("/v1/evidence")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["evidence"] == []

    def test_list_after_verify(self, client):
        client.post("/v1/verify", json=_POLICY_PASS)
        resp = client.get("/v1/evidence")
        data = resp.json()
        assert data["count"] >= 1

    def test_filter_by_verifier_id(self, client):
        client.post("/v1/verify", json=_POLICY_PASS)
        resp = client.get("/v1/evidence", params={"verifier_id": "vr/tau2.policy.constraint_not_violated"})
        data = resp.json()
        for item in data["evidence"]:
            assert item["verifier_id"] == "vr/tau2.policy.constraint_not_violated"

    def test_filter_unknown_verifier(self, client):
        client.post("/v1/verify", json=_POLICY_PASS)
        resp = client.get("/v1/evidence", params={"verifier_id": "vr/nonexistent"})
        assert resp.json()["count"] == 0

    def test_limit_param(self, client):
        # Verify twice for two evidence records
        client.post("/v1/verify", json=_POLICY_PASS)
        client.post("/v1/verify", json=_POLICY_FAIL)
        resp = client.get("/v1/evidence", params={"limit": 1})
        assert resp.json()["count"] <= 1


class TestV1Compose:
    def test_pass(self, client):
        body = {
            "verifier_ids": ["vr/tau2.policy.constraint_not_violated"],
            "completions": ["done"],
            "ground_truth": _POLICY_PASS["ground_truth"],
        }
        resp = client.post("/v1/compose", json=body)
        assert resp.status_code == 200
        assert resp.json()["results"][0]["verdict"] == "PASS"


class TestV1Verifiers:
    def test_list(self, client):
        resp = client.get("/v1/verifiers")
        assert resp.status_code == 200
        ids = resp.json()["verifiers"]
        assert len(ids) >= 18  # 18 registered verifiers

    def test_contains_new_verifiers(self, client):
        resp = client.get("/v1/verifiers")
        ids = resp.json()["verifiers"]
        assert "vr/rubric.summary.faithful" in ids
        assert "vr/web.browser.screenshot_match" in ids
        assert "vr/tau2.retail.inventory_updated" in ids


class TestV1Export:
    def test_returns_jsonl(self, client):
        resp = client.post("/v1/export", json=_POLICY_PASS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1


class TestV1Usage:
    def test_empty_usage(self, client):
        resp = client.get("/v1/usage")
        assert resp.status_code == 200
        # May have usage from this request itself
        assert "usage" in resp.json()


# ══════════════════════════════════════════════════════════════════════════════
# POST /v1/batch - concurrent verification
# ══════════════════════════════════════════════════════════════════════════════


class TestBatch:
    def test_batch_pass(self, client):
        body = {"items": [_POLICY_PASS, _POLICY_PASS]}
        resp = client.post("/v1/batch", json=body)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        for item in data["items"]:
            assert item["error"] is None
            assert len(item["results"]) >= 1

    def test_batch_mixed(self, client):
        body = {"items": [_POLICY_PASS, _POLICY_FAIL]}
        resp = client.post("/v1/batch", json=body)
        assert resp.status_code == 200
        items = resp.json()["items"]
        verdicts = [i["results"][0]["verdict"] for i in items]
        assert "PASS" in verdicts
        assert "FAIL" in verdicts

    def test_batch_with_error(self, client):
        body = {
            "items": [
                _POLICY_PASS,
                {**_POLICY_PASS, "verifier_id": "vr/nonexistent"},
            ]
        }
        resp = client.post("/v1/batch", json=body)
        assert resp.status_code == 200
        items = resp.json()["items"]
        # First should succeed, second should error
        assert items[0]["error"] is None
        assert items[1]["error"] is not None

    def test_batch_empty(self, client):
        resp = client.post("/v1/batch", json={"items": []})
        assert resp.status_code == 200
        assert resp.json()["items"] == []

    def test_batch_verifier_ids(self, client):
        body = {"items": [_POLICY_PASS]}
        resp = client.post("/v1/batch", json=body)
        assert resp.json()["items"][0]["verifier_id"] == "vr/tau2.policy.constraint_not_violated"


# ══════════════════════════════════════════════════════════════════════════════
# Quota admin endpoints
# ══════════════════════════════════════════════════════════════════════════════


class TestQuotaAdmin:
    def test_get_quota_not_found(self, client):
        resp = client.get("/v1/quota/unknown-key")
        assert resp.status_code == 404

    def test_set_and_get_quota(self, client):
        resp = client.put(
            "/v1/quota/test-key",
            json={"daily_limit": 500, "monthly_limit": 5000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["quota"]["api_key"] == "test-key"
        assert data["quota"]["daily_limit"] == 500
        assert data["quota"]["monthly_limit"] == 5000

        # GET it back
        resp2 = client.get("/v1/quota/test-key")
        assert resp2.status_code == 200
        assert resp2.json()["quota"]["daily_limit"] == 500

    def test_update_existing_quota(self, client):
        client.put("/v1/quota/key-1", json={"daily_limit": 100, "monthly_limit": 1000})
        client.put("/v1/quota/key-1", json={"daily_limit": 200, "monthly_limit": 2000})
        resp = client.get("/v1/quota/key-1")
        assert resp.json()["quota"]["daily_limit"] == 200

    def test_admin_key_required(self, monkeypatch):
        monkeypatch.setenv("VR_ADMIN_KEY", "secret-admin")
        client = TestClient(app)
        # Without admin key → 403
        resp = client.get("/v1/quota/test-key")
        assert resp.status_code == 403

        # With admin key → works
        resp = client.get("/v1/quota/test-key", headers={"X-API-Key": "secret-admin"})
        # 404 because no quota, but auth passed
        assert resp.status_code == 404

    def test_default_quota_values(self, client):
        resp = client.put("/v1/quota/key-defaults", json={})
        assert resp.status_code == 200
        q = resp.json()["quota"]
        assert q["daily_limit"] == 1000
        assert q["monthly_limit"] == 10000


# ══════════════════════════════════════════════════════════════════════════════
# Auth + quota enforcement
# ══════════════════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════════════════
# Pricing, estimate, keys, anchor, payments, revenue
# ══════════════════════════════════════════════════════════════════════════════


class TestPricing:
    def test_pricing_returns_tiers(self, client):
        resp = client.get("/v1/pricing")
        assert resp.status_code == 200
        data = resp.json()
        assert "tiers" in data
        assert isinstance(data["tiers"], list)
        assert "x402_enabled" in data

    def test_estimate_basic(self, client):
        resp = client.get(
            "/v1/estimate",
            params={"verifier_ids": "vr/tau2.policy.constraint_not_violated"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "estimated_cost_usd" in data
        assert data["verifier_count"] == 1

    def test_estimate_escalation(self, client):
        resp = client.get(
            "/v1/estimate",
            params={
                "verifier_ids": "vr/tau2.policy.constraint_not_violated",
                "policy_mode": "escalation",
                "budget_limit_usd": 0.001,
            },
        )
        assert resp.status_code == 200

    def test_estimate_unknown_verifier(self, client):
        resp = client.get("/v1/estimate", params={"verifier_ids": "vr/nope"})
        assert resp.status_code == 404


class TestKeys:
    def test_keys_endpoint(self, client):
        resp = client.get("/v1/keys")
        assert resp.status_code == 200
        data = resp.json()
        assert "keys" in data
        assert isinstance(data["keys"], list)


class TestAnchorEndpoints:
    def test_anchor_latest_none(self, client):
        resp = client.get("/v1/anchor/latest")
        assert resp.status_code == 404

    def test_anchor_detail_not_found(self, client):
        resp = client.get("/v1/anchor/999")
        assert resp.status_code == 404

    def test_anchor_trigger(self, client):
        resp = client.post("/v1/anchor")
        assert resp.status_code == 200
        assert resp.json()["status"] == "no_evidence"


class TestPaymentsEndpoints:
    def test_payments_empty(self, client):
        resp = client.get("/v1/payments/0x1234567890abcdef1234567890abcdef12345678")
        assert resp.status_code == 200
        data = resp.json()
        assert data["payments"] == []
        assert data["count"] == 0

    def test_revenue_empty(self, client):
        resp = client.get("/v1/revenue")
        assert resp.status_code == 200
        data = resp.json()
        assert data["revenue"] == []


class TestQuotaEnforcement:
    def test_no_quota_unrestricted(self, authed_client):
        """Keys with no QuotaRecord should be unrestricted."""
        resp = authed_client.post(
            "/v1/verify",
            json=_POLICY_PASS,
            headers={"X-API-Key": "test-key-1"},
        )
        assert resp.status_code == 200

    def test_quota_exceeded(self, monkeypatch):
        """When daily quota is 0, should get 429 immediately."""
        monkeypatch.setenv("VR_API_KEYS", "test-key-1")
        client = TestClient(app)

        # Set a very low quota
        loop = asyncio.new_event_loop()
        loop.run_until_complete(set_quota("test-key-1", daily_limit=0, monthly_limit=0))
        loop.close()

        resp = client.post(
            "/v1/verify",
            json=_POLICY_PASS,
            headers={"X-API-Key": "test-key-1"},
        )
        assert resp.status_code == 429
        assert "Retry-After" in resp.headers
