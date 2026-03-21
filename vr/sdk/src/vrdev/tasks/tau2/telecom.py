"""vr/tau2.telecom.plan_changed - HARD verifier for telecom plan changes.

Source: τ²-bench (arXiv:2406.12045) - telecom domain
Queries a CRM-like REST API to verify that a customer's telecom plan was
changed to the expected plan with correct effective date.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class PlanChangedVerifier(BaseVerifier):
    """Verifies that a customer's telecom plan was changed correctly.

    Ground truth schema::

        {
            "customer_id": str,
            "expected_plan": str,               # plan name or SKU
            "expected_effective_date": str | null  # ISO date, null = don't check
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "tau2.telecom.plan_changed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        customer_id = gt.get("customer_id", "")
        expected_plan = gt.get("expected_plan", "")
        expected_date = gt.get("expected_effective_date")
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                customer_id, expected_plan, expected_date,
                api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        customer_id: str,
        expected_plan: str,
        expected_date: str | None,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {
            "customer_id": customer_id,
            "expected_plan": expected_plan,
            "api_base_url": api_base,
        }
        breakdown: dict[str, float] = {}

        # Fetch customer record
        resp = http_get(f"{api_base}/customers/{customer_id}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="tau2-bench", source_citation="arXiv:2406.12045",
            )

        if resp.get("status_code") == 404:
            evidence["reason"] = "customer not found"
            return self._make_result(
                Verdict.FAIL, 0.0, {"customer_found": 0.0},
                evidence, input_data, permissions=["net:http"],
                source_benchmark="tau2-bench", source_citation="arXiv:2406.12045",
            )

        # Parse response body
        try:
            body = json.loads(resp.get("body", "{}"))
        except (json.JSONDecodeError, TypeError):
            body = {}

        evidence["customer"] = body

        # Check 1: Customer exists
        breakdown["customer_found"] = 1.0 if body else 0.0

        # Check 2: Plan matches
        actual_plan = body.get("current_plan", "")
        plan_match = actual_plan.lower() == expected_plan.lower() if expected_plan else True
        breakdown["plan_match"] = 1.0 if plan_match else 0.0
        evidence["actual_plan"] = actual_plan

        # Check 3: Effective date matches (optional)
        if expected_date is not None:
            actual_date = body.get("effective_date", "")
            date_match = actual_date == expected_date
            breakdown["date_match"] = 1.0 if date_match else 0.0
            evidence["actual_effective_date"] = actual_date
        else:
            date_match = True
            breakdown["date_match"] = 1.0

        # Aggregate
        all_pass = bool(body) and plan_match and date_match
        score = sum(breakdown.values()) / len(breakdown) if breakdown else 0.0

        return self._make_result(
            Verdict.PASS if all_pass else Verdict.FAIL,
            round(score, 4), breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="tau2-bench", source_citation="arXiv:2406.12045",
        )
