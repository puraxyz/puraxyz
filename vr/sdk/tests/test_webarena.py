"""Tests for vr/web.ecommerce.order_placed - OrderPlacedVerifier."""

from __future__ import annotations

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.web.ecommerce_order import OrderPlacedVerifier


@pytest.fixture
def verifier():
    return OrderPlacedVerifier()


class TestOrderPlaced:
    """Positive: order exists in confirmed state with correct items."""

    def test_confirmed_order_with_items(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["placed order"],
            ground_truth={
                "order_id": "WEB-001",
                "expected_items": ["Widget A", "Widget B"],
                "expected_total": 49.98,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score > 0.9
        assert results[0].breakdown["order_found"] == 1.0
        assert results[0].breakdown["items_match"] == 1.0
        assert results[0].breakdown["total_match"] == 1.0

    def test_placed_status_also_passes(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "order_id": "WEB-004",
                "expected_items": ["Mega Pack", "Widget A", "Gadget X"],
                "expected_total": 299.97,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_no_total_check_if_null(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "order_id": "WEB-002",
                "expected_items": ["Gadget X"],
                "expected_total": None,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS


class TestOrderNotPlaced:
    """Negative: order not found or cancelled."""

    def test_nonexistent_order(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"order_id": "WEB-999"},
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence.get("reason") == "order not found"

    def test_cancelled_order_fails(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "order_id": "WEB-003",
                "expected_items": ["Widget A"],
                "expected_total": 24.99,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["order_found"] == 0.0

    def test_wrong_items_fails(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "order_id": "WEB-001",
                "expected_items": ["Nonexistent Item"],
                "expected_total": 49.98,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["items_match"] == 0.0

    def test_wrong_total_fails(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "order_id": "WEB-001",
                "expected_items": ["Widget A", "Widget B"],
                "expected_total": 999.99,
            },
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["total_match"] == 0.0


class TestOrderPlacedMetadata:
    """Evidence, provenance, metadata."""

    def test_provenance(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"order_id": "WEB-001"},
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].provenance.source_benchmark == "WebArena"
        assert "2307.13854" in results[0].provenance.source_citation

    def test_execution_ms_populated(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"order_id": "WEB-001"},
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms >= 0

    def test_multiple_completions(self, verifier, webarena_server):
        inp = VerifierInput(
            completions=["a", "b"],
            ground_truth={"order_id": "WEB-001", "expected_items": ["Widget A", "Widget B"]},
            context={"api_base_url": webarena_server},
        )
        results = verifier.verify(inp)
        assert len(results) == 2
