"""Endpoint tests for the vr-api service (/v1/ routes).

All tests run with auth disabled (no VR_API_KEYS) so they focus purely on
the verification logic. Auth and rate-limiting are tested separately.
"""

from __future__ import annotations

import json


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
# GET /health
# ══════════════════════════════════════════════════════════════════════════════


class TestHealth:
    def test_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"


# ══════════════════════════════════════════════════════════════════════════════
# POST /verify
# ══════════════════════════════════════════════════════════════════════════════


class TestVerify:
    def test_pass(self, client):
        resp = client.post("/v1/verify", json=_POLICY_PASS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["verdict"] == "PASS"
        assert data["results"][0]["score"] == 1.0
        assert data["results"][0]["passed"] is True

    def test_fail(self, client):
        resp = client.post("/v1/verify", json=_POLICY_FAIL)
        assert resp.status_code == 200
        r = resp.json()["results"][0]
        assert r["verdict"] == "FAIL"
        assert r["passed"] is False

    def test_unknown_verifier(self, client):
        body = {**_POLICY_PASS, "verifier_id": "vr/nonexistent"}
        resp = client.post("/v1/verify", json=body)
        assert resp.status_code == 404

    def test_multiple_completions(self, client):
        body = {**_POLICY_PASS, "completions": ["a", "b", "c"]}
        resp = client.post("/v1/verify", json=body)
        assert resp.status_code == 200
        assert len(resp.json()["results"]) == 3

    def test_result_fields(self, client):
        resp = client.post("/v1/verify", json=_POLICY_PASS)
        r = resp.json()["results"][0]
        assert "tier" in r
        assert "breakdown" in r
        assert "evidence" in r
        assert "artifact_hash" in r


# ══════════════════════════════════════════════════════════════════════════════
# POST /compose
# ══════════════════════════════════════════════════════════════════════════════


class TestCompose:
    def test_pass(self, client):
        body = {
            "verifier_ids": ["vr/tau2.policy.constraint_not_violated"],
            "completions": ["done"],
            "ground_truth": _POLICY_PASS["ground_truth"],
            "require_hard": True,
            "policy_mode": "fail_closed",
        }
        resp = client.post("/v1/compose", json=body)
        assert resp.status_code == 200
        assert resp.json()["results"][0]["verdict"] == "PASS"

    def test_hard_gate(self, client):
        body = {
            "verifier_ids": ["vr/tau2.policy.constraint_not_violated"],
            "completions": ["done"],
            "ground_truth": _POLICY_FAIL["ground_truth"],
            "require_hard": True,
            "policy_mode": "fail_closed",
        }
        resp = client.post("/v1/compose", json=body)
        assert resp.status_code == 200
        r = resp.json()["results"][0]
        assert r["verdict"] == "FAIL"
        assert r["score"] == 0.0

    def test_bad_verifier_id(self, client):
        body = {
            "verifier_ids": ["vr/nonexistent"],
            "completions": ["done"],
            "ground_truth": _POLICY_PASS["ground_truth"],
        }
        resp = client.post("/v1/compose", json=body)
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# GET /verifiers
# ══════════════════════════════════════════════════════════════════════════════


class TestVerifiers:
    def test_list(self, client):
        resp = client.get("/v1/verifiers")
        assert resp.status_code == 200
        ids = resp.json()["verifiers"]
        assert isinstance(ids, list)
        assert len(ids) >= 15  # 15+ registered verifiers

    def test_contains_known_id(self, client):
        resp = client.get("/v1/verifiers")
        ids = resp.json()["verifiers"]
        assert "vr/tau2.policy.constraint_not_violated" in ids


# ══════════════════════════════════════════════════════════════════════════════
# POST /export
# ══════════════════════════════════════════════════════════════════════════════


class TestExport:
    def test_returns_jsonl(self, client):
        resp = client.post("/v1/export", json=_POLICY_PASS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert len(data["lines"]) == 1
        line = json.loads(data["lines"][0])
        assert line["verdict"] == "PASS"
        assert "score" in line

    def test_with_extra(self, client):
        body = {**_POLICY_PASS, "extra": {"experiment": "test"}}
        resp = client.post("/v1/export", json=body)
        assert resp.status_code == 200
        line = json.loads(resp.json()["lines"][0])
        assert line["experiment"] == "test"
