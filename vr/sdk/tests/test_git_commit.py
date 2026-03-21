"""Tests for vr/git.commit_present - CommitPresentVerifier."""

from __future__ import annotations

import subprocess

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.code.git_commit import CommitPresentVerifier


@pytest.fixture
def verifier():
    return CommitPresentVerifier()


@pytest.fixture
def git_repo(tmp_path):
    """Create a temporary git repo with a known commit."""
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init"], cwd=repo, capture_output=True, check=True)
    subprocess.run(
        ["git", "config", "user.email", "test@vrdev.test"],
        cwd=repo, capture_output=True, check=True,
    )
    subprocess.run(
        ["git", "config", "user.name", "VR Test"],
        cwd=repo, capture_output=True, check=True,
    )

    # Create first commit
    (repo / "file.txt").write_text("hello")
    subprocess.run(["git", "add", "."], cwd=repo, capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "Initial commit: add file.txt"],
        cwd=repo, capture_output=True, check=True,
    )

    # Create second commit
    (repo / "feature.py").write_text("def feature():\n    return 42\n")
    subprocess.run(["git", "add", "."], cwd=repo, capture_output=True, check=True)
    subprocess.run(
        ["git", "commit", "-m", "feat: add feature function"],
        cwd=repo, capture_output=True, check=True,
    )

    # Capture SHA of latest commit
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo, capture_output=True, text=True, check=True,
    )
    sha = result.stdout.strip()

    return {"path": str(repo), "sha": sha}


class TestCommitByMessage:
    """Find commits by message substring."""

    def test_message_found(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "feature function",
            },
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["message_match"] == 1.0

    def test_message_not_found(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "nonexistent commit message xyz",
            },
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["message_match"] == 0.0

    def test_initial_commit_found(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "Initial commit",
            },
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS


class TestCommitBySha:
    """Find commits by SHA prefix."""

    def test_sha_prefix_found(self, verifier, git_repo):
        sha = git_repo["sha"]
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_sha_prefix": sha[:8],
            },
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["sha_match"] == 1.0

    def test_nonexistent_sha(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_sha_prefix": "0000000000000000",
            },
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["sha_match"] == 0.0


class TestCommitEdgeCases:
    """Error handling and edge cases."""

    def test_no_criteria_returns_error(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"repo_path": git_repo["path"]},
        )
        results = verifier.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_multiple_completions(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["first", "second"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "Initial commit",
            },
        )
        results = verifier.verify(inp)
        assert len(results) == 2

    def test_evidence_contains_repo_path(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "Initial commit",
            },
        )
        results = verifier.verify(inp)
        assert results[0].evidence["repo_path"] == git_repo["path"]

    def test_execution_ms_recorded(self, verifier, git_repo):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "repo_path": git_repo["path"],
                "commit_message_substring": "Initial commit",
            },
        )
        results = verifier.verify(inp)
        assert results[0].metadata.execution_ms >= 0
