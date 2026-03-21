"""Tests for the three τ²-bench verifiers.

Uses the session-scoped ``tau2_server`` fixture from conftest.py which
provides a real HTTP mock server on an auto-assigned port.
"""

from __future__ import annotations


from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.tau2.retail import OrderCancelledVerifier
from vrdev.tasks.tau2.policy import ConstraintNotViolatedVerifier
from vrdev.tasks.tau2.airline import RebookingCorrectVerifier


# ── Helpers ──────────────────────────────────────────────────────────────────


def _order_input(
    order_id: str,
    api_base: str,
    expected_status: str = "cancelled",
    expected_reason: str | None = None,
) -> VerifierInput:
    gt: dict = {"order_id": order_id, "expected_status": expected_status}
    if expected_reason is not None:
        gt["expected_reason"] = expected_reason
    return VerifierInput(
        completions=["Agent cancelled the order."],
        ground_truth=gt,
        context={"api_base_url": api_base},
    )


def _booking_input(
    booking_id: str,
    api_base: str,
    expected_date: str | None = None,
    expected_cabin: str | None = None,
    expected_passengers: int | None = None,
) -> VerifierInput:
    gt: dict = {"booking_id": booking_id}
    if expected_date is not None:
        gt["expected_date"] = expected_date
    if expected_cabin is not None:
        gt["expected_cabin_class"] = expected_cabin
    if expected_passengers is not None:
        gt["expected_passengers"] = expected_passengers
    return VerifierInput(
        completions=["Agent rebooked the flight."],
        ground_truth=gt,
        context={"api_base_url": api_base},
    )


# ══════════════════════════════════════════════════════════════════════════════
# OrderCancelledVerifier
# ══════════════════════════════════════════════════════════════════════════════


