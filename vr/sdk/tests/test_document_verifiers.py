"""Tests for document verifiers using temp files."""

from __future__ import annotations

import json

from vrdev.core.types import VerifierInput
from vrdev.tasks.document import (
    CsvRowCountVerifier,
    JsonValidVerifier,
    PdfPageCountVerifier,
    TextContainsVerifier,
    YamlValidVerifier,
)


def _inp(gt: dict) -> VerifierInput:
    return VerifierInput(completions=["done"], ground_truth=gt)


class TestJsonValid:
    def test_pass_valid_json(self, tmp_path):
        f = tmp_path / "test.json"
        f.write_text(json.dumps({"name": "Alice", "age": 30}))
        v = JsonValidVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_keys": ["name", "age"],
            "expected_type": "object",
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_invalid_json(self, tmp_path):
        f = tmp_path / "bad.json"
        f.write_text("{invalid json")
        v = JsonValidVerifier()
        results = v.verify(_inp({"file_path": str(f)}))
        assert results[0].verdict.value == "FAIL"

    def test_fail_file_not_found(self):
        v = JsonValidVerifier()
        results = v.verify(_inp({"file_path": "/nonexistent/file.json"}))
        assert results[0].verdict.value == "FAIL"

    def test_fail_wrong_type(self, tmp_path):
        f = tmp_path / "array.json"
        f.write_text(json.dumps([1, 2, 3]))
        v = JsonValidVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_type": "object",
        }))
        assert results[0].verdict.value == "FAIL"

    def test_fail_missing_keys(self, tmp_path):
        f = tmp_path / "partial.json"
        f.write_text(json.dumps({"name": "Alice"}))
        v = JsonValidVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_keys": ["name", "age", "email"],
        }))
        assert results[0].verdict.value == "FAIL"


class TestCsvRowCount:
    def test_pass_exact_count(self, tmp_path):
        f = tmp_path / "data.csv"
        f.write_text("name,age\nAlice,30\nBob,25\n")
        v = CsvRowCountVerifier()
        results = v.verify(_inp({"file_path": str(f), "expected_rows": 2}))
        assert results[0].verdict.value == "PASS"

    def test_fail_wrong_count(self, tmp_path):
        f = tmp_path / "data.csv"
        f.write_text("name,age\nAlice,30\n")
        v = CsvRowCountVerifier()
        results = v.verify(_inp({"file_path": str(f), "expected_rows": 5}))
        assert results[0].verdict.value == "FAIL"

    def test_fail_file_not_found(self):
        v = CsvRowCountVerifier()
        results = v.verify(_inp({"file_path": "/no/file.csv", "expected_rows": 1}))
        assert results[0].verdict.value == "FAIL"


class TestTextContains:
    def test_pass_all_substrings(self, tmp_path):
        f = tmp_path / "doc.txt"
        f.write_text("Hello world, this is a test document.")
        v = TextContainsVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_substrings": ["Hello", "test"],
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_missing_substring(self, tmp_path):
        f = tmp_path / "doc.txt"
        f.write_text("Hello world")
        v = TextContainsVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_substrings": ["Hello", "missing"],
        }))
        assert results[0].verdict.value == "FAIL"

    def test_case_insensitive(self, tmp_path):
        f = tmp_path / "doc.txt"
        f.write_text("HELLO WORLD")
        v = TextContainsVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_substrings": ["hello"],
            "case_sensitive": False,
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_file_not_found(self):
        v = TextContainsVerifier()
        results = v.verify(_inp({
            "file_path": "/no/file.txt",
            "expected_substrings": ["test"],
        }))
        assert results[0].verdict.value == "FAIL"


class TestYamlValid:
    def test_pass_valid_yaml(self, tmp_path):
        f = tmp_path / "config.yaml"
        f.write_text("name: test\nversion: 1\n")
        v = YamlValidVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_keys": ["name", "version"],
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_file_not_found(self):
        v = YamlValidVerifier()
        results = v.verify(_inp({"file_path": "/no/file.yaml"}))
        assert results[0].verdict.value == "FAIL"


class TestPdfPageCount:
    def test_fail_file_not_found(self):
        v = PdfPageCountVerifier()
        results = v.verify(_inp({
            "file_path": "/no/file.pdf",
            "expected_pages": 1,
        }))
        assert results[0].verdict.value == "FAIL"

    def test_pass_with_pdf(self, tmp_path):
        # Create a minimal PDF-like file with /Type /Page markers
        f = tmp_path / "test.pdf"
        f.write_bytes(b"%PDF-1.4\n/Type /Page\n/Type /Page\n%%EOF")
        v = PdfPageCountVerifier()
        results = v.verify(_inp({
            "file_path": str(f),
            "expected_pages": 2,
        }))
        assert results[0].verdict.value == "PASS"
