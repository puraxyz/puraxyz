"""vr/code.python.tests_pass - HARD verifier for Python test execution.

Source: Zeno-bench (code-quality track)
Writes agent-generated Python code to a temp directory and runs
``pytest`` via the sandbox runner. Score is based on test pass rate.
"""

from __future__ import annotations

import os
import re
import tempfile
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.sandbox import execute_sandboxed


class TestsPassVerifier(BaseVerifier):
    """Verifies that agent-generated Python code passes its test suite.

    Each completion is treated as a Python source string containing both
    implementation and tests (or just tests if ``test_code`` is supplied
    separately in ground truth).

    Ground truth schema::

        {
            "test_code": str | null,     # separate test file (optional)
            "min_pass_ratio": float      # default 1.0 - fraction required
        }

    Context (optional)::

        {
            "pytest_args": str | null    # extra pytest CLI args
        }
    """

    name = "code.python.tests_pass"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        test_code = gt.get("test_code")
        min_pass_ratio = gt.get("min_pass_ratio", 1.0)
        ctx = input_data.context or {}
        pytest_args = ctx.get("pytest_args", "")

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                completion, test_code, min_pass_ratio, pytest_args, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        code: str,
        test_code: str | None,
        min_pass_ratio: float,
        pytest_args: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"min_pass_ratio": min_pass_ratio}
        breakdown: dict[str, float] = {}

        # Write code to a temp directory
        tmp_dir = None
        try:
            tmp_dir = tempfile.mkdtemp(prefix="vr_tests_")
            code_path = os.path.join(tmp_dir, "solution.py")
            with open(code_path, "w") as f:
                f.write(code)

            # Write test file
            if test_code:
                test_path = os.path.join(tmp_dir, "test_solution.py")
                with open(test_path, "w") as f:
                    f.write(test_code)
                target = test_path
            else:
                # Run pytest on the code itself (it should contain tests)
                target = code_path

        except Exception as exc:
            return self._make_result(
                Verdict.ERROR, 0.0, {}, {**evidence, "error": str(exc)},
                input_data, permissions=["fs:write_tmp", "exec:pytest"],
                source_benchmark="Zeno-bench", source_citation="code-quality",
            )

        try:
            cmd = f"pytest {target} -v --tb=short --no-header -q"
            if pytest_args:
                cmd += f" {pytest_args}"

            result = execute_sandboxed(cmd, timeout=30.0, cwd=tmp_dir)
            evidence["pytest_returncode"] = result["returncode"]
            evidence["pytest_stdout"] = result["stdout"][:4096]
            evidence["pytest_stderr"] = result["stderr"][:2048]

            if result["verdict"] == Verdict.ERROR:
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown,
                    {**evidence, "error": result["error"]},
                    input_data, permissions=["fs:write_tmp", "exec:pytest"],
                    source_benchmark="Zeno-bench", source_citation="code-quality",
                )

            # Parse pytest output for pass/fail counts
            passed, failed, errors = self._parse_pytest_output(result["stdout"])
            total = passed + failed + errors
            evidence["tests_passed"] = passed
            evidence["tests_failed"] = failed
            evidence["tests_errored"] = errors
            evidence["tests_total"] = total

            if total == 0:
                breakdown["pass_ratio"] = 0.0
                return self._make_result(
                    Verdict.FAIL, 0.0, breakdown, evidence, input_data,
                    permissions=["fs:write_tmp", "exec:pytest"],
                    source_benchmark="Zeno-bench", source_citation="code-quality",
                    repair_hints=["No tests were collected - check test function naming (test_*)", "Ensure pytest can discover the test file"],
                )

            pass_ratio = passed / total
            breakdown["pass_ratio"] = round(pass_ratio, 4)
            breakdown["tests_total"] = float(total)

            if pass_ratio >= min_pass_ratio:
                verdict = Verdict.PASS
            else:
                verdict = Verdict.FAIL

            hints: list[str] = []
            if verdict == Verdict.FAIL:
                if failed:
                    hints.append(f"{failed} test(s) failed out of {total}")
                if errors:
                    hints.append(f"{errors} test(s) errored - check test dependencies are installed")
                hints.append("Review pytest output for specific assertion failures")

            return self._make_result(
                verdict, round(pass_ratio, 4), breakdown, evidence, input_data,
                permissions=["fs:write_tmp", "exec:pytest"],
                source_benchmark="Zeno-bench", source_citation="code-quality",
                repair_hints=hints,
            )
        finally:
            # Cleanup temp files
            try:
                import shutil
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass

    @staticmethod
    def _parse_pytest_output(stdout: str) -> tuple[int, int, int]:
        """Parse pytest summary line for pass/fail/error counts.

        Handles lines like:
        - "3 passed"
        - "2 passed, 1 failed"
        - "1 passed, 1 failed, 1 error"
        """
        passed = failed = errors = 0
        # Look for the summary line at the end
        m = re.search(r"(\d+) passed", stdout)
        if m:
            passed = int(m.group(1))
        m = re.search(r"(\d+) failed", stdout)
        if m:
            failed = int(m.group(1))
        m = re.search(r"(\d+) error", stdout)
        if m:
            errors = int(m.group(1))
        return passed, failed, errors
