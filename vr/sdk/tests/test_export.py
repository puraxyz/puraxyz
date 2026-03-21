"""Tests for vrdev.core.export - JSONL training-data export."""

from __future__ import annotations

import io
import json


from vrdev.core.export import export_jsonl, export_jsonl_lines
from vrdev.core.types import (
    Provenance,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_input(completions: list[str], gt: dict | None = None) -> VerifierInput:
    return VerifierInput(
        completions=completions,
        ground_truth=gt or {},
    )


def _make_result(
    verdict: Verdict = Verdict.PASS,
    score: float = 1.0,
    tier: Tier = Tier.HARD,
    breakdown: dict | None = None,
) -> VerificationResult:
    return VerificationResult(
        verdict=verdict,
        score=score,
        tier=tier,
        breakdown=breakdown or {"check": 1.0},
        evidence={"detail": "ok"},
        provenance=Provenance(
            verifier_pkg="test@0.1.0",
            source_benchmark="Test",
            source_citation="test",
        ),
    )


# ══════════════════════════════════════════════════════════════════════════════
# export_jsonl_lines
# ══════════════════════════════════════════════════════════════════════════════


class TestExportJsonlLines:
    def test_returns_list_of_strings(self):
        inp = _make_input(["hello"])
        results = [_make_result()]
        lines = export_jsonl_lines(results, inp, "vr/test.verifier")
        assert isinstance(lines, list)
        assert all(isinstance(line, str) for line in lines)

    def test_one_line_per_result(self):
        inp = _make_input(["a", "b", "c"])
        results = [_make_result() for _ in range(3)]
        lines = export_jsonl_lines(results, inp, "vr/test.verifier")
        assert len(lines) == 3

    def test_each_line_is_valid_json(self):
        inp = _make_input(["hello", "world"])
        results = [_make_result(), _make_result(Verdict.FAIL, 0.0)]
        lines = export_jsonl_lines(results, inp, "vr/test.verifier")
        for line in lines:
            parsed = json.loads(line)
            assert isinstance(parsed, dict)

    def test_record_contains_required_fields(self):
        inp = _make_input(["test completion"])
        results = [_make_result()]
        lines = export_jsonl_lines(results, inp, "vr/filesystem.file_created")
        record = json.loads(lines[0])
        assert record["completion"] == "test completion"
        assert record["score"] == 1.0
        assert record["verdict"] == "PASS"
        assert record["tier"] == "HARD"
        assert record["verifier_id"] == "vr/filesystem.file_created"
        assert record["passed"] is True
        assert "breakdown" in record
        assert "provenance" in record
        assert "ground_truth" in record
        assert "exported_at" in record

    def test_fail_verdict_exported(self):
        inp = _make_input(["bad output"])
        results = [_make_result(Verdict.FAIL, 0.0)]
        lines = export_jsonl_lines(results, inp, "vr/test")
        record = json.loads(lines[0])
        assert record["verdict"] == "FAIL"
        assert record["passed"] is False

    def test_ground_truth_preserved(self):
        gt = {"expected_path": "/tmp/out.txt", "min_size_bytes": 100}
        inp = _make_input(["done"], gt)
        results = [_make_result()]
        lines = export_jsonl_lines(results, inp, "vr/test")
        record = json.loads(lines[0])
        assert record["ground_truth"] == gt

    def test_breakdown_preserved(self):
        inp = _make_input(["done"])
        results = [_make_result(breakdown={"a": 0.5, "b": 1.0})]
        lines = export_jsonl_lines(results, inp, "vr/test")
        record = json.loads(lines[0])
        assert record["breakdown"] == {"a": 0.5, "b": 1.0}

    def test_extra_fields_merged(self):
        inp = _make_input(["done"])
        results = [_make_result()]
        lines = export_jsonl_lines(
            results, inp, "vr/test",
            extra={"run_id": "abc-123", "batch": 7},
        )
        record = json.loads(lines[0])
        assert record["run_id"] == "abc-123"
        assert record["batch"] == 7

    def test_empty_results(self):
        inp = _make_input([])
        lines = export_jsonl_lines([], inp, "vr/test")
        assert lines == []

    def test_provenance_fields(self):
        inp = _make_input(["done"])
        results = [_make_result()]
        lines = export_jsonl_lines(results, inp, "vr/test")
        record = json.loads(lines[0])
        prov = record["provenance"]
        assert prov["verifier_pkg"] == "test@0.1.0"
        assert prov["source_benchmark"] == "Test"
        assert "timestamp_utc" in prov

    def test_artifact_hash_present(self):
        inp = _make_input(["done"])
        results = [_make_result()]
        lines = export_jsonl_lines(results, inp, "vr/test")
        record = json.loads(lines[0])
        assert "artifact_hash" in record
        assert "input_hash" in record


# ══════════════════════════════════════════════════════════════════════════════
# export_jsonl (file writer)
# ══════════════════════════════════════════════════════════════════════════════


class TestExportJsonl:
    def test_writes_to_file_object(self):
        inp = _make_input(["hello"])
        results = [_make_result()]
        buf = io.StringIO()
        count = export_jsonl(results, inp, "vr/test", buf)
        assert count == 1
        buf.seek(0)
        content = buf.read()
        assert content.endswith("\n")
        record = json.loads(content.strip())
        assert record["completion"] == "hello"

    def test_multiple_lines(self):
        inp = _make_input(["a", "b"])
        results = [_make_result(), _make_result(Verdict.FAIL, 0.0)]
        buf = io.StringIO()
        count = export_jsonl(results, inp, "vr/test", buf)
        assert count == 2
        buf.seek(0)
        lines = [line for line in buf.readlines() if line.strip()]
        assert len(lines) == 2

    def test_writes_to_real_file(self, tmp_path):
        inp = _make_input(["done"])
        results = [_make_result()]
        outfile = tmp_path / "train.jsonl"
        with open(outfile, "w") as f:
            export_jsonl(results, inp, "vr/test", f)
        content = outfile.read_text()
        record = json.loads(content.strip())
        assert record["verifier_id"] == "vr/test"

    def test_extra_fields_in_file_output(self):
        inp = _make_input(["done"])
        results = [_make_result()]
        buf = io.StringIO()
        export_jsonl(results, inp, "vr/test", buf, extra={"tag": "v1"})
        buf.seek(0)
        record = json.loads(buf.read().strip())
        assert record["tag"] == "v1"

    def test_returns_zero_for_empty(self):
        inp = _make_input([])
        buf = io.StringIO()
        count = export_jsonl([], inp, "vr/test", buf)
        assert count == 0
        assert buf.getvalue() == ""


# ══════════════════════════════════════════════════════════════════════════════
# CLI integration (export command)
# ══════════════════════════════════════════════════════════════════════════════


class TestExportCLI:
    def test_export_command_registered(self):
        from vrdev.cli.main import cli
        cmd_names = [c.name for c in cli.commands.values()]
        assert "export" in cmd_names
