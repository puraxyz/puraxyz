"""Database verifiers: row existence, row update, and table row count.

All are HARD-tier deterministic verifiers that query database state.
They accept a connection_string or a pre-populated result dict in ground truth
so they can work in test/demo mode without a real DB connection.
"""

from __future__ import annotations

import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _query_db(connection_string: str, query: str, params: tuple | None = None) -> list[dict]:  # pragma: no cover
    """Execute a read-only query against a database.

    Supports sqlite3 out of the box; postgres requires psycopg2.
    """
    if connection_string.startswith("sqlite"):
        import sqlite3
        path = connection_string.replace("sqlite:///", "").replace("sqlite://", "")
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        cur = conn.execute(query, params or ())
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows
    raise ValueError(f"Unsupported connection string prefix: {connection_string.split(':')[0]}")


class RowExistsVerifier(BaseVerifier):
    """Verifies that a row matching given criteria exists in a table.

    Ground truth schema::

        {
            "connection_string": str | null,
            "table": str,
            "match_columns": dict[str, Any],
            "pre_result": dict | null   # shortcut for testing
        }

    If ``pre_result`` is provided, skip the actual query.
    """

    name = "database.row.exists"
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
        table = gt.get("table", "")
        match_columns = gt.get("match_columns", {})
        pre_result = gt.get("pre_result")
        conn_str = gt.get("connection_string")

        evidence: dict[str, Any] = {"table": table, "match_columns": match_columns}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            exists = pre_result.get("exists", False)
        elif conn_str:
            where = " AND ".join(f"{k} = ?" for k in match_columns)
            query = f"SELECT 1 FROM {table} WHERE {where} LIMIT 1"  # noqa: S608
            try:
                rows = _query_db(conn_str, query, tuple(match_columns.values()))
                exists = len(rows) > 0
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])
        else:
            evidence["error"] = "no connection_string or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])

        evidence["exists"] = exists
        breakdown["row_exists"] = 1.0 if exists else 0.0
        score = breakdown["row_exists"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            hints.append(f"Row not found in table '{table}' with given criteria")
            hints.append("Check table name and column values")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["db:read"],
                                 repair_hints=hints)


class RowUpdatedVerifier(BaseVerifier):
    """Verifies that a row was updated to contain expected values.

    Ground truth schema::

        {
            "connection_string": str | null,
            "table": str,
            "match_columns": dict[str, Any],
            "expected_values": dict[str, Any],
            "pre_result": dict | null
        }
    """

    name = "database.row.updated"
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
        table = gt.get("table", "")
        match_columns = gt.get("match_columns", {})
        expected_values = gt.get("expected_values", {})
        pre_result = gt.get("pre_result")
        conn_str = gt.get("connection_string")

        evidence: dict[str, Any] = {"table": table, "expected_values": expected_values}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            row = pre_result.get("row", {})
        elif conn_str:
            where = " AND ".join(f"{k} = ?" for k in match_columns)
            cols = ", ".join(expected_values.keys())
            query = f"SELECT {cols} FROM {table} WHERE {where} LIMIT 1"  # noqa: S608
            try:
                rows = _query_db(conn_str, query, tuple(match_columns.values()))
                row = rows[0] if rows else {}
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])
        else:
            evidence["error"] = "no connection_string or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])

        evidence["actual_row"] = row
        matched = 0
        for k, expected_v in expected_values.items():
            if str(row.get(k)) == str(expected_v):
                matched += 1

        breakdown["values_match"] = matched / len(expected_values) if expected_values else 1.0
        score = breakdown["values_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            for k, expected_v in expected_values.items():
                if str(row.get(k)) != str(expected_v):
                    hints.append(f"Column '{k}': expected '{expected_v}', got '{row.get(k)}'")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["db:read"],
                                 repair_hints=hints)


class TableRowCountVerifier(BaseVerifier):
    """Verifies that a table has the expected number of rows.

    Ground truth schema::

        {
            "connection_string": str | null,
            "table": str,
            "expected_count": int,
            "tolerance": int,
            "pre_result": dict | null
        }
    """

    name = "database.table.row_count"
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
        table = gt.get("table", "")
        expected_count = gt.get("expected_count", 0)
        tolerance = gt.get("tolerance", 0)
        pre_result = gt.get("pre_result")
        conn_str = gt.get("connection_string")

        evidence: dict[str, Any] = {"table": table, "expected_count": expected_count}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            actual = pre_result.get("count", 0)
        elif conn_str:
            query = f"SELECT COUNT(*) as cnt FROM {table}"  # noqa: S608
            try:
                rows = _query_db(conn_str, query)
                actual = rows[0]["cnt"] if rows else 0
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])
        else:
            evidence["error"] = "no connection_string or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["db:read"])

        evidence["actual_count"] = actual
        diff = abs(actual - expected_count)
        breakdown["count_match"] = 1.0 if diff <= tolerance else 0.0
        score = breakdown["count_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["db:read"])
