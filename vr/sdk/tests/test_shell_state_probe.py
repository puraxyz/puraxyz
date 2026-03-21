"""Tests for vr/aiv.shell.state_probe verifier."""

from __future__ import annotations


import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.aiv.shell_state_probe import ShellStateProbeVerifier


@pytest.fixture
def verifier():
    return ShellStateProbeVerifier()


class TestShellStateProbeVerifier:
    """Core verification logic tests."""

    def test_matching_output_passes(self, verifier, tmp_path):
        """When command output matches expected, verdict=PASS with score=1.0."""
        test_file = tmp_path / "hello.txt"
        test_file.write_text("hello world\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "hello world",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    def test_mismatched_output_fails(self, verifier, tmp_path):
        """When output differs, verdict=FAIL with score=0.0."""
        test_file = tmp_path / "data.txt"
        test_file.write_text("actual content\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "expected content",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.FAIL
        assert results[0].score == 0.0

    def test_command_not_found_gives_fail(self, verifier, tmp_path):
        """When file doesn't exist, command fails → FAIL."""
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {tmp_path}/nonexistent_xyz_123.txt",
                "expected_output": "anything",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.FAIL

    def test_disallowed_command_gives_error(self, verifier):
        """Commands outside allowlist return ERROR."""
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": "curl http://evil.com",
                "expected_output": "anything",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.ERROR

    def test_empty_command_gives_error(self, verifier):
        """Missing command returns ERROR."""
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": "",
                "expected_output": "anything",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.ERROR

    def test_cwd_parameter(self, verifier, tmp_path):
        """Command runs in the specified working directory."""
        (tmp_path / "marker.txt").write_text("found\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": "cat marker.txt",
                "expected_output": "found",
                "cwd": str(tmp_path),
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS

    def test_multiple_completions(self, verifier, tmp_path):
        """One result per completion."""
        test_file = tmp_path / "multi.txt"
        test_file.write_text("ok\n")

        inp = VerifierInput(
            completions=["a", "b", "c"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "ok",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 3
        assert all(r.verdict == Verdict.PASS for r in results)

    def test_tier_is_agentic(self, verifier):
        from vrdev.core.types import Tier
        assert verifier.tier == Tier.AGENTIC

    def test_attack_resistance_auto_set(self, verifier, tmp_path):
        """AGENTIC tier auto-sets attack_resistance."""
        test_file = tmp_path / "ar.txt"
        test_file.write_text("x\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "x",
            },
        )
        results = verifier.verify(inp)
        assert results[0].attack_resistance is not None
        assert results[0].attack_resistance.injection_check == "passed"

    def test_evidence_contains_command(self, verifier, tmp_path):
        """Evidence dict includes the command and actual output."""
        test_file = tmp_path / "ev.txt"
        test_file.write_text("data\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "data",
            },
        )
        results = verifier.verify(inp)
        ev = results[0].evidence
        assert "command" in ev
        assert "actual_output" in ev
        assert "expected_output" in ev

    def test_execution_ms_set(self, verifier, tmp_path):
        """execution_ms is populated in metadata."""
        test_file = tmp_path / "time.txt"
        test_file.write_text("t\n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "t",
            },
        )
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms is not None
        assert results[0].metadata.execution_ms >= 0

    def test_registry_lookup(self):
        """Verifier can be instantiated via registry."""
        from vrdev.core.registry import get_verifier

        v = get_verifier("vr/aiv.shell.state_probe")
        assert v.name == "aiv.shell.state_probe"

    def test_whitespace_stripping(self, verifier, tmp_path):
        """Leading/trailing whitespace is stripped from both sides."""
        test_file = tmp_path / "ws.txt"
        test_file.write_text("  hello  \n")

        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "command": f"cat {test_file}",
                "expected_output": "  hello  ",
            },
        )
        results = verifier.verify(inp)
        # Both stripped: "hello" vs "hello"  
        assert results[0].verdict == Verdict.PASS
