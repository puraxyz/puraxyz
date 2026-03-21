"""vr/aiv.calendar.event_created - AGENTIC verifier for calendar event creation.

Source: VAGEN (arXiv:2602.00575) - calendar domain
Queries a CalDAV-like REST API to confirm a calendar event was created
matching the expected date, title, and participants.
"""

from __future__ import annotations

import json
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.http import http_get


class EventCreatedVerifier(BaseVerifier):
    """Verifies that a calendar event was created with correct details.

    Ground truth schema::

        {
            "event_id": str | null,            # if null, search by title
            "expected_title": str,
            "expected_date": str,              # ISO date "YYYY-MM-DD"
            "expected_participants": list[str]  # email addresses
        }

    Context::

        {"api_base_url": str}   # defaults to http://localhost:8080
    """

    name = "aiv.calendar.event_created"
    tier = Tier.AGENTIC
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        event_id = gt.get("event_id")
        expected_title = gt.get("expected_title", "")
        expected_date = gt.get("expected_date", "")
        expected_participants = gt.get("expected_participants", [])
        api_base = (input_data.context or {}).get(
            "api_base_url", "http://localhost:8080"
        )

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                event_id, expected_title, expected_date,
                expected_participants, api_base, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        event_id: str | None,
        expected_title: str,
        expected_date: str,
        expected_participants: list[str],
        api_base: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {
            "expected_title": expected_title,
            "expected_date": expected_date,
            "api_base_url": api_base,
        }
        breakdown: dict[str, float] = {}

        # Fetch event
        if event_id:
            resp = http_get(f"{api_base}/events/{event_id}")
        else:
            # Search by title
            resp = http_get(f"{api_base}/events", params={"title": expected_title})

        evidence["http_status"] = resp.get("status_code")

        if resp["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": resp["error"]},
                input_data, permissions=["net:http"],
                source_benchmark="VAGEN", source_citation="arXiv:2602.00575",
            )

        if resp.get("status_code") == 404:
            evidence["reason"] = "event not found"
            return self._make_result(
                Verdict.FAIL, 0.0, {"event_found": 0.0},
                evidence, input_data, permissions=["net:http"],
                source_benchmark="VAGEN", source_citation="arXiv:2602.00575",
            )

        # Parse event body
        try:
            body = json.loads(resp.get("body", "{}"))
        except (json.JSONDecodeError, TypeError):
            body = {}

        # If search returned a list, take first match
        if isinstance(body, list):
            body = body[0] if body else {}

        evidence["event"] = body

        # Check 1: Event exists
        breakdown["event_found"] = 1.0 if body else 0.0

        # Check 2: Title matches
        actual_title = body.get("title", "")
        title_match = expected_title.lower() in actual_title.lower() if expected_title else True
        breakdown["title_match"] = 1.0 if title_match else 0.0

        # Check 3: Date matches
        actual_date = body.get("date", "")
        date_match = actual_date == expected_date if expected_date else True
        breakdown["date_match"] = 1.0 if date_match else 0.0

        # Check 4: Participants match
        actual_participants = set(body.get("participants", []))
        expected_set = set(expected_participants)
        if expected_set:
            participants_match = len(actual_participants & expected_set) / len(expected_set)
        else:
            participants_match = 1.0
        breakdown["participants_match"] = round(participants_match, 4)

        # Aggregate
        all_pass = (
            bool(body)
            and title_match
            and date_match
            and participants_match >= 1.0
        )
        score = sum(breakdown.values()) / len(breakdown) if breakdown else 0.0

        return self._make_result(
            Verdict.PASS if all_pass else Verdict.FAIL,
            round(score, 4), breakdown, evidence, input_data,
            permissions=["net:http"],
            source_benchmark="VAGEN", source_citation="arXiv:2602.00575",
        )
