"""vr/web.ecommerce.order_placed - HARD verifier for order placement.

Source: WebArena (arXiv:2307.13854)
Queries e-commerce API to confirm an order was placed with expected items
and total amount within tolerance.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class OrderPlacedVerifier(BaseVerifier):
    """Verifies that an order was placed with the correct items and total.

    Ground truth schema::

        {
            "order_id": str,
            "expected_items": list[str],       # item names or SKUs
            "expected_total": float | null,     # if null, skip total check
            "total_tolerance": float            # default 0.01
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "web.ecommerce.order_placed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        order_id = gt.get("order_id", "")
        expected_items = gt.get("expected_items", [])
        expected_total = gt.get("expected_total")
        total_tolerance = gt.get("total_tolerance", 0.01)
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                order_id, expected_items, expected_total,
                total_tolerance, api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        order_id: str,
        expected_items: list[str],
        expected_total: float | None,
        total_tolerance: float,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"order_id": order_id, "api_base_url": api_base}
        breakdown: dict[str, float] = {}

        # Fetch order
        resp = http_get(f"{api_base}/orders/{order_id}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="WebArena", source_citation="arXiv:2307.13854",
            )

        if resp.get("status_code") == 404:
            evidence["reason"] = "order not found"
            return self._make_result(
                Verdict.FAIL, 0.0, {"order_found": 0.0, "items_match": 0.0},
                evidence, input_data, permissions=["net:http"],
                source_benchmark="WebArena", source_citation="arXiv:2307.13854",
            )

        # Parse order body
        try:
            body = json.loads(resp.get("body", "{}"))
        except (json.JSONDecodeError, TypeError):
            body = {}

        evidence["order_status"] = body.get("status")
        evidence["order_items"] = body.get("items", [])
        evidence["order_total"] = body.get("total")

        # Check 1: Order exists and is in placed/confirmed state
        status = body.get("status", "")
        is_placed = status in ("placed", "confirmed", "processing")
        breakdown["order_found"] = 1.0 if is_placed else 0.0

        # Check 2: Items match
        actual_items = set(body.get("items", []))
        expected_set = set(expected_items)
        if expected_set:
            items_match = len(actual_items & expected_set) / len(expected_set)
        else:
            items_match = 1.0  # no items to check
        breakdown["items_match"] = round(items_match, 4)

        # Check 3: Total within tolerance
        if expected_total is not None:
            actual_total = body.get("total", 0.0)
            try:
                actual_total = float(actual_total)
            except (ValueError, TypeError):
                actual_total = 0.0
            total_ok = abs(actual_total - expected_total) <= total_tolerance
            breakdown["total_match"] = 1.0 if total_ok else 0.0
        else:
            total_ok = True
            breakdown["total_match"] = 1.0

        # Aggregate
        checks = [is_placed, items_match >= 1.0, total_ok]
        all_pass = all(checks)
        score = sum(breakdown.values()) / len(breakdown)

        return self._make_result(
            Verdict.PASS if all_pass else Verdict.FAIL,
            round(score, 4), breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="WebArena", source_citation="arXiv:2307.13854",
        )
