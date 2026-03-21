"""vr/code.python.lint_ruff - HARD verifier for Python lint cleanliness.

Source: Zeno-bench (code-quality track)
Writes agent-generated Python code to a temp file and runs ``ruff check``
via the sandbox runner. Score is based on the ratio of clean lines.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.sandbox import execute_sandboxed


class LintRuffVerifier(BaseVerifier):
    """Verifies that agent-generated Python code passes ruff lint checks.

    Each completion is treated as a Python source string. The verifier
    writes it to a temp file, runs ``ruff check --output-format=json``,
    and scores based on the violation count.

    Ground truth schema::

        {
            "max_violations": int  # default 0 - threshold for PASS
        }

    Context (optional)::

        {
            "ruff_select": str | null,   # e.g. "E,F,W" - rule selectors
            "ruff_ignore": str | null     # e.g. "E501"  - rules to ignore
        }
    """

    name = "code.python.lint_ruff"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        max_violations = gt.get("max_violations", 0)
        ctx = input_data.context or {}
        ruff_select = ctx.get("ruff_select")
        ruff_ignore = ctx.get("ruff_ignore")

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                completion, max_violations, ruff_select, ruff_ignore, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        code: str,
        max_violations: int,
        ruff_select: str | None,
        ruff_ignore: str | None,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"max_violations": max_violations}
        breakdown: dict[str, float] = {}

        # Write code to a temp file
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=".py", prefix="vr_ruff_")
            os.write(fd, code.encode())
            os.close(fd)
        except Exception as exc:
            return self._make_result(
                Verdict.ERROR, 0.0, {}, {**evidence, "error": str(exc)},
                input_data, permissions=["fs:write_tmp"],
                source_benchmark="Zeno-bench", source_citation="code-quality",
            )

        try:
            cmd = f"ruff check --output-format=json --no-cache {tmp_path}"
            if ruff_select:
                cmd += f" --select={ruff_select}"
            if ruff_ignore:
                cmd += f" --ignore={ruff_ignore}"

            result = execute_sandboxed(cmd, timeout=30.0)
            evidence["ruff_returncode"] = result["returncode"]
            evidence["ruff_stderr"] = result["stderr"][:2048]

            if result["verdict"] == Verdict.ERROR:
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown,
                    {**evidence, "error": result["error"]},
                    input_data, permissions=["fs:write_tmp", "exec:ruff"],
                    source_benchmark="Zeno-bench", source_citation="code-quality",
                )

            # Parse ruff JSON output
            violations = self._parse_ruff_output(result["stdout"])
            num_violations = len(violations)
            evidence["violation_count"] = num_violations
            evidence["violations"] = violations[:20]  # cap for readability

            # Score: 1.0 if clean, decreasing with violations
            total_lines = max(len(code.splitlines()), 1)
            clean_ratio = max(0.0, 1.0 - (num_violations / total_lines))
            breakdown["clean_ratio"] = round(clean_ratio, 4)
            breakdown["violation_count"] = float(num_violations)

            if num_violations <= max_violations:
                verdict = Verdict.PASS
                score = clean_ratio
            else:
                verdict = Verdict.FAIL
                score = clean_ratio

            hints: list[str] = []
            if verdict == Verdict.FAIL and violations:
                top = violations[:5]
                for v in top:
                    hints.append(f"{v.get('code', '?')}: {v.get('message', '?')} (line {v.get('row', '?')})")
                hints.append("Run 'ruff check --fix' to auto-fix eligible violations")

            return self._make_result(
                verdict, round(score, 4), breakdown, evidence, input_data,
                permissions=["fs:write_tmp", "exec:ruff"],
                source_benchmark="Zeno-bench", source_citation="code-quality",
                repair_hints=hints,
            )
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    @staticmethod
    def _parse_ruff_output(stdout: str) -> list[dict[str, Any]]:
        """Parse ruff JSON output into a list of violation dicts."""
        if not stdout.strip():
            return []
        try:
            data = json.loads(stdout)
            if isinstance(data, list):
                return [
                    {
                        "code": v.get("code", ""),
                        "message": v.get("message", ""),
                        "row": v.get("location", {}).get("row"),
                    }
                    for v in data
                ]
        except (json.JSONDecodeError, TypeError):
            pass
        return []
