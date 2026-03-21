"""Multi-agent verification ensembles - experimental (Phase C4).

Run the same verifier multiple times and apply voting strategies to produce
a consensus result.  Useful for non-deterministic (SOFT) verifiers where
independent runs can disagree.
"""

from __future__ import annotations

from typing import Any, Callable

from .base import BaseVerifier
from .types import (
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


class EnsembleVerifier(BaseVerifier):
    """Runs a verifier factory N times and merges via voting strategy.

    Parameters
    ----------
    verifier_factory : callable
        A zero-arg callable that returns a fresh ``BaseVerifier`` instance.
    num_instances : int
        How many times to run the verifier (default 3).
    consensus_threshold : float
        Fraction of instances that must agree for ``majority`` strategy
        (default 0.66).
    strategy : str
        One of ``"majority"``, ``"unanimous"``, ``"any_pass"``, ``"weighted"``.
    budget_limit_usd : float | None
        If set, per-instance costs are summed and capped.
    """

    name = "ensemble"
    tier = Tier.SOFT
    version = "0.1.0"

    def __init__(
        self,
        verifier_factory: Callable[[], BaseVerifier],
        num_instances: int = 3,
        consensus_threshold: float = 0.66,
        strategy: str = "majority",
        budget_limit_usd: float | None = None,
    ):
        # Verify strategy value
        valid = {"majority", "unanimous", "any_pass", "weighted"}
        if strategy not in valid:
            raise ValueError(f"strategy must be one of {valid}, got '{strategy}'")

        self.verifier_factory = verifier_factory
        self.num_instances = max(1, num_instances)
        self.consensus_threshold = consensus_threshold
        self.strategy = strategy
        self.budget_limit_usd = budget_limit_usd

        # Derive metadata from factory
        sample = verifier_factory()
        self.name = f"ensemble/{sample.name}"
        self.tier = sample.tier
        self.version = sample.version

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        """Run N instances and merge per-completion results."""
        # Collect per-instance results
        instance_results: list[list[VerificationResult]] = []
        for _ in range(self.num_instances):
            v = self.verifier_factory()
            instance_results.append(v.verify(input_data))

        num_completions = len(input_data.completions)
        composed: list[VerificationResult] = []

        for ci in range(num_completions):
            per_instance = [inst[ci] for inst in instance_results if ci < len(inst)]
            merged = self._merge(per_instance, input_data)
            composed.append(merged)

        return composed

    # ── Voting logic ─────────────────────────────────────────────────────

    def _merge(
        self,
        results: list[VerificationResult],
        input_data: VerifierInput,
    ) -> VerificationResult:
        n = len(results)
        if n == 0:
            return self._make_result(
                Verdict.ERROR, 0.0, {}, {"error": "no instance results"},
                input_data,
            )

        pass_count = sum(1 for r in results if r.verdict == Verdict.PASS)
        fail_count = sum(1 for r in results if r.verdict == Verdict.FAIL)
        error_count = n - pass_count - fail_count
        scores = [r.score for r in results]
        consensus_ratio = pass_count / n

        if self.strategy == "majority":
            verdict = Verdict.PASS if consensus_ratio >= self.consensus_threshold else Verdict.FAIL
        elif self.strategy == "unanimous":
            verdict = Verdict.PASS if pass_count == n else Verdict.FAIL
        elif self.strategy == "any_pass":
            verdict = Verdict.PASS if pass_count > 0 else Verdict.FAIL
        elif self.strategy == "weighted":
            avg_score = sum(scores) / n
            verdict = Verdict.PASS if avg_score > 0.5 else Verdict.FAIL
        else:
            verdict = Verdict.ERROR

        avg_score = round(sum(scores) / n, 4) if scores else 0.0

        # Build evidence
        evidence: dict[str, Any] = {
            "ensemble_strategy": self.strategy,
            "num_instances": n,
            "consensus_ratio": round(consensus_ratio, 4),
            "ensemble_votes": [
                {"verdict": r.verdict.value, "score": r.score} for r in results
            ],
        }

        # Build breakdown with per-instance scores
        breakdown: dict[str, float] = {
            "consensus_ratio": round(consensus_ratio, 4),
            "pass_count": float(pass_count),
            "fail_count": float(fail_count),
            "error_count": float(error_count),
        }

        # Aggregate repair hints from failing instances (deduplicated)
        seen_hints: set[str] = set()
        all_hints: list[str] = []
        for r in results:
            if r.verdict != Verdict.PASS:
                for h in r.repair_hints:
                    if h not in seen_hints:
                        seen_hints.add(h)
                        all_hints.append(h)

        # Aggregate suggested actions
        actions = [r.suggested_action for r in results if r.suggested_action]
        suggested = actions[0] if actions else None

        # Any retryable?
        retryable = any(r.retryable for r in results)

        return self._make_result(
            verdict, avg_score, breakdown, evidence, input_data,
            repair_hints=all_hints,
            retryable=retryable,
            suggested_action=suggested,
        )
