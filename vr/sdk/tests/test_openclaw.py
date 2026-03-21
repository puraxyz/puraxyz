"""Tests for adapters/openclaw.py - OpenClaw agent integration.

Covers run_verifier, compose_chain, verify_task (including error fallback),
and explain_failure for all four verdict types.
"""

from __future__ import annotations


from vrdev.adapters.openclaw import (
    compose_chain,
    explain_failure,
    run_verifier,
    verify_task,
)
from vrdev.core.types import (
    AttackResistance,
    PolicyMode,
    Provenance,
    ResultMetadata,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _policy_input(*, pass_: bool = True) -> VerifierInput:
    """Policy input that passes or fails depending on *pass_*."""
    policies = [
        {"rule_id": "max_amount", "field": "amount", "operator": "lte", "value": 100},
    ]
    actions = [{"type": "refund", "amount": 50 if pass_ else 200}]
    return VerifierInput(
        completions=["done"],
        ground_truth={"policies": policies, "actions": actions},
    )


def _make_result(
    verdict: Verdict,
    score: float = 1.0,
    *,
    hard_gate_failed: bool = False,
    breakdown: dict[str, float] | None = None,
) -> VerificationResult:
    """Build a minimal VerificationResult for explain_failure tests."""
    return VerificationResult(
        verdict=verdict,
        score=score,
        tier=Tier.HARD,
        breakdown=breakdown or {},
        evidence={"detail": "test"},
        provenance=Provenance(verifier_pkg="test@0.1", source_citation="test"),
        attack_resistance=AttackResistance(),
        metadata=ResultMetadata(hard_gate_failed=hard_gate_failed),
    )


# ══════════════════════════════════════════════════════════════════════════════
# run_verifier
# ══════════════════════════════════════════════════════════════════════════════


class TestRunVerifier:
    VID = "vr/tau2.policy.constraint_not_violated"

    def test_pass(self):
        results = run_verifier(self.VID, _policy_input(pass_=True))
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_fail(self):
        results = run_verifier(self.VID, _policy_input(pass_=False))
        assert len(results) == 1
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["violations_count"] == 1


# ══════════════════════════════════════════════════════════════════════════════
# compose_chain
# ══════════════════════════════════════════════════════════════════════════════


class TestComposeChain:
    VID = "vr/tau2.policy.constraint_not_violated"

    def test_composed_pass(self):
        results = compose_chain([self.VID, self.VID], _policy_input(pass_=True))
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS

    def test_composed_hard_gate(self):
        results = compose_chain(
            [self.VID],
            _policy_input(pass_=False),
            require_hard=True,
            policy_mode=PolicyMode.FAIL_CLOSED,
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True


# ══════════════════════════════════════════════════════════════════════════════
# verify_task
# ══════════════════════════════════════════════════════════════════════════════


class TestVerifyTask:
    VID = "vr/tau2.policy.constraint_not_violated"

    def test_specific_ids(self):
        results = verify_task(_policy_input(pass_=True), verifier_ids=[self.VID])
        assert self.VID in results
        assert results[self.VID][0].verdict == Verdict.PASS

    def test_error_fallback_for_bad_id(self):
        """Non-existent verifier ID produces ERROR, not an exception."""
        results = verify_task(
            _policy_input(),
            verifier_ids=["vr/nonexistent.verifier"],
        )
        assert "vr/nonexistent.verifier" in results
        assert results["vr/nonexistent.verifier"][0].verdict == Verdict.ERROR


# ══════════════════════════════════════════════════════════════════════════════
# explain_failure
# ══════════════════════════════════════════════════════════════════════════════


class TestExplainFailure:
    def test_pass_no_action_needed(self):
        exp = explain_failure(_make_result(Verdict.PASS))
        assert exp["likely_cause"] is None
        assert exp["suggested_action"] is None
        assert "passed" in exp["message"].lower()

    def test_fail_with_breakdown(self):
        result = _make_result(Verdict.FAIL, 0.3, breakdown={"accuracy": 0.3})
        exp = explain_failure(result)
        assert "FAILED" in exp["message"]
        assert exp["suggested_action"] is not None
        assert exp["relevant_context"]["score"] == 0.3
        assert "accuracy" in str(exp["likely_cause"])

    def test_fail_hard_gate(self):
        result = _make_result(Verdict.FAIL, 0.0, hard_gate_failed=True)
        exp = explain_failure(result)
        assert "Hard gate" in exp["message"]
        assert "hard" in exp["suggested_action"].lower()

    def test_error_infrastructure(self):
        exp = explain_failure(_make_result(Verdict.ERROR, 0.0))
        assert "infrastructure" in exp["likely_cause"].lower()
        assert "configuration" in exp["suggested_action"].lower()

    def test_unverifiable(self):
        exp = explain_failure(_make_result(Verdict.UNVERIFIABLE, 0.0))
        assert "ambiguous" in exp["likely_cause"].lower()
        assert "retry" in exp["suggested_action"].lower()
