"""Tests for the sandbox runner."""

import os
import tempfile


from vrdev.core.types import Verdict
from vrdev.runners.sandbox import execute_sandboxed


# ── Allowlist enforcement ────────────────────────────────────────────────────


class TestSandboxAllowlist:
    """The allowlist must be enforced at the command-parsing level."""

    def test_allowed_command_ls(self):
        result = execute_sandboxed("ls /tmp")
        assert result["verdict"] in (Verdict.PASS, Verdict.FAIL)
        assert result["error"] is None

    def test_disallowed_command_rm(self):
        result = execute_sandboxed("rm -rf /tmp/test_vrdev_sandbox")
        assert result["verdict"] == Verdict.ERROR
        assert "not in the sandbox allowlist" in result["error"]

    def test_disallowed_command_curl(self):
        result = execute_sandboxed("curl http://example.com")
        assert result["verdict"] == Verdict.ERROR
        assert "not in the sandbox allowlist" in result["error"]

    def test_disallowed_command_python(self):
        result = execute_sandboxed("ruby -e 'puts 1'")
        assert result["verdict"] == Verdict.ERROR
        assert "not in the sandbox allowlist" in result["error"]

    def test_disallowed_command_bash(self):
        result = execute_sandboxed("bash -c 'echo hi'")
        assert result["verdict"] == Verdict.ERROR
        assert "not in the sandbox allowlist" in result["error"]


# ── Actual execution ─────────────────────────────────────────────────────────


class TestSandboxExecution:
    """Verify that allowed commands execute correctly."""

    def test_cat_file(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("hello world")
            path = f.name
        try:
            result = execute_sandboxed(f"cat {path}")
            assert result["verdict"] == Verdict.PASS
            assert "hello world" in result["stdout"]
        finally:
            os.unlink(path)

    def test_stat_existing_file(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"data")
            path = f.name
        try:
            result = execute_sandboxed(f"stat {path}")
            assert result["verdict"] == Verdict.PASS
            assert result["error"] is None
        finally:
            os.unlink(path)

    def test_stat_nonexistent_file(self):
        result = execute_sandboxed("stat /nonexistent/path/file.txt")
        assert result["verdict"] == Verdict.FAIL
        assert result["returncode"] != 0

    def test_wc_counts_lines(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("line1\nline2\nline3\n")
            path = f.name
        try:
            result = execute_sandboxed(f"wc -l {path}")
            assert result["verdict"] == Verdict.PASS
            assert "3" in result["stdout"]
        finally:
            os.unlink(path)


# ── Timeout handling ─────────────────────────────────────────────────────────


class TestSandboxTimeout:
    def test_timeout_produces_error(self):
        # 'find /' with an absurd filter and a tiny timeout
        result = execute_sandboxed(
            "find / -name 'nonexistent_vrdev_xyz_string'", timeout=0.01
        )
        assert result["verdict"] == Verdict.ERROR
        assert "timed out" in result["error"]
