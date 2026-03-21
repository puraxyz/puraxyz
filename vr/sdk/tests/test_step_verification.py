"""Tests for step-level verification and trajectory hard-gating."""

from vrdev.core.base import BaseVerifier
from vrdev.core.compose import ComposedVerifier
from vrdev.core.types import (
    StepInput,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


class _AlwaysPass(BaseVerifier):
    def __init__(self, tier: Tier = Tier.HARD):
        self.name = "test.always_pass"
        self.tier = tier
        self.version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.PASS, 1.0, {}, {"check": "ok"}, input_data,
            )
            for _ in input_data.completions
        ]


class _AlwaysFail(BaseVerifier):
    def __init__(self, tier: Tier = Tier.HARD):
        self.name = "test.always_fail"
        self.tier = tier
        self.version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.FAIL, 0.0, {}, {"check": "failed"}, input_data,
            )
            for _ in input_data.completions
        ]


class _FailAtStep(BaseVerifier):
    """Fails on a specific step index."""
    def __init__(self, fail_step: int):
        self.name = "test.fail_at_step"
        self.tier = Tier.HARD
        self.version = "0.1.0"
        self._fail_step = fail_step

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        step_idx = (input_data.context or {}).get("step_index", 0)
        if step_idx == self._fail_step:
            return [
                self._make_result(
                    Verdict.FAIL, 0.0, {}, {"step": step_idx}, input_data,
                )
                for _ in input_data.completions
            ]
        return [
            self._make_result(
                Verdict.PASS, 1.0, {}, {"step": step_idx}, input_data,
            )
            for _ in input_data.completions
        ]


class TestVerifyStep:
    def test_default_delegates_to_verify(self):
        v = _AlwaysPass()
        step = StepInput(step_index=0, completions=["hello"], ground_truth={})
        results = v.verify_step(step)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].step_index == 0

    def test_step_index_set_on_results(self):
        v = _AlwaysPass()
        step = StepInput(step_index=5, completions=["a", "b"], ground_truth={})
        results = v.verify_step(step)
        assert all(r.step_index == 5 for r in results)

    def test_is_terminal_set_on_results(self):
        v = _AlwaysPass()
        step = StepInput(step_index=0, completions=["a"], is_terminal=True)
        results = v.verify_step(step)
        assert all(r.is_terminal is True for r in results)


class TestVerifyTrajectory:
    def test_all_pass(self):
        v = _AlwaysPass()
        composed = ComposedVerifier([v], require_hard=True)
        steps = [
            StepInput(step_index=0, completions=["step0"]),
            StepInput(step_index=1, completions=["step1"]),
            StepInput(step_index=2, completions=["step2"], is_terminal=True),
        ]
        results = composed.verify_trajectory(steps)
        assert len(results) == 3
        for step_results in results:
            assert step_results[0].verdict == Verdict.PASS

    def test_hard_gate_stops_early(self):
        fail_v = _FailAtStep(fail_step=1)
        composed = ComposedVerifier([fail_v], require_hard=True)
        steps = [
            StepInput(step_index=0, completions=["step0"]),
            StepInput(step_index=1, completions=["step1"]),
            StepInput(step_index=2, completions=["step2"]),
        ]
        results = composed.verify_trajectory(steps)
        # Should stop at step 1 (the failing step) - returns partial results
        assert len(results) == 2
        assert results[0][0].verdict == Verdict.PASS
        assert results[1][0].verdict == Verdict.FAIL

    def test_empty_trajectory(self):
        v = _AlwaysPass()
        composed = ComposedVerifier([v])
        results = composed.verify_trajectory([])
        assert results == []

    def test_no_hard_gate_continues(self):
        """Without require_hard, no early stopping."""
        fail_v = _FailAtStep(fail_step=1)
        composed = ComposedVerifier([fail_v], require_hard=False)
        steps = [
            StepInput(step_index=0, completions=["a"]),
            StepInput(step_index=1, completions=["b"]),
            StepInput(step_index=2, completions=["c"]),
        ]
        results = composed.verify_trajectory(steps)
        assert len(results) == 3

    def test_soft_verifier_no_gate(self):
        soft_fail = _AlwaysFail(tier=Tier.SOFT)
        composed = ComposedVerifier([soft_fail], require_hard=True)
        steps = [
            StepInput(step_index=0, completions=["a"]),
            StepInput(step_index=1, completions=["b"]),
        ]
        results = composed.verify_trajectory(steps)
        # SOFT failures don't trigger hard gate
        assert len(results) == 2
