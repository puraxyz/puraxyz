"""vr/tau2.policy.constraint_not_violated - HARD verifier for domain policy compliance.

Source: τ²-bench (arXiv:2406.12045)
Pure-logic verifier: takes domain policy rules and an action trace, checks
whether any rules were violated. Most generalizable - works for retail,
airline, telecom, or any domain with codifiable policies.
"""

from __future__ import annotations

import time
from typing import Any, Callable

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput

# ── Operator dispatch table ──────────────────────────────────────────────────

_OPERATORS: dict[str, Callable[..., bool]] = {
    "eq": lambda a, b: a == b,
    "neq": lambda a, b: a != b,
    "lt": lambda a, b: float(a) < float(b),
    "lte": lambda a, b: float(a) <= float(b),
    "gt": lambda a, b: float(a) > float(b),
    "gte": lambda a, b: float(a) >= float(b),
    "in": lambda a, b: a in b,
    "not_in": lambda a, b: a not in b,
    "contains": lambda a, b: b in a,
}


class ConstraintNotViolatedVerifier(BaseVerifier):
    """Verifies that agent actions comply with domain policy constraints.

    Ground truth schema::

        {
            "policies": [
                {
                    "rule_id": str,
                    "description": str,
                    "field": str,
                    "operator": "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "contains",
                    "value": any
                }
            ],
            "actions": [
                { "type": str, ...field: value... }
            ]
        }
    """

    name = "tau2.policy.constraint_not_violated"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        policies = gt.get("policies", [])
        actions = gt.get("actions", [])

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(policies, actions, input_data)
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        policies: list[dict],
        actions: list[dict],
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {
            "num_policies": len(policies),
            "num_actions": len(actions),
        }
        violations: list[dict] = []

        for action in actions:
            for policy in policies:
                rule_id = policy.get("rule_id", "unknown")
                field = policy.get("field", "")
                operator = policy.get("operator", "eq")
                expected = policy.get("value")

                actual = action.get(field)
                if actual is None:
                    continue  # Field not present in action, skip

                op_func = _OPERATORS.get(operator)
                if op_func is None:
                    violations.append({
                        "rule_id": rule_id,
                        "error": f"Unknown operator: {operator}",
                    })
                    continue

                try:
                    if not op_func(actual, expected):
                        violations.append({
                            "rule_id": rule_id,
                            "field": field,
                            "expected": f"{operator} {expected}",
                            "actual": actual,
                            "action_type": action.get("type", "unknown"),
                        })
                except (TypeError, ValueError) as exc:
                    violations.append({
                        "rule_id": rule_id,
                        "error": f"Comparison failed: {exc}",
                    })

        evidence["violations"] = violations
        evidence["violations_count"] = len(violations)

        if not violations:
            verdict = Verdict.PASS
            score = 1.0
        else:
            verdict = Verdict.FAIL
            score = max(0.0, 1.0 - len(violations) / max(len(policies), 1))

        breakdown = {"constraint_compliance": round(score, 4)}

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
        )
