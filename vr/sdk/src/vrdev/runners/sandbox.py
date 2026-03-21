"""Sandboxed subprocess runner with explicit command allowlist.

The allowlist is enforced at the subprocess spawn level. Commands not on the
list raise a PermissionError that verifiers catch and return as verdict=ERROR.
"""

from __future__ import annotations

import shlex
import subprocess

from ..core.types import Verdict

# ── Allowlist ────────────────────────────────────────────────────────────────
# Only commands in this set can be executed by the sandbox.
# This is the security boundary for Tier C (AGENTIC) verifiers.
ALLOWED_COMMANDS: frozenset[str] = frozenset(
    {
        "ls",
        "stat",
        "cat",
        "find",
        "grep",
        "git",
        "sha256sum",
        "shasum",
        "wc",
        "head",
        "tail",
        "file",
        "du",
        "df",
        "ruff",
        "python",
        "pytest",
    }
)


def _extract_base_command(command: str) -> str:
    """Extract the base command name from a full command string.

    Handles path-qualified commands (e.g., ``/usr/bin/ls`` → ``ls``).
    """
    try:
        parts = shlex.split(command)
    except ValueError:
        return ""
    if not parts:
        return ""
    return parts[0].split("/")[-1]


def execute_sandboxed(
    command: str,
    timeout: float = 30.0,
    cwd: str | None = None,
) -> dict:
    """Execute a read-only shell command within the sandbox allowlist.

    Returns
    -------
    dict
        Keys: ``stdout``, ``stderr``, ``returncode``, ``verdict``, ``error``.
        ``verdict`` is ``Verdict.ERROR`` if the command is not allowed or timed out.
    """
    base_cmd = _extract_base_command(command)

    if base_cmd not in ALLOWED_COMMANDS:
        return {
            "stdout": "",
            "stderr": "",
            "returncode": -1,
            "verdict": Verdict.ERROR,
            "error": (
                f"Command '{base_cmd}' is not in the sandbox allowlist. "
                f"Allowed commands: {sorted(ALLOWED_COMMANDS)}"
            ),
        }

    try:
        cmd_list = shlex.split(command)
        result = subprocess.run(
            cmd_list,
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "verdict": Verdict.PASS if result.returncode == 0 else Verdict.FAIL,
            "error": None,
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "",
            "returncode": -1,
            "verdict": Verdict.ERROR,
            "error": f"Command timed out after {timeout}s",
        }
    except Exception as exc:
        return {
            "stdout": "",
            "stderr": "",
            "returncode": -1,
            "verdict": Verdict.ERROR,
            "error": str(exc),
        }
