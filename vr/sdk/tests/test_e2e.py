"""End-to-end integration tests for Phase 1.

Demonstrates the full verify → compose → explain → retry loop using
all three verifier tiers composed together.

Scenario: An AI agent handles an order cancellation + confirmation email.
  1. HARD:    OrderCancelledVerifier checks API state
  2. AGENTIC: SentFolderConfirmedVerifier checks IMAP sent folder
  3. SOFT:    ToneProfessionalVerifier checks email quality via LLM
  4. Composition with require_hard=True gates SOFT on HARD+AGENTIC

The mock τ²-bench server, MockIMAPRunner, and StubJudge ensure all
tests run deterministically without external services.
"""

from __future__ import annotations


from vrdev.adapters.openclaw import compose_chain, explain_failure, run_verifier
from vrdev.core.compose import compose
from vrdev.core.llm import StubJudge
from vrdev.core.registry import get_verifier
from vrdev.core.types import Tier, Verdict, VerifierInput

from mocks.imap_mock import MockIMAPRunner


# ── Helpers ──────────────────────────────────────────────────────────────────


def _full_input(api_base: str) -> VerifierInput:
    """VerifierInput for the full cancel-and-email scenario."""
    return VerifierInput(
        completions=[
            "Dear Customer,\n\nYour order ORD-001 has been cancelled per your request.\n"
            "Confirmation number: CN-2026-0415.\n\nBest regards,\nSupport Team"
        ],
        ground_truth={
            # For OrderCancelledVerifier
            "order_id": "ORD-001",
            "expected_status": "cancelled",
            "expected_reason": "customer_request",
            # For SentFolderConfirmedVerifier
            "recipient": "customer@example.com",
            "subject_fragment": "Cancellation",
            # For ToneProfessionalVerifier
            "key_information_required": ["order cancellation", "confirmation number"],
        },
        context={
            "api_base_url": api_base,
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# Individual verifier smoke tests (via adapter)
# ══════════════════════════════════════════════════════════════════════════════


class TestRunVerifierAdapter:
    """Test the run_verifier adapter function."""

    def test_run_order_verifier(self, tau2_server):
        results = run_verifier(
            "vr/tau2.retail.order_cancelled",
            _full_input(tau2_server),
        )
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS

    def test_run_email_verifier_with_mock(self):
        runner = MockIMAPRunner(
            emails=[{
                "recipient": "customer@example.com",
                "subject": "Order Cancellation Confirmation",
                "message_id": "<e2e-001@test>",
            }]
        )
        results = run_verifier(
            "vr/aiv.email.sent_folder_confirmed",
            _full_input("http://unused"),
            imap_runner=runner,
        )
        assert results[0].verdict == Verdict.PASS

    def test_run_rubric_verifier_with_stub(self):
        judge = StubJudge(
            '{"greeting_present": 1, "appropriate_formality": 1, '
            '"key_info_included": 1, "no_inappropriate_content": 1}'
        )
        results = run_verifier(
            "vr/rubric.email.tone_professional",
            _full_input("http://unused"),
            judge=judge,
        )
        assert results[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# Full composition: all three tiers
# ══════════════════════════════════════════════════════════════════════════════


class TestFullComposition:
    """Compose HARD + AGENTIC + SOFT with require_hard=True gating."""

    def _compose_all(
        self,
        api_base: str,
        imap_runner: MockIMAPRunner,
        judge: StubJudge,
    ) -> list:
        order_v = get_verifier("vr/tau2.retail.order_cancelled")
        email_v = get_verifier("vr/aiv.email.sent_folder_confirmed", imap_runner=imap_runner)
        rubric_v = get_verifier("vr/rubric.email.tone_professional", judge=judge)

        composed = compose(
            [order_v, email_v, rubric_v],
            require_hard=True,
        )
        return composed.verify(_full_input(api_base))

    def test_all_pass(self, tau2_server):
        """All three tiers pass → composed PASS."""
        imap = MockIMAPRunner(
            emails=[{
                "recipient": "customer@example.com",
                "subject": "Order Cancellation Confirmation",
                "message_id": "<e2e-pass@test>",
            }]
        )
        judge = StubJudge(
            '{"greeting_present": 1, "appropriate_formality": 1, '
            '"key_info_included": 1, "no_inappropriate_content": 1}'
        )
        results = self._compose_all(tau2_server, imap, judge)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score > 0.9

    def test_hard_fail_gates_soft(self, tau2_server):
        """HARD verifier fails → composed score = 0 (hard gate)."""
        imap = MockIMAPRunner(
            emails=[{
                "recipient": "customer@example.com",
                "subject": "Order Cancellation Confirmation",
                "message_id": "<e2e-gate@test>",
            }]
        )
        judge = StubJudge(
            '{"greeting_present": 1, "appropriate_formality": 1, '
            '"key_info_included": 1, "no_inappropriate_content": 1}'
        )
        # Use ORD-002 (active, not cancelled) → HARD FAIL
        inp = VerifierInput(
            completions=["Dear Customer, your order is cancelled."],
            ground_truth={
                "order_id": "ORD-002",
                "expected_status": "cancelled",
                "recipient": "customer@example.com",
                "subject_fragment": "Cancellation",
                "key_information_required": ["cancellation"],
            },
            context={"api_base_url": tau2_server},
        )

        order_v = get_verifier("vr/tau2.retail.order_cancelled")
        email_v = get_verifier("vr/aiv.email.sent_folder_confirmed", imap_runner=imap)
        rubric_v = get_verifier("vr/rubric.email.tone_professional", judge=judge)

        composed = compose([order_v, email_v, rubric_v], require_hard=True)
        results = composed.verify(inp)

        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True

    def test_agentic_fail_gates_soft(self, tau2_server):
        """AGENTIC email not found → gate fails → score = 0."""
        imap = MockIMAPRunner(emails=[])  # No emails → FAIL
        judge = StubJudge(
            '{"greeting_present": 1, "appropriate_formality": 1, '
            '"key_info_included": 1, "no_inappropriate_content": 1}'
        )
        results = self._compose_all(tau2_server, imap, judge)
        assert results[0].score == 0.0
        assert results[0].metadata.hard_gate_failed is True

    def test_soft_fail_does_not_gate(self, tau2_server):
        """HARD+AGENTIC pass but SOFT fails → composed runs, non-zero score."""
        imap = MockIMAPRunner(
            emails=[{
                "recipient": "customer@example.com",
                "subject": "Order Cancellation Confirmation",
                "message_id": "<e2e-soft@test>",
            }]
        )
        judge = StubJudge(
            '{"greeting_present": 0, "appropriate_formality": 0, '
            '"key_info_included": 0, "no_inappropriate_content": 0}'
        )
        results = self._compose_all(tau2_server, imap, judge)
        # HARD=1.0, AGENTIC=1.0, SOFT=0.0 → avg=0.6667
        assert results[0].metadata.hard_gate_failed is False
        assert results[0].score > 0.0


# ══════════════════════════════════════════════════════════════════════════════
# Explain failure adapter
# ══════════════════════════════════════════════════════════════════════════════


class TestExplainFailure:
    def test_explain_produces_text(self, tau2_server):
        """explain_failure should produce human-readable retry instructions."""
        v = get_verifier("vr/tau2.retail.order_cancelled")
        inp = VerifierInput(
            completions=["I cancelled the order."],
            ground_truth={"order_id": "ORD-002", "expected_status": "cancelled"},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL

        explanation = explain_failure(results[0])
        assert isinstance(explanation, dict)
        assert "likely_cause" in explanation
        assert "suggested_action" in explanation
        assert "message" in explanation
        # Should mention what failed
        assert "FAIL" in explanation["message"] or "status_match" in explanation["likely_cause"]


# ══════════════════════════════════════════════════════════════════════════════
# compose_chain adapter
# ══════════════════════════════════════════════════════════════════════════════


class TestComposeChainAdapter:
    def test_compose_chain_two_verifiers(self, tau2_server):
        """compose_chain builds a composed verifier from registry IDs."""
        inp = VerifierInput(
            completions=["Agent rebooked flight BK-001."],
            ground_truth={
                "order_id": "ORD-001",
                "expected_status": "cancelled",
                "booking_id": "BK-001",
                "expected_date": "2026-04-15",
            },
            context={"api_base_url": tau2_server},
        )
        results = compose_chain(
            ["vr/tau2.retail.order_cancelled", "vr/tau2.airline.rebooking_correct"],
            inp,
            require_hard=True,
        )
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS

    def test_compose_chain_mixed_tiers(self, tau2_server):
        """HARD + pure-logic verifiers compose correctly."""
        inp = VerifierInput(
            completions=["Agent processed refund."],
            ground_truth={
                "order_id": "ORD-001",
                "expected_status": "cancelled",
                "policies": [
                    {"rule_id": "r1", "field": "amount", "operator": "lte", "value": 100}
                ],
                "actions": [{"type": "refund", "amount": 50}],
            },
            context={"api_base_url": tau2_server},
        )
        results = compose_chain(
            ["vr/tau2.retail.order_cancelled", "vr/tau2.policy.constraint_not_violated"],
            inp,
        )
        assert results[0].verdict == Verdict.PASS


# ══════════════════════════════════════════════════════════════════════════════
# Tier inheritance in composition
# ══════════════════════════════════════════════════════════════════════════════


class TestComposedTier:
    def test_hard_only_composition_is_hard(self):
        v1 = get_verifier("vr/tau2.retail.order_cancelled")
        v2 = get_verifier("vr/tau2.policy.constraint_not_violated")
        composed = compose([v1, v2])
        assert composed.tier == Tier.HARD

    def test_agentic_present_makes_agentic(self):
        v1 = get_verifier("vr/tau2.retail.order_cancelled")
        v2 = get_verifier("vr/aiv.email.sent_folder_confirmed")
        composed = compose([v1, v2])
        assert composed.tier == Tier.AGENTIC

    def test_all_tiers_present_makes_agentic(self):
        v1 = get_verifier("vr/tau2.retail.order_cancelled")
        v2 = get_verifier("vr/aiv.email.sent_folder_confirmed")
        v3 = get_verifier("vr/rubric.email.tone_professional")
        composed = compose([v1, v2, v3])
        assert composed.tier == Tier.AGENTIC
