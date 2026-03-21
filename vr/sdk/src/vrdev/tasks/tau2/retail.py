"""vr/tau2.retail.order_cancelled - HARD verifier for order cancellation state.

Source: τ²-bench (arXiv:2406.12045)
Queries mock/real retail API to confirm an order is in cancelled state with
the expected reason code.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class OrderCancelledVerifier(BaseVerifier):
    """Verifies that an order has been correctly cancelled.

    Ground truth schema::

        {
            "order_id": str,
            "expected_status": str,      # default "cancelled"
            "expected_reason": str | null
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "tau2.retail.order_cancelled"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        order_id = gt.get("order_id", "")
        expected_status = gt.get("expected_status", "cancelled")
        expected_reason = gt.get("expected_reason")
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                order_id, expected_status, expected_reason, api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        order_id: str,
        expected_status: str,
        expected_reason: str | None,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"order_id": order_id, "api_base_url": api_base}
        breakdown: dict[str, float] = {}

        resp = http_get(f"{api_base}/orders/{order_id}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        if resp["verdict"] == Verdict.FAIL:
            breakdown["order_found"] = 0.0
            return self._make_result(
                Verdict.FAIL, 0.0, breakdown, evidence, input_data,
                permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        # Parse response body
        try:
            body = json.loads(resp["body"])
        except (json.JSONDecodeError, TypeError):
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": "Invalid JSON response"},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        evidence["order_status"] = body.get("status")
        evidence["order_reason"] = body.get("reason")

        # Check status
        actual_status = body.get("status", "")
        breakdown["status_match"] = 1.0 if actual_status == expected_status else 0.0

        # Check reason if expected
        if expected_reason is not None:
            actual_reason = body.get("reason", "")
            breakdown["reason_match"] = 1.0 if actual_reason == expected_reason else 0.0

        checks = list(breakdown.values())
        score = sum(checks) / len(checks) if checks else 0.0
        verdict = Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
        )
