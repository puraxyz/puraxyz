"""Tests for the GEM adapter."""

from __future__ import annotations

import pytest

from vrdev.adapters.gem import GEMRewardWrapper
from vrdev.core.types import Tier
from vrdev.tasks.tau2.policy import ConstraintNotViolatedVerifier


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def verifier():
    return ConstraintNotViolatedVerifier()


@pytest.fixture
def wrapper(verifier):
    return GEMRewardWrapper(verifier)


@pytest.fixture
def gt_pass():
    return {
        "policies": [
            {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
        ],
        "actions": [{"type": "buy", "amount": 50}],
    }


@pytest.fixture
def gt_fail():
    return {
        "policies": [
            {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
        ],
        "actions": [{"type": "buy", "amount": 200}],
    }


# ── Tests ────────────────────────────────────────────────────────────────────


class TestGEMRewardWrapper:
    def test_compute_reward_pass(self, wrapper, gt_pass):
        result = wrapper.compute_reward("done", gt_pass)
        assert "score" in result
        assert "metadata" in result
        assert result["score"] == 1.0
        assert result["metadata"]["verdict"] == "PASS"
        assert result["metadata"]["passed"] is True

    def test_compute_reward_fail(self, wrapper, gt_fail):
        result = wrapper.compute_reward("done", gt_fail)
        assert result["score"] == 0.0
        assert result["metadata"]["verdict"] == "FAIL"
        assert result["metadata"]["passed"] is False

    def test_metadata_structure(self, wrapper, gt_pass):
        result = wrapper.compute_reward("done", gt_pass)
        meta = result["metadata"]
        assert "verdict" in meta
        assert "tier" in meta
        assert "breakdown" in meta
        assert "evidence" in meta
        assert "artifact_hash" in meta

    def test_compute_batch_rewards(self, wrapper, gt_pass):
        results = wrapper.compute_batch_rewards(["a", "b", "c"], gt_pass)
        assert len(results) == 3
        for r in results:
            assert "score" in r
            assert "metadata" in r
            assert r["score"] == 1.0

    def test_compute_batch_mixed(self, wrapper):
        # Can't easily get mixed results from policy verifier since
        # ground_truth applies to all, but verify shape
        gt = {
            "policies": [
                {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
            ],
            "actions": [{"type": "buy", "amount": 50}],
        }
        results = wrapper.compute_batch_rewards(["x", "y"], gt)
        assert len(results) == 2

    def test_empty_results(self):
        """Verifier that returns empty results should return empty reward."""
        class EmptyVerifier:
            name = "empty"
            tier = Tier.HARD
            version = "0.1.0"
            def verify(self, input_data):
                return []

        w = GEMRewardWrapper(EmptyVerifier())
        result = w.compute_reward("test", {})
        assert result == {"score": 0.0, "metadata": {}}

    def test_context_forwarded(self, verifier):
        w = GEMRewardWrapper(verifier)
        gt = {
            "policies": [
                {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
            ],
            "actions": [{"type": "buy", "amount": 50}],
        }
        result = w.compute_reward("done", gt, context={"extra": "data"})
        assert result["score"] == 1.0
