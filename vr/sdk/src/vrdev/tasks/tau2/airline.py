"""vr/tau2.airline.rebooking_correct - HARD verifier for flight rebooking state.

Source: τ²-bench (arXiv:2406.12045)
Queries mock/real airline API to confirm booking fields match expected
values (date, cabin class, passenger count).
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class RebookingCorrectVerifier(BaseVerifier):
    """Verifies that a flight rebooking matches expected state.

    Ground truth schema::

        {
            "booking_id": str,
            "expected_date": str | null,
            "expected_cabin_class": str | null,
            "expected_passengers": int | null
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "tau2.airline.rebooking_correct"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        booking_id = gt.get("booking_id", "")
        expected_date = gt.get("expected_date")
        expected_cabin = gt.get("expected_cabin_class")
        expected_passengers = gt.get("expected_passengers")
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                booking_id, expected_date, expected_cabin, expected_passengers,
                api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        booking_id: str,
        expected_date: str | None,
        expected_cabin: str | None,
        expected_passengers: int | None,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"booking_id": booking_id}
        breakdown: dict[str, float] = {}

        resp = http_get(f"{api_base}/bookings/{booking_id}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        if resp["verdict"] == Verdict.FAIL:
            breakdown["booking_found"] = 0.0
            return self._make_result(
                Verdict.FAIL, 0.0, breakdown, evidence, input_data,
                permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        try:
            body = json.loads(resp["body"])
        except (json.JSONDecodeError, TypeError):
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": "Invalid JSON response"},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        evidence["booking_state"] = body

        # ── Check each expected field ────────────────────────────────────
        if expected_date is not None:
            actual_date = body.get("date", "")
            breakdown["date_match"] = 1.0 if actual_date == expected_date else 0.0
            evidence["actual_date"] = actual_date

        if expected_cabin is not None:
            actual_cabin = body.get("cabin_class", "")
            breakdown["cabin_match"] = 1.0 if actual_cabin == expected_cabin else 0.0
            evidence["actual_cabin_class"] = actual_cabin

        if expected_passengers is not None:
            actual_pax = body.get("passengers")
            breakdown["passengers_match"] = 1.0 if actual_pax == expected_passengers else 0.0
            evidence["actual_passengers"] = actual_pax

        checks = list(breakdown.values())
        score = sum(checks) / len(checks) if checks else 1.0
        verdict = Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
        )
