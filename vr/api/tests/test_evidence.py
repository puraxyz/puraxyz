"""Tests for evidence persistence - store and retrieve via GET /evidence/{hash}."""

from __future__ import annotations

import asyncio
import json


from vr_api.db import (
    cleanup_expired,
    close_db,
    get_evidence,
    init_db,
    list_evidence,
    store_evidence,
)

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


# ══════════════════════════════════════════════════════════════════════════════
# Database CRUD unit tests
# ══════════════════════════════════════════════════════════════════════════════


class TestDbCrud:
    def _run(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    def test_store_and_retrieve(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                store_evidence(
                    artifact_hash="sha256:abc123",
                    verifier_id="vr/test",
                    verdict="PASS",
                    score=1.0,
                    evidence_json='{"detail": "ok"}',
                )
            )
            record = self._run(get_evidence("sha256:abc123"))
            assert record is not None
            assert record.verifier_id == "vr/test"
            assert record.verdict == "PASS"
            assert record.score == 1.0
            assert json.loads(record.evidence_json) == {"detail": "ok"}
        finally:
            self._run(close_db())

    def test_retrieve_nonexistent(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            record = self._run(get_evidence("sha256:nope"))
            assert record is None
        finally:
            self._run(close_db())

    def test_duplicate_insert_idempotent(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                store_evidence("sha256:dup", "vr/a", "PASS", 1.0, "{}")
            )
            self._run(
                store_evidence("sha256:dup", "vr/a", "FAIL", 0.0, '{"new": true}')
            )
            record = self._run(get_evidence("sha256:dup"))
            # First insert wins (append-only)
            assert record.verdict == "PASS"
        finally:
            self._run(close_db())

    def test_list_evidence_filtered(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(store_evidence("sha256:1", "vr/a", "PASS", 1.0, "{}"))
            self._run(store_evidence("sha256:2", "vr/b", "FAIL", 0.0, "{}"))
            self._run(store_evidence("sha256:3", "vr/a", "PASS", 0.9, "{}"))
            records = self._run(list_evidence(verifier_id="vr/a"))
            assert len(records) == 2
            assert all(r.verifier_id == "vr/a" for r in records)
        finally:
            self._run(close_db())

    def test_list_evidence_limit(self):
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            for i in range(5):
                self._run(
                    store_evidence(f"sha256:{i}", "vr/x", "PASS", 1.0, "{}")
                )
            records = self._run(list_evidence(limit=3))
            assert len(records) == 3
        finally:
            self._run(close_db())

    def test_cleanup_expired_deletes_old(self):
        """cleanup_expired removes records older than TTL."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                store_evidence("sha256:old1", "vr/a", "PASS", 1.0, "{}")
            )
            # Manually backdate the record
            from datetime import timedelta
            from vr_api.db import EvidenceRecord, get_session_factory

            async def _backdate():
                factory = get_session_factory()
                async with factory() as session:
                    rec = await session.get(EvidenceRecord, "sha256:old1")
                    rec.created_at = rec.created_at - timedelta(days=100)
                    await session.commit()

            self._run(_backdate())

            # Insert a fresh record
            self._run(
                store_evidence("sha256:new1", "vr/a", "PASS", 1.0, "{}")
            )

            deleted = self._run(cleanup_expired(ttl_days=90))
            assert deleted == 1

            # Old record gone, new one remains
            assert self._run(get_evidence("sha256:old1")) is None
            assert self._run(get_evidence("sha256:new1")) is not None
        finally:
            self._run(close_db())

    def test_cleanup_expired_zero_ttl_noop(self):
        """ttl_days=0 disables cleanup."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(
                store_evidence("sha256:keep", "vr/a", "PASS", 1.0, "{}")
            )
            deleted = self._run(cleanup_expired(ttl_days=0))
            assert deleted == 0
        finally:
            self._run(close_db())


# ══════════════════════════════════════════════════════════════════════════════
# API endpoint tests
# ══════════════════════════════════════════════════════════════════════════════


class TestEvidenceEndpoint:
    def test_verify_stores_evidence(self, client):
        """POST /v1/verify should auto-store evidence in the DB."""
        resp = client.post("/v1/verify", json=_POLICY_PASS)
        assert resp.status_code == 200
        artifact_hash = resp.json()["results"][0]["artifact_hash"]
        assert artifact_hash  # non-empty

        # Retrieve it
        resp2 = client.get(f"/v1/evidence/{artifact_hash}")
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["artifact_hash"] == artifact_hash
        assert data["verdict"] == "PASS"
        assert data["verifier_id"] == "vr/tau2.policy.constraint_not_violated"
        assert "created_at" in data

    def test_evidence_not_found(self, client):
        resp = client.get("/v1/evidence/sha256:nonexistent")
        assert resp.status_code == 404

    def test_evidence_contains_evidence_json(self, client):
        resp = client.post("/v1/verify", json=_POLICY_PASS)
        artifact_hash = resp.json()["results"][0]["artifact_hash"]
        resp2 = client.get(f"/v1/evidence/{artifact_hash}")
        data = resp2.json()
        assert isinstance(data["evidence"], dict)
        assert "violations_count" in data["evidence"]

    def test_multiple_verifications_stored(self, client):
        """Each completion gets its own evidence record."""
        body = {**_POLICY_PASS, "completions": ["a", "b"]}
        resp = client.post("/v1/verify", json=body)
        hashes = [r["artifact_hash"] for r in resp.json()["results"]]
        assert len(hashes) == 2
        for h in hashes:
            if h:  # may be empty if hashing was skipped
                resp2 = client.get(f"/v1/evidence/{h}")
                assert resp2.status_code == 200
