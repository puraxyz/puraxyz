"""Tests for vr/aiv.calendar.event_created - EventCreatedVerifier."""

from __future__ import annotations

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.aiv.calendar import EventCreatedVerifier


@pytest.fixture
def verifier():
    return EventCreatedVerifier()


class TestEventCreatedPositive:
    """Positive: event exists with correct details."""

    def test_event_by_id(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["created event"],
            ground_truth={
                "event_id": "EVT-001",
                "expected_title": "Team Standup",
                "expected_date": "2026-04-15",
                "expected_participants": ["alice@example.com", "bob@example.com"],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score > 0.9
        assert results[0].breakdown["event_found"] == 1.0
        assert results[0].breakdown["title_match"] == 1.0
        assert results[0].breakdown["date_match"] == 1.0
        assert results[0].breakdown["participants_match"] == 1.0

    def test_event_by_title_search(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": None,
                "expected_title": "Sprint Planning",
                "expected_date": "2026-04-16",
                "expected_participants": ["alice@example.com", "carol@example.com", "dave@example.com"],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_partial_title_match(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-003",
                "expected_title": "Client",
                "expected_date": "2026-04-17",
                "expected_participants": ["bob@example.com", "external@client.com"],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["title_match"] == 1.0


class TestEventCreatedNegative:
    """Negative: event not found or details mismatch."""

    def test_nonexistent_event(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-999",
                "expected_title": "Ghost Meeting",
                "expected_date": "2026-01-01",
                "expected_participants": [],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL

    def test_wrong_date(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-001",
                "expected_title": "Team Standup",
                "expected_date": "2099-12-31",
                "expected_participants": ["alice@example.com"],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["date_match"] == 0.0

    def test_wrong_participants(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-001",
                "expected_title": "Team Standup",
                "expected_date": "2026-04-15",
                "expected_participants": ["nobody@example.com"],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["participants_match"] == 0.0

    def test_title_search_no_match(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": None,
                "expected_title": "Nonexistent Meeting",
                "expected_date": "2026-01-01",
                "expected_participants": [],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL


class TestEventCreatedMetadata:
    """Evidence, provenance, metadata."""

    def test_provenance(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-001",
                "expected_title": "Team Standup",
                "expected_date": "2026-04-15",
                "expected_participants": [],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].provenance.source_benchmark == "VAGEN"
        assert "2602.00575" in results[0].provenance.source_citation

    def test_execution_ms(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "event_id": "EVT-001",
                "expected_title": "Team Standup",
                "expected_date": "2026-04-15",
                "expected_participants": [],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms >= 0

    def test_multiple_completions(self, verifier, calendar_server):
        inp = VerifierInput(
            completions=["a", "b", "c"],
            ground_truth={
                "event_id": "EVT-002",
                "expected_title": "Sprint Planning",
                "expected_date": "2026-04-16",
                "expected_participants": [],
            },
            context={"api_base_url": calendar_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 3
