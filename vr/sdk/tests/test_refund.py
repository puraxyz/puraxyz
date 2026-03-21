"""Tests for tau2.retail.refund_processed verifier."""

from __future__ import annotations


from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.tau2.refund import RefundProcessedVerifier


# ══════════════════════════════════════════════════════════════════════════════
# Positive cases - refund found and status matches
# ══════════════════════════════════════════════════════════════════════════════


class TestRefundPositive:
    def test_refund_processed(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Processed the refund."],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["status_match"] == 1.0

    def test_refund_with_amount_match(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
                "expected_amount": 49.99,
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["amount_match"] == 1.0

    def test_refund_processed_duplicate_order(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Refund for duplicate."],
            ground_truth={
                "refund_id": "RF-003",
                "expected_status": "processed",
                "expected_amount": 25.50,
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# Negative cases - refund status mismatch or not found
# ══════════════════════════════════════════════════════════════════════════════


class TestRefundNegative:
    def test_refund_pending_not_processed(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Processed refund."],
            ground_truth={
                "refund_id": "RF-002",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["status_match"] == 0.0

    def test_refund_denied(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Refund completed."],
            ground_truth={
                "refund_id": "RF-004",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL

    def test_refund_not_found(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "refund_id": "RF-999",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL

    def test_amount_mismatch(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Refunded."],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
                "expected_amount": 999.99,
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["amount_match"] == 0.0


# ══════════════════════════════════════════════════════════════════════════════
# Error / edge cases
# ══════════════════════════════════════════════════════════════════════════════


class TestRefundErrors:
    def test_bad_api_url(self):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
            },
            context={"api_base_url": "http://127.0.0.1:1"},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_multiple_completions(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["a", "b"],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert len(results) == 2
        assert all(r.verdict == Verdict.PASS for r in results)

    def test_tier_is_hard(self):
        v = RefundProcessedVerifier()
        assert v.tier.value == "HARD"

    def test_evidence_contains_refund_data(self, tau2_server):
        v = RefundProcessedVerifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "refund_id": "RF-001",
                "expected_status": "processed",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        evidence = results[0].evidence
        assert evidence["refund_status"] == "processed"
        assert evidence["refund_amount"] == 49.99
