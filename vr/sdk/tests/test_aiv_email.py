"""Tests for the SentFolderConfirmedVerifier (vr/aiv.email.sent_folder_confirmed).

Uses MockIMAPRunner injected via the constructor for all tests -
no real IMAP server needed.
"""

from __future__ import annotations


from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.aiv.email import SentFolderConfirmedVerifier

from mocks.imap_mock import MockIMAPRunner


def _email_input(
    recipient: str = "customer@example.com",
    subject_fragment: str | None = "Cancellation",
    window_minutes: int = 10,
) -> VerifierInput:
    gt: dict = {"recipient": recipient, "window_minutes": window_minutes}
    if subject_fragment is not None:
        gt["subject_fragment"] = subject_fragment
    return VerifierInput(
        completions=["Email sent to customer."],
        ground_truth=gt,
    )


# ── Basic metadata ───────────────────────────────────────────────────────────


class TestEmailVerifierMeta:
    def test_tier_is_agentic(self):
        assert SentFolderConfirmedVerifier().tier == Tier.AGENTIC

    def test_name(self):
        assert SentFolderConfirmedVerifier().name == "aiv.email.sent_folder_confirmed"


# ── PASS: email found ────────────────────────────────────────────────────────


class TestEmailFound:
    def test_pass_matching_email(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(
            _email_input(recipient="customer@example.com", subject_fragment="Cancellation")
        )
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].breakdown["email_found_in_sent"] == 1.0

    def test_pass_evidence_has_message_id(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(_email_input())
        assert results[0].evidence["message_id"] == "<test-001@vrdev.test>"

    def test_pass_evidence_has_folder(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(_email_input())
        assert results[0].evidence["folder"] == "Sent"


# ── FAIL: email not found ───────────────────────────────────────────────────


class TestEmailNotFound:
    def test_fail_empty_mailbox(self, mock_imap_empty):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_empty)
        results = v.verify(_email_input())
        assert results[0].verdict == Verdict.FAIL
        assert results[0].score == 0.0

    def test_fail_wrong_recipient(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(
            _email_input(recipient="wrong@example.com")
        )
        assert results[0].verdict == Verdict.FAIL

    def test_fail_wrong_subject(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(
            _email_input(subject_fragment="Nonexistent Subject")
        )
        assert results[0].verdict == Verdict.FAIL


# ── ERROR: connection failure ────────────────────────────────────────────────


class TestEmailConnectionError:
    def test_error_connection_failed(self, mock_imap_connection_error):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_connection_error)
        results = v.verify(_email_input())
        assert results[0].verdict == Verdict.ERROR
        assert results[0].score == 0.0
        assert "connection_error" in results[0].evidence

    def test_error_no_config_no_injection(self):
        """Without injected runner AND no imap_config, it attempts real IMAP
        which should fail with a connection error (no real server)."""
        v = SentFolderConfirmedVerifier()
        results = v.verify(_email_input())
        assert results[0].verdict == Verdict.ERROR


# ── Provenance & multiple completions ────────────────────────────────────────


class TestEmailMisc:
    def test_provenance(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(_email_input())
        assert results[0].provenance.source_benchmark == "VAGEN"

    def test_hashes_computed(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        results = v.verify(_email_input())
        assert results[0].artifact_hash != ""
        assert results[0].input_hash != ""

    def test_multiple_completions(self, mock_imap_with_email):
        v = SentFolderConfirmedVerifier(imap_runner=mock_imap_with_email)
        inp = VerifierInput(
            completions=["sent email", "also sent email"],
            ground_truth={"recipient": "customer@example.com"},
        )
        results = v.verify(inp)
        assert len(results) == 2

    def test_multiple_emails_in_mailbox(self):
        """Multiple emails, match by recipient + subject."""
        runner = MockIMAPRunner(
            emails=[
                {"recipient": "a@x.com", "subject": "Invoice 123", "message_id": "<m1>"},
                {"recipient": "b@x.com", "subject": "Refund Notice", "message_id": "<m2>"},
                {"recipient": "a@x.com", "subject": "Refund Notice", "message_id": "<m3>"},
            ]
        )
        v = SentFolderConfirmedVerifier(imap_runner=runner)
        results = v.verify(
            _email_input(recipient="a@x.com", subject_fragment="Refund")
        )
        assert results[0].verdict == Verdict.PASS
        assert results[0].evidence["message_id"] == "<m3>"
