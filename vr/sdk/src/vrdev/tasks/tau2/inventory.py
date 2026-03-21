"""vr/tau2.retail.inventory_updated - HARD verifier for inventory state changes.

Source: τ²-bench (arXiv:2406.12045)
Queries mock/real retail API to confirm that a product SKU has the expected
quantity in inventory after an agent action (e.g. restock, decrement, set).
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class InventoryUpdatedVerifier(BaseVerifier):
    """Verifies that product inventory has been correctly updated.

    Ground truth schema::

        {
            "sku": str,
            "expected_quantity": int,
            "expected_warehouse": str | null
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "tau2.retail.inventory_updated"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        sku = gt.get("sku", "")
        expected_quantity = gt.get("expected_quantity", 0)
        expected_warehouse = gt.get("expected_warehouse")
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                sku, expected_quantity, expected_warehouse, api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        sku: str,
        expected_quantity: int,
        expected_warehouse: str | None,
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"sku": sku, "api_base_url": api_base}
        breakdown: dict[str, float] = {}

        resp = http_get(f"{api_base}/inventory/{sku}")
        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
            )

        if resp["verdict"] == Verdict.FAIL:
            breakdown["item_found"] = 0.0
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

        evidence["actual_quantity"] = body.get("quantity")
        evidence["actual_warehouse"] = body.get("warehouse")

        # Check quantity
        actual_quantity = body.get("quantity", -1)
        breakdown["quantity_match"] = 1.0 if actual_quantity == expected_quantity else 0.0

        # Check warehouse if expected
        if expected_warehouse is not None:
            actual_warehouse = body.get("warehouse", "")
            breakdown["warehouse_match"] = (
                1.0 if actual_warehouse == expected_warehouse else 0.0
            )

        checks = list(breakdown.values())
        score = sum(checks) / len(checks) if checks else 0.0
        verdict = Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="τ²-bench", source_citation="arXiv:2406.12045",
        )
