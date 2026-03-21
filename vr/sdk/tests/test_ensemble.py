"""Tests for EnsembleVerifier (Phase C4)."""

from __future__ import annotations

import pytest

from vrdev.core.base import BaseVerifier
from vrdev.core.ensemble import EnsembleVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


# ── Deterministic stub verifier ──────────────────────────────────────────────


class StubVerifier(BaseVerifier):
    """Always returns a fixed verdict/score."""

    name = "stub"
    tier = Tier.HARD
    version = "0.1.0"

    def __init__(self, verdict: Verdict = Verdict.PASS, score: float = 1.0,
                 repair_hints: list[str] | None = None, retryable: bool = False):
        self._verdict = verdict
        self._score = score
        self._hints = repair_hints or []
        self._retryable = retryable

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        results = []
        for _ in input_data.completions:
            results.append(self._make_result(
                self._verdict, self._score, {}, {},
                input_data,
                repair_hints=self._hints,
                retryable=self._retryable,
            ))
        return results


# Counter to alternate verdicts
_call_count = 0


class AlternatingVerifier(BaseVerifier):
    """Alternates between PASS and FAIL across instances."""

    name = "alternating"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        global _call_count
        _call_count += 1
        v = Verdict.PASS if _call_count % 2 == 1 else Verdict.FAIL
        s = 1.0 if v == Verdict.PASS else 0.0
        hints = ["fix this"] if v == Verdict.FAIL else []
        return [self._make_result(v, s, {}, {}, input_data, repair_hints=hints)
                for _ in input_data.completions]


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def inp() -> VerifierInput:
    return VerifierInput(completions=["test"], ground_truth={})


@pytest.fixture(autouse=True)
def reset_counter():
    global _call_count
    _call_count = 0
    yield


# ── Strategy tests ───────────────────────────────────────────────────────────


class TestMajorityStrategy:
    def test_all_pass(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS, 1.0),
            num_instances=3,
            strategy="majority",
        )
        results = ens.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["consensus_ratio"] == 1.0
        assert results[0].repair_hints == []

    def test_all_fail(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.FAIL, 0.0, ["broken"]),
            num_instances=3,
            strategy="majority",
        )
        results = ens.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert "broken" in results[0].repair_hints

    def test_two_of_three_pass(self, inp):
        """2/3 pass → consensus > 0.66 → PASS."""
        ens = EnsembleVerifier(
            lambda: AlternatingVerifier(),  # PASS, FAIL, PASS
            num_instances=3,
            strategy="majority",
            consensus_threshold=0.66,
        )
        results = ens.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["pass_count"] == 2.0
        assert results[0].breakdown["fail_count"] == 1.0

    def test_one_of_three_pass(self, inp):
        """1/3 pass → consensus < 0.66 → FAIL."""
        ens = EnsembleVerifier(
            lambda: AlternatingVerifier(),  # PASS, FAIL, PASS but we need 1/3
            num_instances=2,
            strategy="majority",
            consensus_threshold=0.66,
        )
        # PASS, FAIL → 50% < 66% → FAIL
        results = ens.verify(inp)
        assert results[0].verdict == Verdict.FAIL


class TestUnanimousStrategy:
    def test_all_pass(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS),
            num_instances=3,
            strategy="unanimous",
        )
        assert ens.verify(inp)[0].verdict == Verdict.PASS

    def test_one_fail_blocks(self, inp):
        ens = EnsembleVerifier(
            lambda: AlternatingVerifier(),
            num_instances=3,
            strategy="unanimous",
        )
        assert ens.verify(inp)[0].verdict == Verdict.FAIL


class TestAnyPassStrategy:
    def test_one_pass_enough(self, inp):
        ens = EnsembleVerifier(
            lambda: AlternatingVerifier(),
            num_instances=2,
            strategy="any_pass",
        )
        assert ens.verify(inp)[0].verdict == Verdict.PASS

    def test_all_fail(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.FAIL),
            num_instances=3,
            strategy="any_pass",
        )
        assert ens.verify(inp)[0].verdict == Verdict.FAIL


class TestWeightedStrategy:
    def test_high_scores(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS, 0.8),
            num_instances=3,
            strategy="weighted",
        )
        results = ens.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 0.8

    def test_low_scores(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.FAIL, 0.2),
            num_instances=3,
            strategy="weighted",
        )
        assert ens.verify(inp)[0].verdict == Verdict.FAIL


# ── Edge cases ───────────────────────────────────────────────────────────────


class TestEnsembleEdgeCases:
    def test_invalid_strategy(self):
        with pytest.raises(ValueError, match="strategy must be"):
            EnsembleVerifier(lambda: StubVerifier(), strategy="invalid")

    def test_single_instance(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS),
            num_instances=1,
            strategy="majority",
        )
        results = ens.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS

    def test_name_derived_from_factory(self):
        ens = EnsembleVerifier(lambda: StubVerifier())
        assert ens.name == "ensemble/stub"

    def test_multiple_completions(self, inp):
        inp2 = VerifierInput(completions=["a", "b", "c"], ground_truth={})
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS),
            num_instances=3,
            strategy="majority",
        )
        results = ens.verify(inp2)
        assert len(results) == 3
        assert all(r.verdict == Verdict.PASS for r in results)

    def test_repair_hints_deduped(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.FAIL, 0.0, ["same hint", "same hint"]),
            num_instances=2,
            strategy="majority",
        )
        results = ens.verify(inp)
        # "same hint" appears in source twice per instance, but deduped in ensemble
        assert results[0].repair_hints.count("same hint") == 1

    def test_retryable_propagated(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.FAIL, 0.0, retryable=True),
            num_instances=2,
            strategy="majority",
        )
        assert ens.verify(inp)[0].retryable is True

    def test_evidence_contains_votes(self, inp):
        ens = EnsembleVerifier(
            lambda: StubVerifier(Verdict.PASS),
            num_instances=3,
            strategy="majority",
        )
        r = ens.verify(inp)[0]
        assert "ensemble_votes" in r.evidence
        assert len(r.evidence["ensemble_votes"]) == 3
        assert r.evidence["ensemble_strategy"] == "majority"
