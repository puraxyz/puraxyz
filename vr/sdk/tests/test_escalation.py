"""Tests for ESCALATION policy mode and budget tracking."""

from vrdev.core.base import BaseVerifier
from vrdev.core.compose import ComposedVerifier
from vrdev.core.types import (
    PolicyMode,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


class _StubVerifier(BaseVerifier):
    def __init__(self, name: str, tier: Tier, verdict: Verdict):
        self.name = name
        self.tier = tier
        self.version = "0.1.0"
        self._verdict = verdict

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                self._verdict,
                1.0 if self._verdict == Verdict.PASS else 0.0,
                {"check": 1.0 if self._verdict == Verdict.PASS else 0.0},
                {"tier": self.tier.value},
                input_data,
            )
            for _ in input_data.completions
        ]


class TestEscalationMode:
    def test_hard_pass_skips_soft_and_agentic(self):
        hard = _StubVerifier("v.hard", Tier.HARD, Verdict.PASS)
        soft = _StubVerifier("v.soft", Tier.SOFT, Verdict.PASS)
        agentic = _StubVerifier("v.agentic", Tier.AGENTIC, Verdict.PASS)
        c = ComposedVerifier(
            [agentic, soft, hard],  # intentionally out of order
            policy_mode=PolicyMode.ESCALATION,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        # Only HARD verifier ran; SOFT and AGENTIC skipped
        # Composed result merges into one - check evidence tiers
        assert len(results) == 1
        assert results[0].evidence.get("tier") == "HARD"

    def test_hard_fail_escalates_to_soft(self):
        hard = _StubVerifier("v.hard", Tier.HARD, Verdict.FAIL)
        soft = _StubVerifier("v.soft", Tier.SOFT, Verdict.PASS)
        agentic = _StubVerifier("v.agentic", Tier.AGENTIC, Verdict.PASS)
        c = ComposedVerifier(
            [agentic, soft, hard],
            policy_mode=PolicyMode.ESCALATION,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        assert len(results) == 1
        breakdown_keys = list(results[0].breakdown.keys())
        # breakdown keys are "v.hard@0.1.0/check" etc.
        assert any("v.hard" in k for k in breakdown_keys)
        assert any("v.soft" in k for k in breakdown_keys)
        assert not any("v.agentic" in k for k in breakdown_keys)

    def test_all_fail_runs_all_tiers(self):
        hard = _StubVerifier("v.hard", Tier.HARD, Verdict.FAIL)
        soft = _StubVerifier("v.soft", Tier.SOFT, Verdict.FAIL)
        agentic = _StubVerifier("v.agentic", Tier.AGENTIC, Verdict.FAIL)
        c = ComposedVerifier(
            [soft, agentic, hard],
            policy_mode=PolicyMode.ESCALATION,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        assert len(results) == 1
        breakdown_keys = list(results[0].breakdown.keys())
        assert any("v.hard" in k for k in breakdown_keys)
        assert any("v.soft" in k for k in breakdown_keys)
        assert any("v.agentic" in k for k in breakdown_keys)


class TestBudgetTracking:
    def test_budget_limits_verifiers(self):
        hard = _StubVerifier("v.hard", Tier.HARD, Verdict.FAIL)
        soft = _StubVerifier("v.soft", Tier.SOFT, Verdict.PASS)
        agentic = _StubVerifier("v.agentic", Tier.AGENTIC, Verdict.PASS)
        c = ComposedVerifier(
            [hard, soft, agentic],
            policy_mode=PolicyMode.ESCALATION,
            tier_costs={Tier.HARD: 0.0, Tier.SOFT: 0.50, Tier.AGENTIC: 2.00},
            budget_limit_usd=0.40,  # can't afford SOFT
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        assert len(results) == 1
        breakdown_keys = list(results[0].breakdown.keys())
        assert any("v.hard" in k for k in breakdown_keys)
        assert not any("v.soft" in k for k in breakdown_keys)
        assert not any("v.agentic" in k for k in breakdown_keys)

    def test_no_budget_limit_runs_all(self):
        hard = _StubVerifier("v.hard", Tier.HARD, Verdict.FAIL)
        soft = _StubVerifier("v.soft", Tier.SOFT, Verdict.FAIL)
        c = ComposedVerifier(
            [hard, soft],
            policy_mode=PolicyMode.ESCALATION,
            tier_costs={Tier.HARD: 0.0, Tier.SOFT: 0.50},
            budget_limit_usd=None,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        # 1 composed result, but both verifiers should have run
        assert len(results) == 1
        breakdown_keys = list(results[0].breakdown.keys())
        assert any("v.hard" in k for k in breakdown_keys)
        assert any("v.soft" in k for k in breakdown_keys)


class TestExistingModesUnchanged:
    def test_fail_closed_mode_still_works(self):
        p = _StubVerifier("v.pass", Tier.SOFT, Verdict.PASS)
        f = _StubVerifier("v.fail", Tier.SOFT, Verdict.FAIL)
        c = ComposedVerifier(
            [p, p, f],
            policy_mode=PolicyMode.FAIL_CLOSED,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        # All 3 verifiers produce one composed result per completion
        assert len(results) == 1

    def test_fail_open_mode_still_works(self):
        p = _StubVerifier("v.pass", Tier.SOFT, Verdict.PASS)
        c = ComposedVerifier(
            [p, p],
            policy_mode=PolicyMode.FAIL_OPEN,
        )
        inp = VerifierInput(completions=["test"], ground_truth={})
        results = c.verify(inp)
        assert len(results) == 1
