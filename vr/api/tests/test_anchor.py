"""Tests for Merkle anchor batch pipeline - DB round-trip without on-chain."""

from __future__ import annotations

import asyncio
import hashlib


from vr_api.db import (
    close_db,
    get_anchor,
    init_db,
    list_evidence_by_batch,
    store_evidence,
)
from vr_api.anchor import anchor_batch
from vr_api.merkle import build_merkle_tree, get_inclusion_proof, verify_inclusion


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


class TestAnchorPipeline:
    """Full anchor pipeline: store evidence → batch → verify proof."""

    def _run(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    def test_anchor_batch_no_evidence(self):
        """anchor_batch returns None when no un-anchored evidence exists."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            result = self._run(anchor_batch())
            assert result is None
        finally:
            self._run(close_db())

    def test_anchor_batch_stores_record(self):
        """anchor_batch creates an AnchorRecord with correct leaf_count."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            # Seed 3 evidence records
            for i in range(3):
                self._run(store_evidence(
                    artifact_hash=f"sha256:{_sha256(str(i))}",
                    verifier_id="vr/test",
                    verdict="PASS",
                    score=1.0,
                    evidence_json="{}",
                ))

            result = self._run(anchor_batch())
            assert result is not None
            assert result["leaf_count"] == 3
            assert result["merkle_root"]
            assert result["tx_hash"] is None  # no private key configured
            assert result["chain"] == "base-sepolia"

            # Anchor record persisted
            anchor = self._run(get_anchor(result["batch_id"]))
            assert anchor is not None
            assert anchor.merkle_root == result["merkle_root"]
        finally:
            self._run(close_db())

    def test_anchor_batch_updates_evidence_batch_id(self):
        """After anchoring, evidence records have batch_id set."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            hashes = []
            for i in range(4):
                h = f"sha256:{_sha256(str(i))}"
                hashes.append(h)
                self._run(store_evidence(
                    artifact_hash=h,
                    verifier_id="vr/test",
                    verdict="PASS",
                    score=1.0,
                    evidence_json="{}",
                ))

            result = self._run(anchor_batch())
            batch_id = result["batch_id"]

            # All evidence should now have this batch_id
            batch_evidence = self._run(list_evidence_by_batch(batch_id))
            assert len(batch_evidence) == 4
            for rec in batch_evidence:
                assert rec.batch_id == batch_id
        finally:
            self._run(close_db())

    def test_anchor_batch_idempotent(self):
        """Second anchor_batch with no new evidence returns None."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(store_evidence(
                artifact_hash=f"sha256:{_sha256('x')}",
                verifier_id="vr/test",
                verdict="PASS",
                score=1.0,
                evidence_json="{}",
            ))

            r1 = self._run(anchor_batch())
            assert r1 is not None

            # No new evidence → skip
            r2 = self._run(anchor_batch())
            assert r2 is None
        finally:
            self._run(close_db())

    def test_anchor_batch_incremental(self):
        """New evidence after first anchor gets a separate batch."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            self._run(store_evidence(
                artifact_hash=f"sha256:{_sha256('a')}",
                verifier_id="vr/test",
                verdict="PASS",
                score=1.0,
                evidence_json="{}",
            ))
            r1 = self._run(anchor_batch())
            assert r1 is not None

            # Add more evidence
            self._run(store_evidence(
                artifact_hash=f"sha256:{_sha256('b')}",
                verifier_id="vr/test",
                verdict="PASS",
                score=1.0,
                evidence_json="{}",
            ))
            r2 = self._run(anchor_batch())
            assert r2 is not None
            assert r2["batch_id"] != r1["batch_id"]
            assert r2["merkle_root"] != r1["merkle_root"]
        finally:
            self._run(close_db())

    def test_proof_roundtrip(self):
        """Build tree from batch → generate proof → verify inclusion."""
        self._run(init_db("sqlite+aiosqlite:///:memory:"))
        try:
            hashes = []
            for i in range(5):
                h = f"sha256:{_sha256(str(i))}"
                hashes.append(h)
                self._run(store_evidence(
                    artifact_hash=h,
                    verifier_id="vr/test",
                    verdict="PASS",
                    score=1.0,
                    evidence_json="{}",
                ))

            result = self._run(anchor_batch())
            batch_id = result["batch_id"]

            # Rebuild tree from batch
            batch_evidence = self._run(list_evidence_by_batch(batch_id))
            batch_hashes = [e.artifact_hash.removeprefix("sha256:") for e in batch_evidence]
            tree = build_merkle_tree(batch_hashes)

            # Verify each leaf
            for h in batch_hashes:
                proof = get_inclusion_proof(tree, h)
                assert verify_inclusion(result["merkle_root"], h, proof)
        finally:
            self._run(close_db())
