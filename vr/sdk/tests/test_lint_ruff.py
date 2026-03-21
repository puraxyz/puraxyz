"""Tests for vr/code.python.lint_ruff - LintRuffVerifier."""

from __future__ import annotations

import shutil

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.code.lint_ruff import LintRuffVerifier


# Skip all tests if ruff is not installed
pytestmark = pytest.mark.skipif(
    shutil.which("ruff") is None,
    reason="ruff not installed",
)


@pytest.fixture
def verifier():
    return LintRuffVerifier()


class TestLintRuffCleanCode:
    """Clean code should PASS with score ~1.0."""

    def test_clean_single_function(self, verifier):
        code = 'def hello():\n    return "world"\n'
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score >= 0.9
        assert results[0].evidence["violation_count"] == 0

    def test_clean_with_imports(self, verifier):
        code = "import os\n\nprint(os.getcwd())\n"
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_multiple_completions(self, verifier):
        codes = [
            'x = 1\nprint(x)\n',
            'def f():\n    return 42\n',
        ]
        inp = VerifierInput(completions=codes, ground_truth={})
        results = verifier.verify(inp)
        assert len(results) == 2
        assert all(r.verdict == Verdict.PASS for r in results)


class TestLintRuffViolations:
    """Code with lint violations should FAIL."""

    def test_unused_import(self, verifier):
        code = "import os\nimport sys\n\nprint('hello')\n"
        inp = VerifierInput(completions=[code], ground_truth={"max_violations": 0})
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["violation_count"] > 0

    def test_violations_under_threshold_pass(self, verifier):
        code = "import os\nimport sys\n\nprint('hello')\n"
        inp = VerifierInput(
            completions=[code],
            ground_truth={"max_violations": 10},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS


class TestLintRuffContext:
    """Context options for ruff select/ignore."""

    def test_ignore_specific_rule(self, verifier):
        # F401 = unused import; ignoring it should let the code pass
        code = "import os\n\nprint('hello')\n"
        inp = VerifierInput(
            completions=[code],
            ground_truth={"max_violations": 0},
            context={"ruff_ignore": "F401"},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS


class TestLintRuffMetadata:
    """Metadata and evidence structure."""

    def test_evidence_keys(self, verifier):
        code = "x = 1\n"
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        ev = results[0].evidence
        assert "violation_count" in ev
        assert "ruff_returncode" in ev

    def test_breakdown_keys(self, verifier):
        code = "x = 1\n"
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        bd = results[0].breakdown
        assert "clean_ratio" in bd
        assert "violation_count" in bd

    def test_provenance(self, verifier):
        code = "x = 1\n"
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        assert results[0].provenance.source_benchmark == "Zeno-bench"

    def test_execution_ms_set(self, verifier):
        code = "x = 1\n"
        inp = VerifierInput(completions=[code], ground_truth={})
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms >= 0
