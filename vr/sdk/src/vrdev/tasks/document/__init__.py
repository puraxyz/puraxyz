"""Document/file verifiers: JSON, CSV, text, YAML, and PDF checks.

All are HARD-tier deterministic verifiers that inspect file contents.
"""

from __future__ import annotations

import csv
import json
import os
import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


class JsonValidVerifier(BaseVerifier):
    """Verifies that a file contains valid JSON matching an expected structure.

    Ground truth schema::

        {
            "file_path": str,
            "expected_keys": list[str] | null,
            "expected_type": "object" | "array" | null
        }
    """

    name = "document.json.valid"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, completion, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, completion: str, input_data: VerifierInput) -> VerificationResult:
        file_path = gt.get("file_path", "")
        expected_keys = gt.get("expected_keys")
        expected_type = gt.get("expected_type")

        evidence: dict[str, Any] = {"file_path": file_path}
        breakdown: dict[str, float] = {}

        if not file_path or not os.path.isfile(file_path):
            evidence["error"] = "file not found"
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"],
                                     repair_hints=[f"File not found: {file_path}", "Check the file_path in ground_truth"])

        try:
            with open(file_path) as f:
                data = json.load(f)
            breakdown["valid_json"] = 1.0
        except (json.JSONDecodeError, OSError) as exc:
            evidence["error"] = str(exc)
            breakdown["valid_json"] = 0.0
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"],
                                     repair_hints=[f"Invalid JSON: {exc}", "Check for trailing commas or unquoted keys"])

        if expected_type:
            type_map = {"object": dict, "array": list}
            if isinstance(data, type_map.get(expected_type, object)):
                breakdown["type_match"] = 1.0
            else:
                breakdown["type_match"] = 0.0

        if expected_keys and isinstance(data, dict):
            present = sum(1 for k in expected_keys if k in data)
            breakdown["keys_match"] = present / len(expected_keys) if expected_keys else 1.0

        score = sum(breakdown.values()) / len(breakdown) if breakdown else 1.0
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            if breakdown.get("type_match", 1.0) < 1.0:
                hints.append(f"Expected JSON type '{expected_type}', got {type(data).__name__}")
            if breakdown.get("keys_match", 1.0) < 1.0:
                hints.append("Missing expected keys in JSON object")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["fs:read"],
                                 repair_hints=hints)


class CsvRowCountVerifier(BaseVerifier):
    """Verifies that a CSV file has the expected number of rows.

    Ground truth schema::

        {
            "file_path": str,
            "expected_rows": int,
            "tolerance": int    # default 0
        }
    """

    name = "document.csv.row_count"
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
        file_path = gt.get("file_path", "")
        expected_rows = gt.get("expected_rows", 0)
        tolerance = gt.get("tolerance", 0)

        evidence: dict[str, Any] = {"file_path": file_path, "expected_rows": expected_rows}
        breakdown: dict[str, float] = {}

        if not file_path or not os.path.isfile(file_path):
            evidence["error"] = "file not found"
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        try:
            with open(file_path, newline="") as f:
                reader = csv.reader(f)
                rows = sum(1 for _ in reader) - 1  # exclude header
            evidence["actual_rows"] = rows
            diff = abs(rows - expected_rows)
            breakdown["row_count_match"] = 1.0 if diff <= tolerance else 0.0
        except OSError as exc:
            evidence["error"] = str(exc)
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        score = breakdown.get("row_count_match", 0.0)
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["fs:read"])


class TextContainsVerifier(BaseVerifier):
    """Verifies that a text file contains all expected substrings.

    Ground truth schema::

        {
            "file_path": str,
            "expected_substrings": list[str],
            "case_sensitive": bool   # default true
        }
    """

    name = "document.text.contains"
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
        file_path = gt.get("file_path", "")
        expected = gt.get("expected_substrings", [])
        case_sensitive = gt.get("case_sensitive", True)

        evidence: dict[str, Any] = {"file_path": file_path}
        breakdown: dict[str, float] = {}

        if not file_path or not os.path.isfile(file_path):
            evidence["error"] = "file not found"
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        try:
            content = open(file_path).read()
        except OSError as exc:
            evidence["error"] = str(exc)
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        if not case_sensitive:
            content = content.lower()

        found = 0
        for sub in expected:
            check = sub if case_sensitive else sub.lower()
            if check in content:
                found += 1

        breakdown["substring_match"] = found / len(expected) if expected else 1.0
        evidence["expected_count"] = len(expected)
        evidence["found_count"] = found

        score = breakdown["substring_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            missing = len(expected) - found
            hints.append(f"{missing} of {len(expected)} expected substrings not found in document")
            if not case_sensitive:
                hints.append("Search was case-insensitive")
            else:
                hints.append("Check case sensitivity - set case_sensitive: false if needed")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["fs:read"],
                                 repair_hints=hints)


class YamlValidVerifier(BaseVerifier):
    """Verifies that a file contains valid YAML with optional key checks.

    Ground truth schema::

        {
            "file_path": str,
            "expected_keys": list[str] | null
        }
    """

    name = "document.yaml.valid"
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
        file_path = gt.get("file_path", "")
        expected_keys = gt.get("expected_keys")

        evidence: dict[str, Any] = {"file_path": file_path}
        breakdown: dict[str, float] = {}

        if not file_path or not os.path.isfile(file_path):
            evidence["error"] = "file not found"
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        try:
            import yaml  # type: ignore[import-untyped]
        except ImportError:
            evidence["error"] = "pyyaml not installed"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        try:
            with open(file_path) as f:
                data = yaml.safe_load(f)
            breakdown["valid_yaml"] = 1.0
        except (yaml.YAMLError, OSError) as exc:
            evidence["error"] = str(exc)
            breakdown["valid_yaml"] = 0.0
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"],
                                     repair_hints=[f"YAML parse error: {exc}", "Check indentation consistency"])

        if expected_keys and isinstance(data, dict):
            present = sum(1 for k in expected_keys if k in data)
            breakdown["keys_match"] = present / len(expected_keys) if expected_keys else 1.0

        score = sum(breakdown.values()) / len(breakdown) if breakdown else 1.0
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["fs:read"])


class PdfPageCountVerifier(BaseVerifier):
    """Verifies that a PDF has the expected number of pages.

    Ground truth schema::

        {
            "file_path": str,
            "expected_pages": int,
            "tolerance": int    # default 0
        }
    """

    name = "document.pdf.page_count"
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
        file_path = gt.get("file_path", "")
        expected_pages = gt.get("expected_pages", 1)
        tolerance = gt.get("tolerance", 0)

        evidence: dict[str, Any] = {"file_path": file_path, "expected_pages": expected_pages}
        breakdown: dict[str, float] = {}

        if not file_path or not os.path.isfile(file_path):
            evidence["error"] = "file not found"
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        # Use a lightweight PDF page count - just count /Type /Page entries
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            # Simple heuristic: count occurrences of /Type /Page (not /Pages)
            import re
            pages = len(re.findall(rb"/Type\s*/Page(?!s)", content))
            evidence["actual_pages"] = pages
            diff = abs(pages - expected_pages)
            breakdown["page_count_match"] = 1.0 if diff <= tolerance else 0.0
        except OSError as exc:
            evidence["error"] = str(exc)
            return self._make_result(Verdict.FAIL, 0.0, breakdown, evidence, input_data, permissions=["fs:read"])

        score = breakdown.get("page_count_match", 0.0)
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["fs:read"])
