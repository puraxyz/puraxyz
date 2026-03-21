"""Git enterprise verifiers: PR merge, CI status, and workflow checks.

All are HARD-tier deterministic verifiers that query GitHub API state.
They accept either a live API token or a ``pre_result`` dict for testing.
"""

from __future__ import annotations

import os
import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _github_api(endpoint: str, token: str | None = None) -> dict:  # pragma: no cover
    """Make a GET request to the GitHub REST API."""
    import httpx
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = httpx.get(f"https://api.github.com{endpoint}", headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


class PrMergedVerifier(BaseVerifier):
    """Verifies that a GitHub PR was merged to the target branch.

    Ground truth schema::

        {
            "repo": str,               # "owner/repo"
            "pr_number": int,
            "target_branch": str,       # default "main"
            "pre_result": dict | null   # { "merged": bool, "merge_commit_sha": str }
        }
    """

    name = "git.pr.merged"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        repo = gt.get("repo", "")
        pr_number = gt.get("pr_number")
        target_branch = gt.get("target_branch", "main")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"repo": repo, "pr_number": pr_number, "target_branch": target_branch}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            merged = pre_result.get("merged", False)
            base_branch = pre_result.get("base_branch", target_branch)
        elif repo and pr_number:
            token = os.environ.get("GITHUB_TOKEN")
            try:
                data = _github_api(f"/repos/{repo}/pulls/{pr_number}", token)
                merged = data.get("merged", False)
                base_branch = data.get("base", {}).get("ref", "")
                evidence["merge_commit_sha"] = data.get("merge_commit_sha")
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:github"], retryable=True)
        else:
            evidence["error"] = "no repo/pr_number or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:github"])

        evidence["merged"] = merged
        breakdown["merged"] = 1.0 if merged else 0.0
        breakdown["target_branch_match"] = 1.0 if base_branch == target_branch else 0.0

        all_pass = all(v == 1.0 for v in breakdown.values())
        score = sum(breakdown.values()) / len(breakdown)
        verdict = Verdict.PASS if all_pass else Verdict.FAIL

        hints: list[str] = []
        if not merged:
            hints.append(f"PR #{pr_number} has not been merged yet")
            hints.append("Ensure the PR is approved and merge it")
        if base_branch != target_branch:
            hints.append(f"PR targets '{base_branch}' instead of '{target_branch}'")

        return self._make_result(verdict, round(score, 4), breakdown, evidence, input_data,
                                 permissions=["api:github"], repair_hints=hints)


class CiPassedVerifier(BaseVerifier):
    """Verifies that all CI checks passed for a commit SHA.

    Ground truth schema::

        {
            "repo": str,               # "owner/repo"
            "commit_sha": str,
            "pre_result": dict | null   # { "all_passed": bool, "check_runs": [...] }
        }
    """

    name = "git.ci.passed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        repo = gt.get("repo", "")
        commit_sha = gt.get("commit_sha", "")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"repo": repo, "commit_sha": commit_sha}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            all_passed = pre_result.get("all_passed", False)
            check_runs = pre_result.get("check_runs", [])
        elif repo and commit_sha:
            token = os.environ.get("GITHUB_TOKEN")
            try:
                data = _github_api(f"/repos/{repo}/commits/{commit_sha}/check-runs", token)
                check_runs = data.get("check_runs", [])
                all_passed = all(
                    cr.get("conclusion") == "success" for cr in check_runs
                ) if check_runs else False
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:github"], retryable=True)
        else:
            evidence["error"] = "no repo/commit_sha or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:github"])

        evidence["check_run_count"] = len(check_runs)
        evidence["all_passed"] = all_passed
        breakdown["ci_passed"] = 1.0 if all_passed else 0.0
        score = breakdown["ci_passed"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            if not check_runs:
                hints.append("No CI check runs found for this commit")
            else:
                failed = [cr.get("name", "?") for cr in check_runs
                          if cr.get("conclusion") != "success"]
                for name in failed[:5]:
                    hints.append(f"Check '{name}' did not pass")
            hints.append("Fix failing checks and push again")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:github"], repair_hints=hints)


class WorkflowPassedVerifier(BaseVerifier):
    """Verifies that a specific GitHub Actions workflow passed.

    Ground truth schema::

        {
            "repo": str,               # "owner/repo"
            "workflow_name": str,
            "ref": str,                # branch or tag, default "main"
            "pre_result": dict | null  # { "conclusion": str, "status": str }
        }
    """

    name = "ci.github.workflow_passed"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        repo = gt.get("repo", "")
        workflow_name = gt.get("workflow_name", "")
        ref = gt.get("ref", "main")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"repo": repo, "workflow_name": workflow_name, "ref": ref}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            conclusion = pre_result.get("conclusion", "")
        elif repo and workflow_name:
            token = os.environ.get("GITHUB_TOKEN")
            try:
                data = _github_api(
                    f"/repos/{repo}/actions/runs?branch={ref}&per_page=10", token
                )
                runs = data.get("workflow_runs", [])
                matched = [r for r in runs if r.get("name") == workflow_name]
                if matched:
                    conclusion = matched[0].get("conclusion", "")
                    evidence["run_id"] = matched[0].get("id")
                    evidence["status"] = matched[0].get("status")
                else:
                    conclusion = ""
                    evidence["info"] = f"No runs found for workflow '{workflow_name}'"
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:github"], retryable=True)
        else:
            evidence["error"] = "no repo/workflow_name or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:github"])

        evidence["conclusion"] = conclusion
        breakdown["workflow_success"] = 1.0 if conclusion == "success" else 0.0
        score = breakdown["workflow_success"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            if not conclusion:
                hints.append(f"No workflow run found for '{workflow_name}' on ref '{ref}'")
            else:
                hints.append(f"Workflow concluded with '{conclusion}' instead of 'success'")
            hints.append("Check workflow logs for failure details")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:github"], repair_hints=hints)
