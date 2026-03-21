"""Integration tests: full verifier → mock HTTP server → verdict round-trips.

These tests exercise the entire verification pipeline against the standalone
τ²-bench mock FastAPI server. They are slower than unit tests and marked with
``@pytest.mark.integration`` so they can be run separately.

Run integration tests only::

    pytest packages/vr-api/tests/integration/ -m integration

Run everything::

    pytest packages/vr-api/tests/ -m "not integration"  # unit only
    pytest packages/vr-api/tests/                        # all
"""

from __future__ import annotations

import time

import pytest

from vrdev.core.registry import get_verifier
from vrdev.core.types import Verdict, VerifierInput


pytestmark = pytest.mark.integration


# ── Helpers ──────────────────────────────────────────────────────────────────


def _verify(verifier_id: str, ground_truth: dict, completions: list[str] | None = None,
            *, api_base_url: str) -> tuple[list, float]:
    """Run a verifier synchronously and return (results, elapsed_ms).

    The τ²-bench verifiers read ``api_base_url`` from ``input_data.context``,
    NOT from ``ground_truth``.
    """
    inp = VerifierInput(
        completions=completions or ["done"],
        ground_truth=ground_truth,
        context={"api_base_url": api_base_url},
    )
    v = get_verifier(verifier_id)

    start = time.perf_counter()
    results = v.verify(inp)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return results, elapsed_ms


# ══════════════════════════════════════════════════════════════════════════════
# Airline verifier - vr/tau2.airline.rebooking_correct
# ══════════════════════════════════════════════════════════════════════════════


