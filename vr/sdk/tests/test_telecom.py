"""Tests for vr/tau2.telecom.plan_changed - PlanChangedVerifier."""

from __future__ import annotations

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.tau2.telecom import PlanChangedVerifier


@pytest.fixture
def verifier():
    return PlanChangedVerifier()


class TestPlanChanged:
    """Positive: customer plan matches expected."""

    def test_plan_changed_correctly(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["Changed plan to Premium Unlimited"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
                "expected_effective_date": "2026-03-01",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score > 0.9
        assert results[0].breakdown["customer_found"] == 1.0
        assert results[0].breakdown["plan_match"] == 1.0
        assert results[0].breakdown["date_match"] == 1.0

    def test_case_insensitive_plan_match(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "premium unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["plan_match"] == 1.0

    def test_no_date_check(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-003",
                "expected_plan": "Family Share 20GB",
                "expected_effective_date": None,
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_multiple_completions(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["first", "second"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 2


class TestPlanNotChanged:
    """Negative: wrong plan or customer not found."""

    def test_nonexistent_customer(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-999",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence.get("reason") == "customer not found"

    def test_wrong_plan(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-002",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["plan_match"] == 0.0

    def test_wrong_effective_date(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
                "expected_effective_date": "2099-01-01",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["date_match"] == 0.0


class TestPlanChangedMetadata:
    """Evidence and metadata structure."""

    def test_evidence_keys(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        ev = results[0].evidence
        assert "customer_id" in ev
        assert "expected_plan" in ev
        assert "actual_plan" in ev
        assert "http_status" in ev

    def test_execution_ms_recorded(self, verifier, telecom_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms >= 0


class TestPlanChangedAdversarial:
    """Adversarial: agent claims success but CRM state disagrees."""

    def test_claims_wrong_plan(self, verifier, telecom_server):
        """Agent claims Premium Unlimited but TEL-002 is still on Basic 5GB."""
        inp = VerifierInput(
            completions=["I've successfully changed the plan to Premium Unlimited."],
            ground_truth={
                "customer_id": "TEL-002",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["plan_match"] == 0.0

    def test_claims_success_for_suspended_customer(self, verifier, telecom_server):
        """Agent claims plan changed but TEL-004 is on Basic 5GB, not Family Share."""
        inp = VerifierInput(
            completions=["Plan changed to Family Share 20GB for the customer."],
            ground_truth={
                "customer_id": "TEL-004",
                "expected_plan": "Family Share 20GB",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["plan_match"] == 0.0

    def test_claims_correct_date_but_api_disagrees(self, verifier, telecom_server):
        """Agent claims March 1 effective date but TEL-003's date is Feb 20."""
        inp = VerifierInput(
            completions=["Plan changed with effective date March 1, 2026."],
            ground_truth={
                "customer_id": "TEL-003",
                "expected_plan": "Family Share 20GB",
                "expected_effective_date": "2026-03-01",
            },
            context={"api_base_url": telecom_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["plan_match"] == 1.0  # plan matches
        assert results[0].breakdown["date_match"] == 0.0  # date does not

    def test_connection_error(self, verifier):
        """Agent claims success but verifier cannot reach CRM."""
        inp = VerifierInput(
            completions=["Plan changed successfully."],
            ground_truth={
                "customer_id": "TEL-001",
                "expected_plan": "Premium Unlimited",
            },
            context={"api_base_url": "http://127.0.0.1:1"},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.ERROR
