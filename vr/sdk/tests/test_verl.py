"""Tests for vrdev.adapters.verl - VrdevRewardWrapper adapter.

Uses FileCreatedVerifier with tmp_path and deterministic stub verifiers
to test the veRL reward wrapper without external dependencies.
"""

from __future__ import annotations

from pathlib import Path


from vrdev.adapters.verl import VrdevRewardWrapper
from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, VerificationResult, Verdict, VerifierInput
from vrdev.tasks.filesystem.file_created import FileCreatedVerifier


# ── Helpers ──────────────────────────────────────────────────────────────────


class AlwaysPassVerifier(BaseVerifier):
    name = "test.always_pass"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.PASS, 1.0, {"pass": 1.0}, {"detail": "ok"}, input_data,
            )
            for _ in input_data.completions
        ]


class AlwaysFailVerifier(BaseVerifier):
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


class EmptyResultVerifier(BaseVerifier):
    """Returns an empty result list (edge case)."""
    name = "test.empty"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return []


# ══════════════════════════════════════════════════════════════════════════════
# compute_score tests
# ══════════════════════════════════════════════════════════════════════════════


class TestComputeScore:
    """VrdevRewardWrapper.compute_score returns a single float."""

    def test_pass_returns_one(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        score = w.compute_score("hello", {})
        assert score == 1.0

    def test_fail_returns_zero(self):
        w = VrdevRewardWrapper(AlwaysFailVerifier())
        score = w.compute_score("hello", {})
        assert score == 0.0

    def test_empty_results_returns_zero(self):
        w = VrdevRewardWrapper(EmptyResultVerifier())
        score = w.compute_score("hello", {})
        assert score == 0.0

    def test_score_is_float(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        score = w.compute_score("hello", {})
        assert isinstance(score, float)

    def test_ground_truth_forwarded(self, tmp_path: Path):
        target = tmp_path / "result.txt"
        target.write_text("done")
        w = VrdevRewardWrapper(FileCreatedVerifier())
        score = w.compute_score(
            "created file",
            {"expected_path": str(target)},
        )
        assert score == 1.0

    def test_file_missing_returns_zero(self, tmp_path: Path):
        w = VrdevRewardWrapper(FileCreatedVerifier())
        score = w.compute_score(
            "created file",
            {"expected_path": str(tmp_path / "nonexistent.txt")},
        )
        assert score == 0.0

    def test_context_kwarg_accepted(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        score = w.compute_score("hello", {}, context={"key": "val"})
        assert score == 1.0


# ══════════════════════════════════════════════════════════════════════════════
# compute_result tests
# ══════════════════════════════════════════════════════════════════════════════


class TestComputeResult:
    """VrdevRewardWrapper.compute_result returns a full dict."""

    def test_returns_dict(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert isinstance(result, dict)

    def test_dict_has_verdict(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert result["verdict"] == "PASS"

    def test_dict_has_score(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert result["score"] == 1.0

    def test_dict_has_breakdown(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert "breakdown" in result
        assert result["breakdown"]["pass"] == 1.0

    def test_dict_has_evidence(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert result["evidence"]["detail"] == "ok"

    def test_fail_result_dict(self):
        w = VrdevRewardWrapper(AlwaysFailVerifier())
        result = w.compute_result("hello", {})
        assert result["verdict"] == "FAIL"
        assert result["score"] == 0.0

    def test_empty_results_returns_empty_dict(self):
        w = VrdevRewardWrapper(EmptyResultVerifier())
        result = w.compute_result("hello", {})
        assert result == {}

    def test_dict_has_provenance(self):
        w = VrdevRewardWrapper(AlwaysPassVerifier())
        result = w.compute_result("hello", {})
        assert "provenance" in result
        assert "test.always_pass" in result["provenance"]["verifier_pkg"]
