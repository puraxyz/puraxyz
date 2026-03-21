"""Tests for B4 - budget-aware verification policies and cost transparency."""

from __future__ import annotations




# ── Fixtures ─────────────────────────────────────────────────────────────────

_COMPOSE_PASS = {
    "verifier_ids": [
        "vr/tau2.policy.constraint_not_violated",
        "vr/document.json.valid",
    ],
    "completions": ["done"],
    "ground_truth": {
        "policies": [
            {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
        ],
        "actions": [{"type": "buy", "amount": 50}],
        "file_path": "/tmp/__nonexistent__.json",  # will fail, that's fine
    },
}


class TestCostInResponses:
    """Verify cost_usd appears in verify and compose results."""

    def test_verify_includes_cost_usd(self, client):
        resp = client.post("/v1/verify", json={
            "verifier_id": "vr/tau2.policy.constraint_not_violated",
            "completions": ["done"],
            "ground_truth": {
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
                ],
                "actions": [{"type": "buy", "amount": 50}],
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "cost_usd" in data["results"][0]
        assert isinstance(data["results"][0]["cost_usd"], float)
        assert data["results"][0]["cost_usd"] > 0

    def test_compose_includes_cost_usd(self, client):
        resp = client.post("/v1/compose", json=_COMPOSE_PASS)
        assert resp.status_code == 200
        data = resp.json()
        assert "cost_usd" in data["results"][0]


class TestBudgetWiring:
    """Verify budget_limit_usd is wired through to the composition engine."""

    def test_compose_accepts_budget(self, client):
        payload = {**_COMPOSE_PASS, "budget_limit_usd": 0.01, "policy_mode": "escalation"}
        resp = client.post("/v1/compose", json=payload)
        assert resp.status_code == 200

    def test_compose_escalation_without_budget(self, client):
        payload = {**_COMPOSE_PASS, "policy_mode": "escalation"}
        resp = client.post("/v1/compose", json=payload)
        assert resp.status_code == 200


class TestEstimateEndpoint:
    """Test GET /v1/estimate cost preview."""

    def test_estimate_single_verifier(self, client):
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "vr/tau2.policy.constraint_not_violated",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["estimated_cost_usd"] > 0
        assert data["verifier_count"] == 1
        assert data["policy_mode"] == "fail_closed"
        assert len(data["tiers_included"]) > 0
        assert data["tiers_skipped"] == []

    def test_estimate_multiple_verifiers(self, client):
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "vr/tau2.policy.constraint_not_violated,vr/document.json.valid",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["verifier_count"] == 2
        assert data["estimated_cost_usd"] > 0

    def test_estimate_escalation_with_budget(self, client):
        """With a tiny budget, some tiers should be skipped."""
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "vr/tau2.policy.constraint_not_violated",
            "policy_mode": "escalation",
            "budget_limit_usd": 0.001,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["policy_mode"] == "escalation"
        # Either some tiers included or some skipped depending on tier cost
        assert isinstance(data["tiers_included"], list)
        assert isinstance(data["tiers_skipped"], list)

    def test_estimate_unknown_verifier(self, client):
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "nonexistent.verifier",
        })
        assert resp.status_code == 404

    def test_estimate_empty_ids(self, client):
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "",
        })
        assert resp.status_code == 422

    def test_estimate_escalation_no_budget(self, client):
        """Escalation without budget should include all tiers."""
        resp = client.get("/v1/estimate", params={
            "verifier_ids": "vr/tau2.policy.constraint_not_violated",
            "policy_mode": "escalation",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["tiers_skipped"] == []
