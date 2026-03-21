"""Payment verifiers: Stripe charge success and refund checks.

All are HARD-tier deterministic verifiers that query Stripe API state.
They accept either a live API key or a ``pre_result`` dict for testing.
"""

from __future__ import annotations

import os
import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _stripe_api(endpoint: str, secret_key: str | None = None) -> dict:  # pragma: no cover
    """Make a GET request to the Stripe API."""
    import httpx
    headers = {}
    if secret_key:
        headers["Authorization"] = f"Bearer {secret_key}"
    resp = httpx.get(f"https://api.stripe.com/v1{endpoint}", headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


class ChargeSucceededVerifier(BaseVerifier):
    """Verifies that a Stripe charge was completed successfully.

    Ground truth schema::

        {
            "charge_id": str | null,
            "amount": int | null,        # in cents
            "currency": str | null,
            "customer": str | null,
            "pre_result": dict | null    # { "status": str, "paid": bool, "amount": int }
        }
    """

    name = "payment.stripe.charge_succeeded"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        charge_id = gt.get("charge_id")
        expected_amount = gt.get("amount")
        expected_currency = gt.get("currency")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"charge_id": charge_id}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            status = pre_result.get("status", "")
            paid = pre_result.get("paid", False)
            actual_amount = pre_result.get("amount")
            actual_currency = pre_result.get("currency")
        elif charge_id:
            secret_key = os.environ.get("STRIPE_SECRET_KEY")
            if not secret_key:
                evidence["error"] = "STRIPE_SECRET_KEY not set"
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:stripe"])
            try:
                data = _stripe_api(f"/charges/{charge_id}", secret_key)
                status = data.get("status", "")
                paid = data.get("paid", False)
                actual_amount = data.get("amount")
                actual_currency = data.get("currency")
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:stripe"], retryable=True)
        else:
            evidence["error"] = "no charge_id or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:stripe"])

        evidence["status"] = status
        evidence["paid"] = paid
        breakdown["charge_succeeded"] = 1.0 if (status == "succeeded" and paid) else 0.0

        if expected_amount is not None:
            breakdown["amount_match"] = 1.0 if actual_amount == expected_amount else 0.0
            evidence["actual_amount"] = actual_amount
        if expected_currency is not None:
            breakdown["currency_match"] = 1.0 if actual_currency == expected_currency else 0.0
            evidence["actual_currency"] = actual_currency

        all_pass = all(v == 1.0 for v in breakdown.values())
        score = sum(breakdown.values()) / len(breakdown) if breakdown else 0.0
        verdict = Verdict.PASS if all_pass else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            if not paid:
                hints.append(f"Charge {charge_id} was not paid (status: {status})")
            if breakdown.get("amount_match", 1.0) < 1.0:
                hints.append(f"Amount mismatch: expected {expected_amount}, got {actual_amount}")
            if breakdown.get("currency_match", 1.0) < 1.0:
                hints.append(f"Currency mismatch: expected {expected_currency}, got {actual_currency}")

        return self._make_result(verdict, round(score, 4), breakdown, evidence, input_data,
                                 permissions=["api:stripe"], repair_hints=hints)


class RefundProcessedVerifier(BaseVerifier):
    """Verifies that a Stripe refund was processed.

    Ground truth schema::

        {
            "refund_id": str | null,
            "charge_id": str | null,
            "pre_result": dict | null   # { "status": str, "amount": int }
        }
    """

    name = "payment.stripe.refund_processed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        refund_id = gt.get("refund_id")
        charge_id = gt.get("charge_id")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"refund_id": refund_id, "charge_id": charge_id}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            status = pre_result.get("status", "")
            amount = pre_result.get("amount")
        elif refund_id:
            secret_key = os.environ.get("STRIPE_SECRET_KEY")
            if not secret_key:
                evidence["error"] = "STRIPE_SECRET_KEY not set"
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:stripe"])
            try:
                data = _stripe_api(f"/refunds/{refund_id}", secret_key)
                status = data.get("status", "")
                amount = data.get("amount")
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:stripe"], retryable=True)
        else:
            evidence["error"] = "no refund_id or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:stripe"])

        evidence["status"] = status
        evidence["amount"] = amount
        breakdown["refund_succeeded"] = 1.0 if status == "succeeded" else 0.0
        score = breakdown["refund_succeeded"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            hints.append(f"Refund status is '{status}' instead of 'succeeded'")
            if status == "pending":
                hints.append("Refund is still processing - try again later")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:stripe"], repair_hints=hints,
                                 retryable=(status == "pending"))
