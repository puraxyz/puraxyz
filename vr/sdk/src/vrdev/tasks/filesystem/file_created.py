"""vr/filesystem.file_created - HARD verifier for file existence and content.

Source: OSWorld (arXiv:2404.07972)
Validates that a file exists at the expected path with optional size and
content hash checks. Uses the sandbox runner for all filesystem access.
"""

from __future__ import annotations

import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import (
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)
from ...runners.sandbox import execute_sandboxed


class FileCreatedVerifier(BaseVerifier):
    """Verifies that a file was created at the expected path.

    Ground truth schema::

        {
            "expected_path": str,
            "min_size_bytes": int | null,
            "content_hash": str | null   # SHA-256 hex digest
        }
    """

    name = "filesystem.file_created"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        expected_path = gt.get("expected_path", "")
        min_size = gt.get("min_size_bytes")
        expected_hash = gt.get("content_hash")

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                expected_path, min_size, expected_hash, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        expected_path: str,
        min_size: int | None,
        expected_hash: str | None,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"expected_path": expected_path}
        breakdown: dict[str, float] = {}

        if not expected_path:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": "No expected_path in ground_truth"},
                input_data, permissions=["fs:read"],
                source_benchmark="OSWorld", source_citation="arXiv:2404.07972",
            )

        # ── Check file existence via stat ────────────────────────────────
        stat_result = execute_sandboxed(f"stat {expected_path}")
        evidence["stat_returncode"] = stat_result["returncode"]

        if stat_result["verdict"] == Verdict.ERROR:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": stat_result["error"]},
                input_data, permissions=["fs:read"],
                source_benchmark="OSWorld", source_citation="arXiv:2404.07972",
            )

        if stat_result["verdict"] == Verdict.FAIL:
            breakdown["file_exists"] = 0.0
            return self._make_result(
                Verdict.FAIL, 0.0, breakdown, evidence, input_data,
                permissions=["fs:read"],
                source_benchmark="OSWorld", source_citation="arXiv:2404.07972",
                repair_hints=[
                    f"File not found at expected path: {expected_path}",
                    "Check directory permissions",
                    "Ensure parent directory exists before writing",
                ],
                suggested_action="Verify the file path and re-create the file",
            )

        breakdown["file_exists"] = 1.0

        # ── Check file size if required ──────────────────────────────────
        if min_size is not None:
            size_result = execute_sandboxed(f"wc -c {expected_path}")
            if size_result["verdict"] == Verdict.PASS:
                try:
                    # wc -c output format: "  123 /path/to/file"
                    size_str = size_result["stdout"].strip().split()[0]
                    actual_size = int(size_str)
                    evidence["actual_size"] = actual_size
                    evidence["min_size_required"] = min_size
                    breakdown["size_check"] = 1.0 if actual_size >= min_size else 0.0
                except (ValueError, IndexError):
                    breakdown["size_check"] = 0.0
                    evidence["size_parse_error"] = size_result["stdout"]
            else:
                breakdown["size_check"] = 0.0

        # ── Check content hash if required ───────────────────────────────
        if expected_hash is not None:
            # Try sha256sum (Linux), fall back to shasum -a 256 (macOS)
            hash_result = execute_sandboxed(f"sha256sum {expected_path}")
            if hash_result["verdict"] != Verdict.PASS:
                hash_result = execute_sandboxed(f"shasum -a 256 {expected_path}")

            if hash_result["verdict"] == Verdict.PASS:
                actual_hash = hash_result["stdout"].split()[0] if hash_result["stdout"] else ""
                evidence["actual_hash"] = actual_hash
                evidence["expected_hash"] = expected_hash
                breakdown["content_hash"] = 1.0 if actual_hash == expected_hash else 0.0
            else:
                breakdown["content_hash"] = 0.0
                evidence["hash_error"] = hash_result.get("error")

        # ── Compute final score ──────────────────────────────────────────
        checks = list(breakdown.values())
        score = sum(checks) / len(checks) if checks else 1.0
        verdict = Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL

        hints: list[str] = []
        if breakdown.get("size_check", 1.0) < 1.0:
            hints.append(f"File size {evidence.get('actual_size', '?')} below minimum {min_size}")
        if breakdown.get("content_hash", 1.0) < 1.0:
            hints.append("Content hash mismatch - file contents differ from expected")

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            permissions=["fs:read"],
            source_benchmark="OSWorld", source_citation="arXiv:2404.07972",
            repair_hints=hints if verdict == Verdict.FAIL else [],
        )
