"""Authentication tests for the vr-api service."""

from __future__ import annotations


class TestAuthDisabled:
    """When VR_API_KEYS is not set, all endpoints are accessible."""

    def test_verify_no_key_needed(self, client):
        resp = client.post(
            "/v1/verify",
            json={
                "verifier_id": "vr/tau2.policy.constraint_not_violated",
                "completions": ["done"],
                "ground_truth": {"policies": [], "actions": []},
            },
        )
        assert resp.status_code == 200

    def test_verifiers_no_key_needed(self, client):
        resp = client.get("/v1/verifiers")
        assert resp.status_code == 200


class TestAuthEnabled:
    """When VR_API_KEYS is set, a valid key is required."""

    def test_valid_key_accepted(self, authed_client):
        resp = authed_client.get(
            "/v1/verifiers", headers={"X-API-Key": "test-key-1"}
        )
        assert resp.status_code == 200

    def test_second_valid_key(self, authed_client):
        resp = authed_client.get(
            "/v1/verifiers", headers={"X-API-Key": "test-key-2"}
        )
        assert resp.status_code == 200

    def test_invalid_key_rejected(self, authed_client):
        resp = authed_client.get(
            "/v1/verifiers", headers={"X-API-Key": "bad-key"}
        )
        assert resp.status_code == 401

    def test_missing_key_rejected(self, authed_client):
        resp = authed_client.get("/v1/verifiers")
        assert resp.status_code == 401

    def test_health_bypasses_auth(self, authed_client):
        resp = authed_client.get("/health")
        assert resp.status_code == 200
