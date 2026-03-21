"""Tests for the FileCreatedVerifier (vr/filesystem.file_created).

Uses unittest.mock.patch to mock execute_sandboxed since we cannot
depend on real filesystem state for deterministic testing.
"""

from __future__ import annotations

from unittest.mock import patch


from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.filesystem.file_created import FileCreatedVerifier


def _make_input(
    path: str = "/tmp/report.txt",
    min_size: int | None = None,
    content_hash: str | None = None,
) -> VerifierInput:
    gt: dict = {"expected_path": path}
    if min_size is not None:
        gt["min_size_bytes"] = min_size
    if content_hash is not None:
        gt["content_hash"] = content_hash
    return VerifierInput(completions=["file created"], ground_truth=gt)


def _sandbox_ok(stdout: str = "") -> dict:
    return {"verdict": Verdict.PASS, "returncode": 0, "stdout": stdout, "stderr": "", "error": None}


def _sandbox_fail() -> dict:
    return {"verdict": Verdict.FAIL, "returncode": 1, "stdout": "", "stderr": "No such file", "error": None}


def _sandbox_error(msg: str = "not allowed") -> dict:
    return {"verdict": Verdict.ERROR, "returncode": -1, "stdout": "", "stderr": "", "error": msg}


# ── Basic metadata ───────────────────────────────────────────────────────────


class TestFileCreatedMeta:
    def test_tier_is_hard(self):
        v = FileCreatedVerifier()
        assert v.tier == Tier.HARD

    def test_name(self):
        v = FileCreatedVerifier()
        assert v.name == "filesystem.file_created"

    def test_pkg_id(self):
        v = FileCreatedVerifier()
        assert v.pkg_id == "filesystem.file_created@0.1.0"


# ── File existence ───────────────────────────────────────────────────────────


class TestFileExists:
    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_pass_file_exists(self, mock_sandbox):
        mock_sandbox.return_value = _sandbox_ok("  File: /tmp/report.txt\n  Size: 128")
        v = FileCreatedVerifier()
        results = v.verify(_make_input())
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0
        assert results[0].breakdown["file_exists"] == 1.0

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_fail_file_not_found(self, mock_sandbox):
        mock_sandbox.return_value = _sandbox_fail()
        v = FileCreatedVerifier()
        results = v.verify(_make_input())
        assert results[0].verdict == Verdict.FAIL
        assert results[0].score == 0.0
        assert results[0].breakdown["file_exists"] == 0.0

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_error_sandbox_blocked(self, mock_sandbox):
        mock_sandbox.return_value = _sandbox_error("stat not in the sandbox allowlist")
        v = FileCreatedVerifier()
        results = v.verify(_make_input())
        assert results[0].verdict == Verdict.ERROR
        assert results[0].score == 0.0

    def test_error_no_expected_path(self):
        inp = VerifierInput(completions=["done"], ground_truth={})
        v = FileCreatedVerifier()
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR
        assert "expected_path" in str(results[0].evidence)


# ── Size check ───────────────────────────────────────────────────────────────


class TestFileSize:
    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_pass_size_sufficient(self, mock_sandbox):
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),  # stat
            _sandbox_ok("  256 /tmp/report.txt"),     # wc -c
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(min_size=100))
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["size_check"] == 1.0

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_fail_size_too_small(self, mock_sandbox):
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),  # stat
            _sandbox_ok("  50 /tmp/report.txt"),     # wc -c
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(min_size=100))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["size_check"] == 0.0
        assert results[0].evidence["actual_size"] == 50


# ── Content hash ─────────────────────────────────────────────────────────────


class TestFileHash:
    GOOD_HASH = "abc123def456" * 5 + "ab"

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_pass_hash_matches(self, mock_sandbox):
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),            # stat
            _sandbox_ok(f"{self.GOOD_HASH}  /tmp/report.txt"), # sha256sum
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(content_hash=self.GOOD_HASH))
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["content_hash"] == 1.0

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_fail_hash_mismatch(self, mock_sandbox):
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),            # stat
            _sandbox_ok("badhash  /tmp/report.txt"),           # sha256sum
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(content_hash=self.GOOD_HASH))
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["content_hash"] == 0.0

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_fallback_to_shasum(self, mock_sandbox):
        """When sha256sum fails, verifier falls back to shasum -a 256."""
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),            # stat
            _sandbox_fail(),                                    # sha256sum fails
            _sandbox_ok(f"{self.GOOD_HASH}  /tmp/report.txt"), # shasum -a 256
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(content_hash=self.GOOD_HASH))
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["content_hash"] == 1.0
        assert mock_sandbox.call_count == 3


# ── Combined checks ──────────────────────────────────────────────────────────


class TestFileCombined:
    HASH = "abc123"

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_partial_score(self, mock_sandbox):
        """File exists + size ok + hash wrong → score = 2/3."""
        mock_sandbox.side_effect = [
            _sandbox_ok("  File: /tmp/report.txt"),         # stat
            _sandbox_ok("  200 /tmp/report.txt"),           # wc -c
            _sandbox_ok("wronghash  /tmp/report.txt"),      # sha256sum
        ]
        v = FileCreatedVerifier()
        results = v.verify(_make_input(min_size=100, content_hash=self.HASH))
        result = results[0]
        assert result.verdict == Verdict.FAIL
        assert result.breakdown["file_exists"] == 1.0
        assert result.breakdown["size_check"] == 1.0
        assert result.breakdown["content_hash"] == 0.0
        assert abs(result.score - 2 / 3) < 0.01

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_provenance_set(self, mock_sandbox):
        mock_sandbox.return_value = _sandbox_ok("  File: /tmp/report.txt")
        v = FileCreatedVerifier()
        results = v.verify(_make_input())
        assert results[0].provenance.source_benchmark == "OSWorld"
        assert results[0].provenance.source_citation == "arXiv:2404.07972"

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_hashes_computed(self, mock_sandbox):
        mock_sandbox.return_value = _sandbox_ok("  File: /tmp/report.txt")
        v = FileCreatedVerifier()
        results = v.verify(_make_input())
        assert results[0].artifact_hash != ""
        assert results[0].input_hash != ""

    @patch("vrdev.tasks.filesystem.file_created.execute_sandboxed")
    def test_multiple_completions(self, mock_sandbox):
        """Each completion gets its own result."""
        mock_sandbox.return_value = _sandbox_ok("  File: /tmp/report.txt")
        v = FileCreatedVerifier()
        inp = VerifierInput(
            completions=["comp1", "comp2"],
            ground_truth={"expected_path": "/tmp/report.txt"},
        )
        results = v.verify(inp)
        assert len(results) == 2
