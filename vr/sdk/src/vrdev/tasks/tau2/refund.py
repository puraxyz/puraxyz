"""vr/tau2.retail.refund_processed - HARD verifier for refund state.

Source: τ²-bench (arXiv:2406.12045)
Queries mock/real retail API to confirm a refund has been processed with
the expected amount.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class RefundProcessedVerifier(BaseVerifier):
    """Verifies that a refund has been correctly processed.

    Ground truth schema::

        {
            "refund_id": str,
            "expected_status": str,       # default "processed"
            "expected_amount": float | null,
            "amount_tolerance": float     # default 0.01
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "tau2.retail.refund_processed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        refund_id = gt.get("refund_id", "")
        expected_status = gt.get("expected_status", "processed")
        expected_amount = gt.get("expected_amount")
        amount_tolerance = gt.get("amount_tolerance", 0.01)
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                refund_id, expected_status, expected_amount,
                amount_tolerance, api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        refund_id: str,
        expected_status: str,
        expected_amount: float | None,
        amount_tolerance: float,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {
            "refund_id": refund_id,
            "api_base_url": api_base,
        }
        breakdown: dict[str, float] = {}

        resp = http_get(f"{api_base}/refunds/{refund_id}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench",
                source_citation="arXiv:2406.12045",
            )

        if resp["verdict"] == Verdict.FAIL:
            breakdown["refund_found"] = 0.0
            return self._make_result(
                Verdict.FAIL, 0.0, breakdown, evidence, input_data,
                permissions=["net:http"],
                source_benchmark="τ²-bench",
                source_citation="arXiv:2406.12045",
            )

        # Parse response body
        try:
            body = json.loads(resp["body"])
        except (json.JSONDecodeError, TypeError):
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": "Invalid JSON response"},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench",
                source_citation="arXiv:2406.12045",
            )

        evidence["refund_status"] = body.get("status")
        evidence["refund_amount"] = body.get("amount")
        evidence["refund_reason"] = body.get("reason")

        # Check status
        actual_status = body.get("status", "")
        breakdown["status_match"] = (
            1.0 if actual_status == expected_status else 0.0
        )

        # Check amount if expected
        if expected_amount is not None:
            actual_amount = body.get("amount", 0.0)
            try:
                actual_amount = float(actual_amount)
            except (ValueError, TypeError):
                actual_amount = 0.0
            amount_ok = abs(actual_amount - expected_amount) <= amount_tolerance
            breakdown["amount_match"] = 1.0 if amount_ok else 0.0

        checks = list(breakdown.values())
        score = sum(checks) / len(checks) if checks else 0.0
        verdict = (
            Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL
        )

        return self._make_result(
            verdict, round(score, 4), breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="τ²-bench",
            source_citation="arXiv:2406.12045",
        )
