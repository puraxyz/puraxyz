"""Tests for Phase C enterprise verifiers (8 verifiers across 4 domains).

All tests use the ``pre_result`` dict in ground_truth to avoid needing
real API credentials (GitHub, Slack, Stripe, Jira).
"""

from __future__ import annotations


from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.git import CiPassedVerifier, PrMergedVerifier, WorkflowPassedVerifier
from vrdev.tasks.messaging import SlackMessageSentVerifier, SlackReactionAddedVerifier
from vrdev.tasks.payment import ChargeSucceededVerifier, RefundProcessedVerifier
from vrdev.tasks.project import TicketTransitionedVerifier


class TestPrMerged:
    def _make(self, pre_result: dict, **gt_extra) -> VerifierInput:
        gt = {"repo": "owner/repo", "pr_number": 42, "pre_result": pre_result, **gt_extra}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_meta(self):
        v = PrMergedVerifier()
        assert v.name == "git.pr.merged"
        assert v.tier == Tier.HARD

    def test_pass_merged_correct_branch(self):
        v = PrMergedVerifier()
        inp = self._make({"merged": True, "base_branch": "main"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["merged"] == 1.0
        assert results[0].breakdown["target_branch_match"] == 1.0
        assert results[0].repair_hints == []

    def test_fail_not_merged(self):
        v = PrMergedVerifier()
        inp = self._make({"merged": False, "base_branch": "main"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["merged"] == 0.0
        assert len(results[0].repair_hints) > 0
        assert "not been merged" in results[0].repair_hints[0]

    def test_fail_wrong_branch(self):
        v = PrMergedVerifier()
        inp = self._make({"merged": True, "base_branch": "develop"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["target_branch_match"] == 0.0
        assert any("develop" in h for h in results[0].repair_hints)

    def test_error_no_inputs(self):
        v = PrMergedVerifier()
        inp = VerifierInput(completions=["done"], ground_truth={})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR


# ═══════════════════════════════════════════════════════════════════════════════
# Git domain - CiPassedVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestCiPassed:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"repo": "owner/repo", "commit_sha": "abc123", "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_all_checks_success(self):
        v = CiPassedVerifier()
        inp = self._make({"all_passed": True, "check_runs": [
            {"name": "lint", "conclusion": "success"},
            {"name": "test", "conclusion": "success"},
        ]})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].repair_hints == []

    def test_fail_check_failed(self):
        v = CiPassedVerifier()
        inp = self._make({"all_passed": False, "check_runs": [
            {"name": "lint", "conclusion": "success"},
            {"name": "test", "conclusion": "failure"},
        ]})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("test" in h for h in results[0].repair_hints)

    def test_fail_no_checks(self):
        v = CiPassedVerifier()
        inp = self._make({"all_passed": False, "check_runs": []})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("No CI" in h for h in results[0].repair_hints)


# ═══════════════════════════════════════════════════════════════════════════════
# Git domain - WorkflowPassedVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestWorkflowPassed:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"repo": "owner/repo", "workflow_name": "CI", "ref": "main", "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_success(self):
        v = WorkflowPassedVerifier()
        inp = self._make({"conclusion": "success", "status": "completed"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].repair_hints == []

    def test_fail_workflow_failed(self):
        v = WorkflowPassedVerifier()
        inp = self._make({"conclusion": "failure", "status": "completed"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("failure" in h for h in results[0].repair_hints)

    def test_fail_no_run_found(self):
        v = WorkflowPassedVerifier()
        inp = self._make({"conclusion": "", "status": ""})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("No workflow" in h for h in results[0].repair_hints)


# ═══════════════════════════════════════════════════════════════════════════════
# Messaging domain - SlackMessageSentVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestSlackMessageSent:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"channel_id": "C12345", "text_contains": "deploy complete", "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_message_found(self):
        v = SlackMessageSentVerifier()
        inp = self._make({"found": True, "message_ts": "1234567890.000001"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["message_found"] == 1.0
        assert results[0].repair_hints == []

    def test_fail_message_not_found(self):
        v = SlackMessageSentVerifier()
        inp = self._make({"found": False})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert len(results[0].repair_hints) > 0
        assert "deploy complete" in results[0].repair_hints[0]

    def test_error_no_inputs(self):
        v = SlackMessageSentVerifier()
        inp = VerifierInput(completions=["done"], ground_truth={})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR


# ═══════════════════════════════════════════════════════════════════════════════
# Messaging domain - SlackReactionAddedVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestSlackReactionAdded:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"channel_id": "C12345", "message_ts": "123.456", "reaction_name": "thumbsup",
              "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_reaction_present(self):
        v = SlackReactionAddedVerifier()
        inp = self._make({"has_reaction": True})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].repair_hints == []

    def test_fail_reaction_missing(self):
        v = SlackReactionAddedVerifier()
        inp = self._make({"has_reaction": False})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("thumbsup" in h for h in results[0].repair_hints)


# ═══════════════════════════════════════════════════════════════════════════════
# Payment domain - ChargeSucceededVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestChargeSucceeded:
    def _make(self, pre_result: dict, **gt_extra) -> VerifierInput:
        gt = {"charge_id": "ch_test_123", "pre_result": pre_result, **gt_extra}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_charge_succeeded(self):
        v = ChargeSucceededVerifier()
        inp = self._make({"status": "succeeded", "paid": True, "amount": 2000, "currency": "usd"},
                         amount=2000, currency="usd")
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["charge_succeeded"] == 1.0
        assert results[0].breakdown["amount_match"] == 1.0
        assert results[0].breakdown["currency_match"] == 1.0
        assert results[0].repair_hints == []

    def test_fail_not_paid(self):
        v = ChargeSucceededVerifier()
        inp = self._make({"status": "failed", "paid": False, "amount": 2000})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("not paid" in h for h in results[0].repair_hints)

    def test_fail_amount_mismatch(self):
        v = ChargeSucceededVerifier()
        inp = self._make({"status": "succeeded", "paid": True, "amount": 999, "currency": "usd"},
                         amount=2000, currency="usd")
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["charge_succeeded"] == 1.0
        assert results[0].breakdown["amount_match"] == 0.0
        assert any("Amount mismatch" in h for h in results[0].repair_hints)

    def test_fail_currency_mismatch(self):
        v = ChargeSucceededVerifier()
        inp = self._make({"status": "succeeded", "paid": True, "amount": 2000, "currency": "eur"},
                         amount=2000, currency="usd")
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["currency_match"] == 0.0

    def test_error_no_inputs(self):
        v = ChargeSucceededVerifier()
        inp = VerifierInput(completions=["done"], ground_truth={})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR


# ═══════════════════════════════════════════════════════════════════════════════
# Payment domain - RefundProcessedVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestRefundProcessed:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"refund_id": "re_test_123", "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_refund_succeeded(self):
        v = RefundProcessedVerifier()
        inp = self._make({"status": "succeeded", "amount": 1500})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["refund_succeeded"] == 1.0
        assert results[0].repair_hints == []
        assert results[0].retryable is False

    def test_fail_refund_pending(self):
        v = RefundProcessedVerifier()
        inp = self._make({"status": "pending", "amount": 1500})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].retryable is True
        assert any("pending" in h for h in results[0].repair_hints)

    def test_fail_refund_failed(self):
        v = RefundProcessedVerifier()
        inp = self._make({"status": "failed", "amount": 1500})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].retryable is False


# ═══════════════════════════════════════════════════════════════════════════════
# Project domain - TicketTransitionedVerifier
# ═══════════════════════════════════════════════════════════════════════════════


class TestTicketTransitioned:
    def _make(self, pre_result: dict) -> VerifierInput:
        gt = {"ticket_key": "PROJ-42", "expected_status": "Done", "pre_result": pre_result}
        return VerifierInput(completions=["done"], ground_truth=gt)

    def test_pass_correct_status(self):
        v = TicketTransitionedVerifier()
        inp = self._make({"status": "Done", "assignee": "alice"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["status_match"] == 1.0
        assert results[0].repair_hints == []

    def test_pass_case_insensitive(self):
        v = TicketTransitionedVerifier()
        inp = self._make({"status": "done"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_fail_wrong_status(self):
        v = TicketTransitionedVerifier()
        inp = self._make({"status": "In Progress"})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert any("In Progress" in h for h in results[0].repair_hints)

    def test_error_no_inputs(self):
        v = TicketTransitionedVerifier()
        inp = VerifierInput(completions=["done"], ground_truth={})
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR


# ═══════════════════════════════════════════════════════════════════════════════
# Multiple completions
# ═══════════════════════════════════════════════════════════════════════════════


class TestMultipleCompletions:
    """Verify that each enterprise verifier returns one result per completion."""

    def test_pr_merged_multi(self):
        v = PrMergedVerifier()
        inp = VerifierInput(
            completions=["a", "b", "c"],
            ground_truth={"repo": "o/r", "pr_number": 1,
                          "pre_result": {"merged": True, "base_branch": "main"}},
        )
        assert len(v.verify(inp)) == 3

    def test_charge_multi(self):
        v = ChargeSucceededVerifier()
        inp = VerifierInput(
            completions=["a", "b"],
            ground_truth={"charge_id": "ch_1",
                          "pre_result": {"status": "succeeded", "paid": True}},
        )
        results = v.verify(inp)
        assert len(results) == 2
        assert all(r.verdict == Verdict.PASS for r in results)
