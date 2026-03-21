"""Tests for the composition engine.

Covers all verdict combinations and policy_mode behavior as required
by Phase 0 Step 2: 15+ tests for the composition engine.
"""


from vrdev.core.base import BaseVerifier
from vrdev.core.compose import compose
from vrdev.core.types import (
    PolicyMode,
    Provenance,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


# ── Test helpers ─────────────────────────────────────────────────────────────


class StubVerifier(BaseVerifier):
    """A test verifier that returns preconfigured results."""

    def __init__(
        self,
        name: str,
        tier: Tier,
        verdict: Verdict,
        score: float,
        evidence: dict | None = None,
        breakdown: dict | None = None,
    ):
        self.name = name
        self.tier = tier
        self.version = "0.1.0"
        self._verdict = verdict
        self._score = score
        self._evidence = evidence or {}
        self._breakdown = breakdown or {}

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        results = []
        for _ in input_data.completions:
            results.append(
                VerificationResult(
                    verdict=self._verdict,
                    score=self._score,
                    tier=self.tier,
                    breakdown=self._breakdown,
                    evidence=self._evidence,
                    provenance=Provenance(
                        verifier_pkg=self.pkg_id,
                        source_citation="test",
                    ),
                )
            )
        return results


def make_input(completions: list[str] | None = None) -> VerifierInput:
    return VerifierInput(
        completions=completions or ["test completion"],
        ground_truth={"key": "value"},
    )


# ── Basic composition ────────────────────────────────────────────────────────


class TestCompositionBasic:
    def test_single_verifier_pass(self):
        v = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        composed = compose([v])
        results = composed.verify(make_input())
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_single_verifier_fail(self):
        v = StubVerifier("a", Tier.HARD, Verdict.FAIL, 0.0)
        composed = compose([v])
        results = composed.verify(make_input())
        assert results[0].verdict == Verdict.FAIL
        assert results[0].score == 0.0

    def test_two_verifiers_average(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v2 = StubVerifier("b", Tier.HARD, Verdict.FAIL, 0.0)
        composed = compose([v1, v2])
        results = composed.verify(make_input())
        assert results[0].score == 0.5

    def test_multiple_completions(self):
        v = StubVerifier("a", Tier.HARD, Verdict.PASS, 0.8)
        composed = compose([v])
        results = composed.verify(make_input(["comp1", "comp2", "comp3"]))
        assert len(results) == 3
        for r in results:
            assert r.score == 0.8


# ── require_hard gating ──────────────────────────────────────────────────────


class TestRequireHard:
    def test_require_hard_pass_all(self):
        hard = StubVerifier("hard", Tier.HARD, Verdict.PASS, 1.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 0.8)
        composed = compose([hard, soft], require_hard=True)
        results = composed.verify(make_input())
        assert results[0].verdict == Verdict.PASS
        assert results[0].score > 0

    def test_require_hard_gate_triggers_on_fail(self):
        """If any HARD verifier returns FAIL and require_hard=True, score is 0.0."""
        hard = StubVerifier("hard", Tier.HARD, Verdict.FAIL, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose([hard, soft], require_hard=True)
        results = composed.verify(make_input())
        assert results[0].score == 0.0
        assert results[0].verdict == Verdict.FAIL
        assert results[0].metadata.hard_gate_failed is True

    def test_require_hard_does_not_affect_soft_only(self):
        """require_hard with only SOFT verifiers works normally."""
        soft1 = StubVerifier("soft1", Tier.SOFT, Verdict.PASS, 0.7)
        soft2 = StubVerifier("soft2", Tier.SOFT, Verdict.PASS, 0.9)
        composed = compose([soft1, soft2], require_hard=True)
        results = composed.verify(make_input())
        assert results[0].score == 0.8  # Average
        assert results[0].metadata.hard_gate_failed is False

    def test_require_hard_false_allows_hard_fail(self):
        """Without require_hard, a HARD failure contributes but doesn't gate."""
        hard = StubVerifier("hard", Tier.HARD, Verdict.FAIL, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose([hard, soft], require_hard=False)
        results = composed.verify(make_input())
        assert results[0].score == 0.5  # Average of 0.0 and 1.0
        assert results[0].metadata.hard_gate_failed is False


# ── Policy mode ──────────────────────────────────────────────────────────────


class TestPolicyMode:
    def test_fail_closed_error_triggers_hard_gate(self):
        """In fail_closed mode, ERROR verdict triggers hard gate if require_hard=True."""
        hard_err = StubVerifier("hard", Tier.HARD, Verdict.ERROR, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose(
            [hard_err, soft],
            require_hard=True,
            policy_mode=PolicyMode.FAIL_CLOSED,
        )
        results = composed.verify(make_input())
        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True

    def test_fail_closed_unverifiable_triggers_hard_gate(self):
        """In fail_closed mode, UNVERIFIABLE triggers hard gate."""
        hard_unv = StubVerifier("hard", Tier.HARD, Verdict.UNVERIFIABLE, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose(
            [hard_unv, soft],
            require_hard=True,
            policy_mode=PolicyMode.FAIL_CLOSED,
        )
        results = composed.verify(make_input())
        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True

    def test_fail_open_excludes_error_from_score(self):
        """In fail_open mode, ERROR results are excluded from score calculation."""
        hard_err = StubVerifier("hard", Tier.HARD, Verdict.ERROR, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 0.8)
        composed = compose(
            [hard_err, soft],
            require_hard=True,
            policy_mode=PolicyMode.FAIL_OPEN,
        )
        results = composed.verify(make_input())
        assert results[0].metadata.hard_gate_failed is False
        assert results[0].score == 0.8

    def test_fail_open_still_gates_on_hard_fail(self):
        """In fail_open mode, a genuine FAIL still triggers the hard gate."""
        hard_fail = StubVerifier("hard", Tier.HARD, Verdict.FAIL, 0.0)
        soft = StubVerifier("soft", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose(
            [hard_fail, soft],
            require_hard=True,
            policy_mode=PolicyMode.FAIL_OPEN,
        )
        results = composed.verify(make_input())
        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True


# ── Weights ──────────────────────────────────────────────────────────────────


class TestWeights:
    def test_custom_weights(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v2 = StubVerifier("b", Tier.HARD, Verdict.PASS, 0.0)
        composed = compose(
            [v1, v2],
            weights={"a@0.1.0": 3.0, "b@0.1.0": 1.0},
        )
        results = composed.verify(make_input())
        assert results[0].score == 0.75  # (1.0*3 + 0.0*1) / 4


# ── Tier inheritance ─────────────────────────────────────────────────────────


class TestTierInheritance:
    def test_all_hard_produces_hard(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v2 = StubVerifier("b", Tier.HARD, Verdict.PASS, 1.0)
        composed = compose([v1, v2])
        assert composed.tier == Tier.HARD

    def test_any_soft_produces_soft(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v2 = StubVerifier("b", Tier.SOFT, Verdict.PASS, 1.0)
        composed = compose([v1, v2])
        assert composed.tier == Tier.SOFT

    def test_any_agentic_produces_agentic(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v2 = StubVerifier("b", Tier.AGENTIC, Verdict.PASS, 1.0)
        composed = compose([v1, v2])
        assert composed.tier == Tier.AGENTIC


# ── Evidence and breakdown merging ───────────────────────────────────────────


class TestEvidenceMerging:
    def test_evidence_merged(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0, evidence={"check_a": "ok"})
        v2 = StubVerifier("b", Tier.HARD, Verdict.PASS, 1.0, evidence={"check_b": "ok"})
        composed = compose([v1, v2])
        results = composed.verify(make_input())
        assert "check_a" in results[0].evidence
        assert "check_b" in results[0].evidence

    def test_breakdown_prefixed(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0, breakdown={"x": 1.0})
        v2 = StubVerifier("b", Tier.HARD, Verdict.PASS, 1.0, breakdown={"y": 0.5})
        composed = compose([v1, v2])
        results = composed.verify(make_input())
        assert any("x" in k for k in results[0].breakdown)
        assert any("y" in k for k in results[0].breakdown)


# ── Hash integrity ───────────────────────────────────────────────────────────


class TestHashIntegrity:
    def test_composed_result_has_hashes(self):
        v = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        composed = compose([v])
        results = composed.verify(make_input())
        assert results[0].artifact_hash != ""
        assert results[0].input_hash != ""

    def test_artifact_hash_changes_with_score(self):
        v_pass = StubVerifier("a", Tier.HARD, Verdict.PASS, 1.0)
        v_fail = StubVerifier("a", Tier.HARD, Verdict.FAIL, 0.0)

        r1 = compose([v_pass]).verify(make_input())[0]
        r2 = compose([v_fail]).verify(make_input())[0]

        assert r1.artifact_hash != r2.artifact_hash


# ── Edge cases ───────────────────────────────────────────────────────────────


class TestEdgeCases:
    def test_empty_verifier_list(self):
        composed = compose([])
        results = composed.verify(make_input())
        assert len(results) == 1
        assert results[0].verdict == Verdict.UNVERIFIABLE

    def test_all_error_verdicts(self):
        v1 = StubVerifier("a", Tier.HARD, Verdict.ERROR, 0.0)
        v2 = StubVerifier("b", Tier.HARD, Verdict.ERROR, 0.0)
        composed = compose([v1, v2])
        results = composed.verify(make_input())
        assert results[0].verdict == Verdict.ERROR
