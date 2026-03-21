"""Project management verifiers: Jira ticket status checks.

HARD-tier deterministic verifier that queries Jira REST API state.
Accepts either a live API token or a ``pre_result`` dict for testing.
"""

from __future__ import annotations

import os
import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _jira_api(base_url: str, endpoint: str, email: str, token: str) -> dict:
    """Make a GET request to the Jira REST API."""
    import httpx
    resp = httpx.get(
        f"{base_url.rstrip('/')}{endpoint}",
        auth=(email, token),
        headers={"Accept": "application/json"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


class TicketTransitionedVerifier(BaseVerifier):
    """Verifies that a Jira ticket has been transitioned to an expected status.

    Ground truth schema::

        {
            "ticket_key": str,           # e.g. "PROJ-42"
            "expected_status": str,      # e.g. "Done"
            "pre_result": dict | null    # { "status": str, "assignee": str }
        }

    Environment variables: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
    """

    name = "project.jira.ticket_transitioned"
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
        ticket_key = gt.get("ticket_key", "")
        expected_status = gt.get("expected_status", "")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"ticket_key": ticket_key, "expected_status": expected_status}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            actual_status = pre_result.get("status", "")
        elif ticket_key and expected_status:
            base_url = os.environ.get("JIRA_BASE_URL", "")
            email = os.environ.get("JIRA_EMAIL", "")
            token = os.environ.get("JIRA_API_TOKEN", "")
            if not all([base_url, email, token]):
                evidence["error"] = "JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN not set"
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:jira"])
            try:
                data = _jira_api(base_url, f"/rest/api/3/issue/{ticket_key}", email, token)
                actual_status = data.get("fields", {}).get("status", {}).get("name", "")
                evidence["assignee"] = (
                    data.get("fields", {}).get("assignee", {}) or {}
                ).get("displayName")
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:jira"], retryable=True)
        else:
            evidence["error"] = "no ticket_key/expected_status or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:jira"])

        evidence["actual_status"] = actual_status
        breakdown["status_match"] = 1.0 if actual_status.lower() == expected_status.lower() else 0.0
        score = breakdown["status_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            hints.append(f"Ticket {ticket_key} is in status '{actual_status}', expected '{expected_status}'")
            hints.append("Transition the ticket to the expected status")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:jira"], repair_hints=hints)
