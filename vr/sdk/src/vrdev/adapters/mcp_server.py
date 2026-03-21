"""MCP server adapter for vr.dev - exposes verifiers as Model Context Protocol tools.

Requires the ``mcp`` optional dependency: ``pip install vrdev[mcp]``

Tools exposed:
  - ``list_verifiers``    - List all registered verifier IDs
  - ``run_verifier``      - Run a verifier with given input
  - ``compose_chain``     - Run a composed chain of verifiers
  - ``explain_failure``   - Explain why a verification failed
  - ``search_verifiers``  - Search verifiers by keyword

Transport: stdio (for Claude Desktop / Cursor integration)
"""

from __future__ import annotations

import json
from typing import Any


def _require_mcp():
    """Import and return the mcp module, raising a clear error if missing."""
    try:
        from mcp.server.fastmcp import FastMCP
        return FastMCP
    except ImportError:
        raise ImportError(
            "MCP support requires the 'mcp' package. "
            "Install with: pip install vrdev[mcp]"
        ) from None


def create_mcp_server() -> Any:
    """Create and configure the vr.dev MCP server with all tools registered."""
    FastMCP = _require_mcp()

    mcp = FastMCP(
        "vr.dev",
        version="1.0.0",
        description="Verify real-world AI agent outcomes against ground truth. "
        "38 verifiers across 19 domains: retail, airline, telecom, email, code, database, "
        "filesystem, web, git, and more. Compose verification pipelines "
        "with hard-gating to prevent reward hacking.",
    )

    # ── Tool: list_verifiers ─────────────────────────────────────────

    @mcp.tool()
    def list_verifiers() -> str:
        """List all registered verifier IDs in the vr.dev registry.

        Returns a JSON array of verifier ID strings such as:
        ["vr/filesystem.file_created", "vr/code.python.lint_ruff", ...]

        Use this to discover available verifiers, then call run_verifier
        or compose_chain with the IDs you need.
        """
        from vrdev.core.registry import list_verifiers as _list

        return json.dumps(_list(), indent=2)

    # ── Tool: run_verifier ───────────────────────────────────────────

    @mcp.tool()
    def run_verifier(
        verifier_id: str,
        completions: list[str],
        ground_truth: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> str:
        """Run a single verifier against agent completions to check real-world outcomes.

        Example: Verify a file was created:
            run_verifier("vr/filesystem.file_created", ["Created output.txt"],
                         {"expected_path": "/tmp/output.txt"})

        Example: Verify a Python file passes linting:
            run_verifier("vr/code.python.lint_ruff", ["def hello(): pass"],
                         {"file_path": "hello.py"})

        Args:
            verifier_id: Registry ID (e.g. "vr/filesystem.file_created", "vr/code.python.lint_ruff")
            completions: Agent completion strings - what the agent said/did
            ground_truth: Expected outcome (schema varies per verifier)
            context: Optional runtime context (API URLs, credentials, configs)

        Returns:
            JSON array of VerificationResult with verdict (PASS/FAIL), score, evidence, and breakdown.
        """
        from vrdev.core.registry import get_verifier
        from vrdev.core.types import VerifierInput

        v = get_verifier(verifier_id)
        inp = VerifierInput(
            completions=completions,
            ground_truth=ground_truth or {},
            context=context,
        )
        results = v.verify(inp)
        return json.dumps(
            [r.model_dump(mode="json") for r in results],
            indent=2,
        )

    # ── Tool: compose_chain ──────────────────────────────────────────

    @mcp.tool()
    def compose_chain(
        verifier_ids: list[str],
        completions: list[str],
        ground_truth: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
        policy: str = "fail_closed",
    ) -> str:
        """Run a composed chain of verifiers with hard-gating (prevents reward hacking).

        Combines multiple verifiers into a pipeline. With fail_closed policy,
        if any HARD verifier fails, the entire chain scores 0.0 regardless
        of SOFT verifier scores - this prevents agents from gaming LLM judges.

        Example: Verify order cancellation end-to-end:
            compose_chain(
                ["vr/tau2.retail.order_cancelled", "vr/aiv.email.sent_folder_confirmed"],
                ["I cancelled order ORD-42 and sent confirmation"],
                {"order_id": "ORD-42", "email_subject": "Cancellation confirmed"},
                policy="fail_closed"
            )

        Args:
            verifier_ids: Ordered list of verifier IDs to compose
            completions: Agent completions to verify
            ground_truth: Shared ground truth dict
            context: Shared runtime context
            policy: "fail_closed" (hard gates block) or "fail_open" (only FAIL blocks)

        Returns:
            JSON composed VerificationResult with per-verifier breakdown.
        """
        from vrdev.core.compose import compose
        from vrdev.core.registry import get_verifier
        from vrdev.core.types import PolicyMode, VerifierInput

        verifiers = [get_verifier(vid) for vid in verifier_ids]
        mode = PolicyMode(policy)
        composed = compose(verifiers, policy_mode=mode)
        inp = VerifierInput(
            completions=completions,
            ground_truth=ground_truth or {},
            context=context,
        )
        results = composed.verify(inp)
        return json.dumps(
            [r.model_dump(mode="json") for r in results],
            indent=2,
        )

    # ── Tool: explain_failure ────────────────────────────────────────

    @mcp.tool()
    def explain_failure(
        verifier_id: str,
        completions: list[str],
        ground_truth: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> str:
        """Run a verifier and return a human-readable failure explanation.

        Args:
            verifier_id: The verifier registry ID
            completions: Agent completions to verify
            ground_truth: Expected outcome
            context: Runtime context

        Returns:
            Markdown-formatted explanation of the verification result.
        """
        from vrdev.core.registry import get_verifier
        from vrdev.core.types import VerifierInput

        v = get_verifier(verifier_id)
        inp = VerifierInput(
            completions=completions,
            ground_truth=ground_truth or {},
            context=context,
        )
        results = v.verify(inp)

        lines = [f"## Verification: {verifier_id}\n"]
        for i, r in enumerate(results):
            lines.append(f"### Completion {i + 1}")
            lines.append(f"- **Verdict**: {r.verdict.value}")
            lines.append(f"- **Score**: {r.score:.4f}")
            lines.append(f"- **Tier**: {r.tier.value}")
            if r.breakdown:
                lines.append("- **Breakdown**:")
                for k, v_val in r.breakdown.items():
                    lines.append(f"  - {k}: {v_val}")
            if r.evidence:
                lines.append("- **Evidence** (key excerpts):")
                for k, v_val in list(r.evidence.items())[:10]:
                    val_str = str(v_val)[:200]
                    lines.append(f"  - {k}: {val_str}")
            if r.verdict.value != "PASS":
                lines.append("\n**Why it failed**: Check the breakdown scores - "
                            "any sub-check at 0.0 indicates the specific failure point.")
            if r.repair_hints:
                lines.append("\n## How to Fix")
                for hint in r.repair_hints:
                    lines.append(f"- {hint}")
                if r.retryable:
                    lines.append("\n*This failure may be transient - retrying could help.*")
                if r.suggested_action:
                    lines.append(f"\n**Suggested action**: {r.suggested_action}")
            lines.append("")

        return "\n".join(lines)

    # ── Tool: search_verifiers ───────────────────────────────────────

    @mcp.tool()
    def search_verifiers(query: str) -> str:
        """Search verifiers by keyword to find the right one for your task.

        Example queries: "email", "database row", "file created", "python lint",
        "order cancelled", "http status", "git commit"

        Args:
            query: Space-separated keywords to match against verifier IDs and descriptions

        Returns:
            JSON array of matching verifier ID strings.
        """
        from vrdev.core.registry_loader import search_verifiers as _search

        return json.dumps(_search(query), indent=2)

    # ── Tool: gem_reward ─────────────────────────────────────────────

    @mcp.tool()
    def gem_reward(
        verifier_id: str,
        response: str,
        reference: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> str:
        """Compute a GEM-compatible reward for a single agent response.

        Uses the GEMRewardWrapper adapter to produce a reward dict
        with ``score`` and ``metadata`` fields.

        Args:
            verifier_id: The verifier registry ID
            response: The agent response string to evaluate
            reference: Ground truth / reference dict
            context: Optional runtime context

        Returns:
            JSON reward object: {"score": float, "metadata": dict}
        """
        from vrdev.adapters.gem import GEMRewardWrapper
        from vrdev.core.registry import get_verifier

        v = get_verifier(verifier_id)
        wrapper = GEMRewardWrapper(v)
        result = wrapper.compute_reward(
            response=response,
            reference=reference or {},
            context=context,
        )
        return json.dumps(result, indent=2, default=str)

    return mcp


def run_stdio():
    """Run the MCP server on stdio transport."""
    server = create_mcp_server()
    server.run(transport="stdio")
