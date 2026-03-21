"""Tests for vrdev.adapters.trl - to_trl_reward_func adapter.

Uses FileCreatedVerifier with tmp_path to test the TRL reward function
adapter without any external dependencies.
"""

from __future__ import annotations

from pathlib import Path


from vrdev.adapters.trl import to_trl_reward_func
from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, VerificationResult, Verdict, VerifierInput
from vrdev.tasks.filesystem.file_created import FileCreatedVerifier


# ── Helpers ──────────────────────────────────────────────────────────────────


class AlwaysPassVerifier(BaseVerifier):
    """Deterministic verifier that always returns PASS with score 1.0."""

    name = "test.always_pass"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.PASS, 1.0, {"pass": 1.0}, {}, input_data,
            )
            for _ in input_data.completions
        ]


class AlwaysFailVerifier(BaseVerifier):
    """Deterministic verifier that always returns FAIL with score 0.0."""

    name = "test.always_fail"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.FAIL, 0.0, {"pass": 0.0}, {}, input_data,
            )
            for _ in input_data.completions
        ]


class PartialScoreVerifier(BaseVerifier):
    """Returns a score equal to the length of completion / 100, capped at 1.0."""

    name = "test.partial_score"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        results = []
        for c in input_data.completions:
            score = min(len(c) / 100.0, 1.0)
            results.append(self._make_result(
                Verdict.PASS if score >= 0.5 else Verdict.FAIL,
                round(score, 4), {"ratio": score}, {}, input_data,
            ))
        return results


# ══════════════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestTrlRewardFuncBasic:
    """Basic return types and invariants."""

    def test_returns_list_of_floats(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["hello"])
        assert isinstance(result, list)
        assert all(isinstance(x, float) for x in result)

    def test_one_completion_one_score(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["hello world"])
        assert len(result) == 1

    def test_multiple_completions(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["a", "b", "c"])
        assert len(result) == 3

    def test_pass_verifier_returns_ones(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["x", "y"])
        assert all(s == 1.0 for s in result)

    def test_fail_verifier_returns_zeros(self):
        fn = to_trl_reward_func(AlwaysFailVerifier())
        result = fn(["x", "y"])
        assert all(s == 0.0 for s in result)


class TestTrlRewardFuncScores:
    """Score fidelity - adapter preserves verifier scores."""

    def test_partial_scores_preserved(self):
        fn = to_trl_reward_func(PartialScoreVerifier())
        # 10 chars → 0.1, 50 chars → 0.5, 100 chars → 1.0
        result = fn(["a" * 10, "b" * 50, "c" * 100])
        assert len(result) == 3
        assert abs(result[0] - 0.1) < 0.01
        assert abs(result[1] - 0.5) < 0.01
        assert abs(result[2] - 1.0) < 0.01

    def test_scores_in_valid_range(self):
        fn = to_trl_reward_func(PartialScoreVerifier())
        result = fn(["x" * i for i in range(0, 200, 20)])
        assert all(0.0 <= s <= 1.0 for s in result)


class TestTrlRewardFuncKwargs:
    """Keyword arguments are forwarded properly."""

    def test_ground_truth_forwarded(self, tmp_path: Path):
        target = tmp_path / "output.txt"
        target.write_text("content")
        v = FileCreatedVerifier()
        fn = to_trl_reward_func(v)
        result = fn(
            ["created file"],
            ground_truth={"expected_path": str(target)},
        )
        assert len(result) == 1
        assert result[0] == 1.0

    def test_ground_truth_missing_defaults_to_empty(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["hello"])
        assert result == [1.0]

    def test_non_dict_ground_truth_ignored(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["hello"], ground_truth="not a dict")
        assert result == [1.0]

    def test_context_forwarded(self):
        fn = to_trl_reward_func(AlwaysPassVerifier())
        result = fn(["hello"], context={"key": "value"})
        assert result == [1.0]
