"""vr/git.commit_present - HARD verifier for git commit presence.

Source: SWE-bench (arXiv:2310.06770)
Checks that a specific commit (by SHA prefix or message substring) exists
in a git repository using the sandbox runner.
"""

from __future__ import annotations

import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput
from ...runners.sandbox import execute_sandboxed


class CommitPresentVerifier(BaseVerifier):
    """Verifies that a git commit exists in a repository.

    Ground truth schema::

        {
            "repo_path": str,                     # path to the git repo
            "commit_sha_prefix": str | null,      # SHA prefix to find (at least 7 chars)
            "commit_message_substring": str | null # substring to search in messages
        }

    At least one of ``commit_sha_prefix`` or ``commit_message_substring`` must
    be provided. If both are given, both must match the same commit.
    """

    name = "git.commit_present"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        repo_path = gt.get("repo_path", ".")
        sha_prefix = gt.get("commit_sha_prefix")
        msg_sub = gt.get("commit_message_substring")

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                repo_path, sha_prefix, msg_sub, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        repo_path: str,
        sha_prefix: str | None,
        msg_sub: str | None,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"repo_path": repo_path}
        breakdown: dict[str, float] = {}

        if not sha_prefix and not msg_sub:
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown,
                {**evidence, "error": "Need commit_sha_prefix or commit_message_substring"},
                input_data, permissions=["exec:git"],
                source_benchmark="SWE-bench", source_citation="arXiv:2310.06770",
            )

        # Check 1: SHA prefix match via git log
        if sha_prefix:
            cmd = f"git log --format=%H --all {sha_prefix}"
            result = execute_sandboxed(cmd, timeout=15.0, cwd=repo_path)
            evidence["sha_lookup_returncode"] = result["returncode"]

            if result["verdict"] == Verdict.ERROR:
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown,
                    {**evidence, "error": result["error"]},
                    input_data, permissions=["exec:git"],
                    source_benchmark="SWE-bench", source_citation="arXiv:2310.06770",
                )

            # git log with a SHA prefix returns matching commits
            sha_found = any(
                line.strip().startswith(sha_prefix)
                for line in result["stdout"].splitlines()
                if line.strip()
            )
            breakdown["sha_match"] = 1.0 if sha_found else 0.0
            evidence["sha_found"] = sha_found
            evidence["sha_prefix"] = sha_prefix

        # Check 2: Message substring match via git log --grep
        if msg_sub:
            cmd = f"git log --format=%H%n%s --all --grep={msg_sub!r}"
            result = execute_sandboxed(cmd, timeout=15.0, cwd=repo_path)
            evidence["msg_lookup_returncode"] = result["returncode"]

            if result["verdict"] == Verdict.ERROR:
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown,
                    {**evidence, "error": result["error"]},
                    input_data, permissions=["exec:git"],
                    source_benchmark="SWE-bench", source_citation="arXiv:2310.06770",
                )

            msg_found = bool(result["stdout"].strip())
            breakdown["message_match"] = 1.0 if msg_found else 0.0
            evidence["message_found"] = msg_found
            evidence["message_substring"] = msg_sub

        # Aggregate
        all_pass = all(v == 1.0 for v in breakdown.values())
        score = sum(breakdown.values()) / len(breakdown) if breakdown else 0.0

        hints: list[str] = []
        if not all_pass:
            if breakdown.get("sha_match", 1.0) < 1.0:
                hints.append("Commit SHA not found in branch - ensure changes were pushed")
            if breakdown.get("message_match", 1.0) < 1.0:
                hints.append("Commit message substring not found - check commit message text")

        return self._make_result(
            Verdict.PASS if all_pass else Verdict.FAIL,
            round(score, 4), breakdown, evidence, input_data,
            permissions=["exec:git"],
            source_benchmark="SWE-bench", source_citation="arXiv:2310.06770",
            repair_hints=hints,
        )