class TestOrderCancelledVerifier:
    def test_tier_is_hard(self):
        assert OrderCancelledVerifier().tier == Tier.HARD

    def test_pass_cancelled_order(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-001", tau2_server))
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].breakdown["status_match"] == 1.0

    def test_pass_with_reason(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(
            _order_input("ORD-001", tau2_server, expected_reason="customer_request")
        )
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["reason_match"] == 1.0

    def test_fail_active_order(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-002", tau2_server))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["status_match"] == 0.0

    def test_fail_pending_order(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-004", tau2_server))
        assert results[0].verdict == Verdict.FAIL

    def test_fail_wrong_reason(self, tau2_server):
        """Correct status but wrong reason → partial fail."""
        v = OrderCancelledVerifier()
        results = v.verify(
            _order_input("ORD-001", tau2_server, expected_reason="fraud")
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["status_match"] == 1.0
        assert results[0].breakdown["reason_match"] == 0.0
        assert results[0].score == 0.5

    def test_fail_order_not_found(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-999", tau2_server))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown.get("order_found") == 0.0

    def test_error_bad_connection(self):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-001", "http://127.0.0.1:1"))
        assert results[0].verdict == Verdict.ERROR

    def test_provenance(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-001", tau2_server))
        assert results[0].provenance.source_benchmark == "τ²-bench"

    def test_evidence_fields(self, tau2_server):
        v = OrderCancelledVerifier()
        results = v.verify(_order_input("ORD-001", tau2_server))
        ev = results[0].evidence
        assert ev["order_id"] == "ORD-001"
        assert ev["order_status"] == "cancelled"
        assert ev["http_status"] == 200


# ══════════════════════════════════════════════════════════════════════════════
# ConstraintNotViolatedVerifier
# ══════════════════════════════════════════════════════════════════════════════


class TestConstraintNotViolatedVerifier:
    POLICIES = [
        {
            "rule_id": "max_refund_24h",
            "description": "Refund only within 24 hours",
            "field": "refund_hours",
            "operator": "lte",
            "value": 24,
        },
        {
            "rule_id": "no_premium_downgrade",
            "description": "Cannot downgrade premium customers",
            "field": "customer_tier",
            "operator": "neq",
            "value": "premium",
        },
    ]

    def _make_input(self, actions: list[dict]) -> VerifierInput:
        return VerifierInput(
            completions=["Agent processed actions."],
            ground_truth={"policies": self.POLICIES, "actions": actions},
        )

    def test_tier_is_hard(self):
        assert ConstraintNotViolatedVerifier().tier == Tier.HARD

    def test_pass_compliant_actions(self):
        actions = [
            {"type": "refund", "refund_hours": 12, "customer_tier": "basic"},
            {"type": "refund", "refund_hours": 23, "customer_tier": "standard"},
        ]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].evidence["violations_count"] == 0

    def test_fail_refund_too_late(self):
        actions = [{"type": "refund", "refund_hours": 48, "customer_tier": "basic"}]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["violations_count"] == 1
        assert results[0].evidence["violations"][0]["rule_id"] == "max_refund_24h"

    def test_fail_premium_downgrade(self):
        actions = [{"type": "downgrade", "refund_hours": 10, "customer_tier": "premium"}]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        assert results[0].verdict == Verdict.FAIL
        # The neq operator means customer_tier must NOT equal "premium"
        assert any(
            v["rule_id"] == "no_premium_downgrade"
            for v in results[0].evidence["violations"]
        )

    def test_fail_multiple_violations(self):
        actions = [{"type": "refund", "refund_hours": 48, "customer_tier": "premium"}]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["violations_count"] == 2

    def test_pass_empty_actions(self):
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input([]))
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_pass_missing_field_skipped(self):
        """Actions without the policy field are skipped, not flagged."""
        actions = [{"type": "note", "content": "Customer called"}]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        assert results[0].verdict == Verdict.PASS

    def test_score_scales_with_violations(self):
        """Score = 1 - violations / num_policies."""
        actions = [{"type": "refund", "refund_hours": 48, "customer_tier": "basic"}]
        v = ConstraintNotViolatedVerifier()
        results = v.verify(self._make_input(actions))
        # 1 violation out of 2 policies → score = 0.5
        assert results[0].score == 0.5

    def test_operators_eq(self):
        policies = [{"rule_id": "status_check", "field": "status", "operator": "eq", "value": "active"}]
        actions = [{"type": "check", "status": "active"}]
        v = ConstraintNotViolatedVerifier()
        inp = VerifierInput(
            completions=["done"], ground_truth={"policies": policies, "actions": actions}
        )
        assert v.verify(inp)[0].verdict == Verdict.PASS

    def test_operators_in(self):
        policies = [
            {"rule_id": "tier_check", "field": "tier", "operator": "in", "value": ["gold", "silver"]}
        ]
        actions = [{"type": "check", "tier": "gold"}]
        v = ConstraintNotViolatedVerifier()
        inp = VerifierInput(
            completions=["done"], ground_truth={"policies": policies, "actions": actions}
        )
        assert v.verify(inp)[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# RebookingCorrectVerifier
# ══════════════════════════════════════════════════════════════════════════════


class TestRebookingCorrectVerifier:
    def test_tier_is_hard(self):
        assert RebookingCorrectVerifier().tier == Tier.HARD

    def test_pass_all_fields_match(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input(
                "BK-001", tau2_server,
                expected_date="2026-04-15",
                expected_cabin="business",
                expected_passengers=2,
            )
        )
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].breakdown["date_match"] == 1.0
        assert results[0].breakdown["cabin_match"] == 1.0
        assert results[0].breakdown["passengers_match"] == 1.0

    def test_fail_wrong_date(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-001", tau2_server, expected_date="2026-01-01")
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["date_match"] == 0.0

    def test_fail_wrong_cabin(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-001", tau2_server, expected_cabin="economy")
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["cabin_match"] == 0.0

    def test_fail_wrong_passengers(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-001", tau2_server, expected_passengers=5)
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["passengers_match"] == 0.0

    def test_fail_booking_not_found(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-999", tau2_server, expected_date="2026-04-15")
        )
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown.get("booking_found") == 0.0

    def test_partial_score(self, tau2_server):
        """2 of 3 fields match → score = 2/3."""
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input(
                "BK-001", tau2_server,
                expected_date="2026-04-15",     # correct
                expected_cabin="business",       # correct
                expected_passengers=99,          # wrong
            )
        )
        assert results[0].verdict == Verdict.FAIL
        assert abs(results[0].score - 2 / 3) < 0.01

    def test_pass_no_expected_fields(self, tau2_server):
        """No fields to check → booking exists → PASS with score 1.0."""
        v = RebookingCorrectVerifier()
        results = v.verify(_booking_input("BK-001", tau2_server))
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_error_bad_connection(self):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-001", "http://127.0.0.1:1", expected_date="2026-04-15")
        )
        assert results[0].verdict == Verdict.ERROR

    def test_evidence_includes_booking_state(self, tau2_server):
        v = RebookingCorrectVerifier()
        results = v.verify(
            _booking_input("BK-002", tau2_server, expected_date="2026-03-10")
        )
        assert "booking_state" in results[0].evidence
        assert results[0].evidence["booking_state"]["cabin_class"] == "economy"
