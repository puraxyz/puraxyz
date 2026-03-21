"""Tests for database verifiers using pre_result shortcut."""

from __future__ import annotations

from vrdev.core.types import VerifierInput
from vrdev.tasks.database import (
    RowExistsVerifier,
    RowUpdatedVerifier,
    TableRowCountVerifier,
)


def _inp(gt: dict) -> VerifierInput:
    return VerifierInput(completions=["done"], ground_truth=gt)


class TestRowExists:
    def test_pass_with_pre_result(self):
        v = RowExistsVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 1},
            "pre_result": {"exists": True},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_with_pre_result(self):
        v = RowExistsVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 999},
            "pre_result": {"exists": False},
        }))
        assert results[0].verdict.value == "FAIL"

    def test_error_no_connection(self):
        v = RowExistsVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 1},
        }))
        assert results[0].verdict.value == "ERROR"


class TestRowUpdated:
    def test_pass_with_pre_result(self):
        v = RowUpdatedVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 1},
            "expected_values": {"name": "Alice", "age": "30"},
            "pre_result": {"row": {"name": "Alice", "age": "30"}},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_partial_match(self):
        v = RowUpdatedVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 1},
            "expected_values": {"name": "Alice", "age": "30"},
            "pre_result": {"row": {"name": "Alice", "age": "25"}},
        }))
        assert results[0].verdict.value == "FAIL"
        assert results[0].repair_hints

    def test_error_no_connection(self):
        v = RowUpdatedVerifier()
        results = v.verify(_inp({
            "table": "users",
            "match_columns": {"id": 1},
            "expected_values": {"name": "Alice"},
        }))
        assert results[0].verdict.value == "ERROR"


class TestTableRowCount:
    def test_pass_exact(self):
        v = TableRowCountVerifier()
        results = v.verify(_inp({
            "table": "users",
            "expected_count": 10,
            "pre_result": {"count": 10},
        }))
        assert results[0].verdict.value == "PASS"

    def test_pass_within_tolerance(self):
        v = TableRowCountVerifier()
        results = v.verify(_inp({
            "table": "users",
            "expected_count": 10,
            "tolerance": 2,
            "pre_result": {"count": 11},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_outside_tolerance(self):
        v = TableRowCountVerifier()
        results = v.verify(_inp({
            "table": "users",
            "expected_count": 10,
            "tolerance": 0,
            "pre_result": {"count": 15},
        }))
        assert results[0].verdict.value == "FAIL"

    def test_error_no_connection(self):
        v = TableRowCountVerifier()
        results = v.verify(_inp({
            "table": "users",
            "expected_count": 5,
        }))
        assert results[0].verdict.value == "ERROR"
