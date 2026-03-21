"""vr/aiv.shell.state_probe - AGENTIC verifier for shell-based state probing.

Executes a sandboxed shell command to probe system state, then compares
the captured stdout (stripped) to ``ground_truth.expected_output``.

This verifier reuses the 16-command sandbox allowlist, so only safe
read-only commands can be executed (ls, stat, cat, grep, git, etc.).
"""

from __future__ import annotations

import time

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.sandbox import execute_sandboxed


class ShellStateProbeVerifier(BaseVerifier):
    """Probes system state via a sandboxed shell command.

    Ground truth schema::

        {
            "command": str,              # shell command to execute
            "expected_output": str,      # exact expected stdout (stripped)
            "cwd": str | null,           # working directory (optional)
            "timeout": float | null      # seconds, default 15
        }

    Scoring:
        - 1.0 if stdout.strip() == expected_output.strip()
        - 0.0 otherwise
    """

    name = "aiv.shell.state_probe"
    tier = Tier.AGENTIC
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        command = gt.get("command", "")
        expected = gt.get("expected_output", "")
        cwd = gt.get("cwd")
        timeout = gt.get("timeout", 15.0)

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(command, expected, cwd, timeout, input_data)
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        command: str,
        expected_output: str,
        cwd: str | None,
        timeout: float,
        input_data: VerifierInput,
    ) -> VerificationResult:
        """Execute the command and compare output."""
        if not command:
            return self._make_result(
                verdict=Verdict.ERROR,
                score=0.0,
                breakdown={"error": 1.0},
                evidence={"error": "ground_truth.command is empty"},
                input_data=input_data,
                permissions=["subprocess:readonly"],
                source_benchmark="VAGEN",
                source_citation="arXiv:2602.00575",
            )

        result = execute_sandboxed(command, timeout=timeout, cwd=cwd)

        if result.get("verdict") == Verdict.ERROR:
            return self._make_result(
                verdict=Verdict.ERROR,
                score=0.0,
                breakdown={"error": 1.0},
                evidence={
                    "command": command,
                    "error": result.get("error", "unknown"),
                },
                input_data=input_data,
                permissions=["subprocess:readonly"],
                source_benchmark="VAGEN",
                source_citation="arXiv:2602.00575",
            )

        actual = result.get("stdout", "").strip()
        expected_stripped = expected_output.strip()
        match = actual == expected_stripped

        return self._make_result(
            verdict=Verdict.PASS if match else Verdict.FAIL,
            score=1.0 if match else 0.0,
            breakdown={
                "output_match": 1.0 if match else 0.0,
                "exit_code_ok": 1.0 if result.get("returncode", -1) == 0 else 0.0,
            },
            evidence={
                "command": command,
                "actual_output": actual[:500],  # cap for large output
                "expected_output": expected_stripped[:500],
                "returncode": result.get("returncode"),
                "stderr": result.get("stderr", "")[:200],
            },
            input_data=input_data,
            permissions=["subprocess:readonly"],
            source_benchmark="VAGEN",
            source_citation="arXiv:2602.00575",
        )
