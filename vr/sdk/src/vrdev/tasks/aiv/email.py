"""vr/aiv.email.sent_folder_confirmed - AGENTIC verifier for sent email.

Source: VAGEN (arXiv:2602.00575)
Opens IMAP connection to Sent folder, searches for matching message by
recipient and subject fragment within a time window. This is the headline
demo verifier - proves the "latent state" insight that UI confirmation
does not equal actual delivery.
"""

from __future__ import annotations

import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput


class SentFolderConfirmedVerifier(BaseVerifier):
    """Verifies that an email actually appears in the IMAP Sent folder.

    Ground truth schema::

        {
            "recipient": str,
            "subject_fragment": str | null,
            "window_minutes": int          # default 10
        }

    Context::

        {
            "imap_config": {
                "host": str, "port": int, "username": str,
                "password": str, "use_ssl": bool
            }
        }

    Accepts an optional ``imap_runner`` constructor kwarg for injecting
    a mock in tests.
    """

    name = "aiv.email.sent_folder_confirmed"
    tier = Tier.AGENTIC
    version = "0.1.0"

    def __init__(self, imap_runner: Any | None = None):
        self._imap_runner = imap_runner

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        recipient = gt.get("recipient")
        subject_fragment = gt.get("subject_fragment")
        window_minutes = gt.get("window_minutes", 10)
        imap_config = (input_data.context or {}).get("imap_config", {})

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                recipient, subject_fragment, window_minutes, imap_config, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        recipient: str | None,
        subject_fragment: str | None,
        window_minutes: int,
        imap_config: dict,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {
            "recipient": recipient,
            "subject_fragment": subject_fragment,
            "window_minutes": window_minutes,
        }

        runner = self._imap_runner
        if runner is None:
            from ...runners.imap import IMAPRunner

            runner = IMAPRunner(
                host=imap_config.get("host", "localhost"),
                port=imap_config.get("port", 993),
                username=imap_config.get("username", ""),
                password=imap_config.get("password", ""),
                use_ssl=imap_config.get("use_ssl", True),
            )

        # ── Connect ──────────────────────────────────────────────────────
        connect_result = runner.connect()
        if connect_result["verdict"] != Verdict.PASS:
            evidence["connection_error"] = connect_result.get("error")
            return self._make_result(
                Verdict.ERROR, 0.0, {}, evidence, input_data,
                permissions=["net:imap"],
                source_benchmark="VAGEN", source_citation="arXiv:2602.00575",
            )

        # ── Search Sent folder ───────────────────────────────────────────
        try:
            search_result = runner.search_sent(
                recipient=recipient,
                subject_fragment=subject_fragment,
                window_minutes=window_minutes,
            )

            evidence["search_query"] = search_result.get("search_query")
            evidence["folder"] = search_result.get("folder")
            evidence["messages_checked"] = search_result.get("messages_checked")
            evidence["message_id"] = search_result.get("message_id")

            if search_result.get("error"):
                evidence["error"] = search_result["error"]

            verdict = search_result["verdict"]
            score = 1.0 if verdict == Verdict.PASS else 0.0
            breakdown = {"email_found_in_sent": score}

            return self._make_result(
                verdict, score, breakdown, evidence, input_data,
                permissions=["net:imap"],
                source_benchmark="VAGEN", source_citation="arXiv:2602.00575",
            )
        finally:
            runner.disconnect()