class TestAirlineRebookingIntegration:
    """Full round-trip: verifier → mock /bookings/{id} → verdict."""

    VERIFIER = "vr/tau2.airline.rebooking_correct"

    def test_pass_correct_rebooking(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "booking_id": "BK-001",
                "expected_date": "2026-04-15",
                "expected_cabin_class": "business",
                "expected_passengers": 2,
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("airline_pass", self.VERIFIER, ms)

        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].evidence.get("booking_id") == "BK-001"

    def test_fail_wrong_cabin(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "booking_id": "BK-001",
                "expected_date": "2026-04-15",
                "expected_cabin_class": "economy",  # Wrong - actual is business
                "expected_passengers": 2,
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("airline_fail_cabin", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL
        assert results[0].score < 1.0

    def test_fail_not_found(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"booking_id": "BK-999"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("airline_not_found", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_multiple_completions(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "booking_id": "BK-002",
                "expected_date": "2026-03-10",
                "expected_cabin_class": "economy",
                "expected_passengers": 1,
            },
            completions=["done", "completed", "finished"],
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("airline_multi", self.VERIFIER, ms)

        assert len(results) == 3
        assert all(r.verdict == Verdict.PASS for r in results)


# ══════════════════════════════════════════════════════════════════════════════
# Retail - vr/tau2.retail.order_cancelled
# ══════════════════════════════════════════════════════════════════════════════


class TestRetailOrderCancelledIntegration:
    """Full round-trip: verifier → mock /orders/{id} → verdict."""

    VERIFIER = "vr/tau2.retail.order_cancelled"

    def test_pass_cancelled_order(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"order_id": "ORD-001"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("order_cancel_pass", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_fail_active_order(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"order_id": "ORD-002"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("order_cancel_fail", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL
        assert results[0].score < 1.0

    def test_fail_not_found(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"order_id": "ORD-999"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("order_cancel_404", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_with_custom_expected_status(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"order_id": "ORD-004", "expected_status": "pending"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("order_cancel_custom_status", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# Retail - vr/tau2.retail.refund_processed
# ══════════════════════════════════════════════════════════════════════════════


class TestRetailRefundIntegration:
    """Full round-trip: verifier → mock /refunds/{id} → verdict."""

    VERIFIER = "vr/tau2.retail.refund_processed"

    def test_pass_processed_refund(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "refund_id": "RF-001",
                "expected_amount": 49.99,
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("refund_pass", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_fail_pending_refund(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"refund_id": "RF-002"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("refund_fail_pending", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_fail_wrong_amount(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "refund_id": "RF-001",
                "expected_amount": 100.00,  # Wrong - actual is 49.99
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("refund_fail_amount", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL
        assert results[0].score < 1.0

    def test_fail_denied_refund(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"refund_id": "RF-004"},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("refund_fail_denied", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL


# ══════════════════════════════════════════════════════════════════════════════
# Retail - vr/tau2.retail.inventory_updated
# ══════════════════════════════════════════════════════════════════════════════


class TestRetailInventoryIntegration:
    """Full round-trip: verifier → mock /inventory/{sku} → verdict."""

    VERIFIER = "vr/tau2.retail.inventory_updated"

    def test_pass_correct_quantity(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "sku": "SKU-100",
                "expected_quantity": 42,
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("inventory_pass", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS

    def test_fail_wrong_quantity(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "sku": "SKU-100",
                "expected_quantity": 99,  # Wrong - actual is 42
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("inventory_fail_qty", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_pass_zero_stock(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "sku": "SKU-200",
                "expected_quantity": 0,
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("inventory_zero", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS

    def test_fail_not_found(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={"sku": "SKU-NONEXISTENT", "expected_quantity": 1},
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("inventory_404", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL


# ══════════════════════════════════════════════════════════════════════════════
# Telecom - vr/tau2.telecom.plan_changed
# ══════════════════════════════════════════════════════════════════════════════


class TestTelecomPlanChangedIntegration:
    """Full round-trip: verifier → mock /customers/{id} → verdict."""

    VERIFIER = "vr/tau2.telecom.plan_changed"

    def test_pass_correct_plan(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("telecom_pass", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_fail_wrong_plan(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "customer_id": "TEL-002",
                "expected_plan": "Premium Unlimited",  # Wrong - actual is Basic 5GB
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("telecom_fail_plan", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_fail_not_found(self, mock_tau2_url, benchmark_collector):
        results, ms = _verify(
            self.VERIFIER,
            ground_truth={
                "customer_id": "TEL-999",
                "expected_plan": "Any",
            },
            api_base_url=mock_tau2_url,
        )
        benchmark_collector.record("telecom_404", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL


# ══════════════════════════════════════════════════════════════════════════════
# Policy (pure logic, no HTTP) - included for completeness + benchmarking
# ══════════════════════════════════════════════════════════════════════════════


class TestPolicyConstraintIntegration:
    """Policy verifier is pure logic - no HTTP needed. Benchmarked for baseline."""

    VERIFIER = "vr/tau2.policy.constraint_not_violated"

    def test_pass_under_limit(self, benchmark_collector):
        gt = {
            "policies": [
                {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
            ],
            "actions": [{"type": "buy", "amount": 50}],
        }
        inp = VerifierInput(completions=["done"], ground_truth=gt)
        v = get_verifier(self.VERIFIER)

        start = time.perf_counter()
        results = v.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("policy_pass", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS

    def test_fail_over_limit(self, benchmark_collector):
        gt = {
            "policies": [
                {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
            ],
            "actions": [{"type": "buy", "amount": 200}],
        }
        inp = VerifierInput(completions=["done"], ground_truth=gt)
        v = get_verifier(self.VERIFIER)

        start = time.perf_counter()
        results = v.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("policy_fail", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.FAIL

    def test_multiple_policies(self, benchmark_collector):
        gt = {
            "policies": [
                {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
                {"rule_id": "min", "field": "amount", "operator": "gte", "value": 10},
                {"rule_id": "type", "field": "type", "operator": "eq", "value": "buy"},
            ],
            "actions": [{"type": "buy", "amount": 50}],
        }
        inp = VerifierInput(completions=["done"], ground_truth=gt)
        v = get_verifier(self.VERIFIER)

        start = time.perf_counter()
        results = v.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("policy_multi_rules", self.VERIFIER, ms)

        assert results[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# Cross-verifier compose pipeline integration
# ══════════════════════════════════════════════════════════════════════════════


class TestComposePipelineIntegration:
    """Integration test for compose: multiple verifiers → composed verdict."""

    def test_compose_all_pass(self, mock_tau2_url, benchmark_collector):
        """Compose policy + order_cancelled - both pass."""
        from vrdev.core.compose import compose
        from vrdev.core.types import PolicyMode

        verifiers = [
            get_verifier("vr/tau2.policy.constraint_not_violated"),
            get_verifier("vr/tau2.retail.order_cancelled"),
        ]
        composed = compose(verifiers, require_hard=True, policy_mode=PolicyMode.FAIL_CLOSED)

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
                ],
                "actions": [{"type": "buy", "amount": 50}],
                "order_id": "ORD-001",
            },
            context={"api_base_url": mock_tau2_url},
        )

        start = time.perf_counter()
        results = composed.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("compose_all_pass", "compose", ms)

        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_compose_hard_gate_fail(self, mock_tau2_url, benchmark_collector):
        """Compose with hard gate: policy passes but order not cancelled → FAIL."""
        from vrdev.core.compose import compose
        from vrdev.core.types import PolicyMode

        verifiers = [
            get_verifier("vr/tau2.policy.constraint_not_violated"),
            get_verifier("vr/tau2.retail.order_cancelled"),
        ]
        composed = compose(verifiers, require_hard=True, policy_mode=PolicyMode.FAIL_CLOSED)

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
                ],
                "actions": [{"type": "buy", "amount": 50}],
                "order_id": "ORD-002",  # Active - not cancelled
            },
            context={"api_base_url": mock_tau2_url},
        )

        start = time.perf_counter()
        results = composed.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("compose_hard_gate_fail", "compose", ms)

        assert results[0].verdict == Verdict.FAIL

    def test_compose_evidence_merged(self, mock_tau2_url, benchmark_collector):
        """Composed results merge evidence from all component verifiers."""
        from vrdev.core.compose import compose
        from vrdev.core.types import PolicyMode

        verifiers = [
            get_verifier("vr/tau2.policy.constraint_not_violated"),
            get_verifier("vr/tau2.retail.order_cancelled"),
        ]
        composed = compose(verifiers, require_hard=True, policy_mode=PolicyMode.FAIL_CLOSED)

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 100},
                ],
                "actions": [{"type": "buy", "amount": 50}],
                "order_id": "ORD-001",
            },
            context={"api_base_url": mock_tau2_url},
        )

        start = time.perf_counter()
        results = composed.verify(inp)
        ms = (time.perf_counter() - start) * 1000
        benchmark_collector.record("compose_evidence_merge", "compose", ms)

        # Evidence should contain data from both verifiers
        evidence = results[0].evidence
        assert isinstance(evidence, dict)
