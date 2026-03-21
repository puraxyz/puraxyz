"""Tests for vr/tau2.retail.inventory_updated - HARD verifier."""

from __future__ import annotations


from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.tau2.inventory import InventoryUpdatedVerifier


# ── Tests ────────────────────────────────────────────────────────────────────


class TestInventoryUpdated:
    def test_tier_is_hard(self):
        v = InventoryUpdatedVerifier()
        assert v.tier == Tier.HARD

    def test_name(self):
        v = InventoryUpdatedVerifier()
        assert v.name == "tau2.retail.inventory_updated"

    def test_pass_quantity_match(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["restocked SKU-100"],
            ground_truth={"sku": "SKU-100", "expected_quantity": 42},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert len(results) == 1
        r = results[0]
        assert r.verdict == Verdict.PASS
        assert r.score == 1.0
        assert r.breakdown["quantity_match"] == 1.0

    def test_fail_wrong_quantity(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["restocked SKU-100"],
            ground_truth={"sku": "SKU-100", "expected_quantity": 999},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        r = results[0]
        assert r.verdict == Verdict.FAIL
        assert r.breakdown["quantity_match"] == 0.0

    def test_pass_with_warehouse(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["moved to WH-EAST"],
            ground_truth={
                "sku": "SKU-100",
                "expected_quantity": 42,
                "expected_warehouse": "WH-EAST",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        r = results[0]
        assert r.verdict == Verdict.PASS
        assert r.breakdown["quantity_match"] == 1.0
        assert r.breakdown["warehouse_match"] == 1.0

    def test_fail_wrong_warehouse(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["moved to WH-WEST"],
            ground_truth={
                "sku": "SKU-100",
                "expected_quantity": 42,
                "expected_warehouse": "WH-WEST",
            },
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        r = results[0]
        assert r.verdict == Verdict.FAIL
        # quantity matches but warehouse doesn't
        assert r.breakdown["quantity_match"] == 1.0
        assert r.breakdown["warehouse_match"] == 0.0

    def test_sku_not_found(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["checked inventory"],
            ground_truth={"sku": "SKU-NOPE", "expected_quantity": 1},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        r = results[0]
        assert r.verdict == Verdict.FAIL
        assert r.breakdown.get("item_found") == 0.0

    def test_zero_quantity(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["sold out"],
            ground_truth={"sku": "SKU-200", "expected_quantity": 0},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_multiple_completions(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["a", "b", "c"],
            ground_truth={"sku": "SKU-100", "expected_quantity": 42},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert len(results) == 3

    def test_error_bad_server(self):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["check inventory"],
            ground_truth={"sku": "SKU-100", "expected_quantity": 42},
            context={"api_base_url": "http://127.0.0.1:1"},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_provenance(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["check"],
            ground_truth={"sku": "SKU-100", "expected_quantity": 42},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].provenance.source_benchmark == "τ²-bench"
        assert "2406.12045" in results[0].provenance.source_citation

    def test_evidence_has_actual_values(self, tau2_server):
        v = InventoryUpdatedVerifier()
        inp = VerifierInput(
            completions=["check"],
            ground_truth={"sku": "SKU-300", "expected_quantity": 150},
            context={"api_base_url": tau2_server},
        )
        results = v.verify(inp)
        assert results[0].evidence["actual_quantity"] == 150
        assert results[0].evidence["actual_warehouse"] == "WH-EAST"
