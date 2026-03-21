"""``vr compose`` - Run a composed verifier chain."""

from __future__ import annotations

import json
import sys

import click


@click.command()
@click.argument("verifier_ids", nargs=-1, required=True)
@click.argument("trace_file", type=click.Path(exists=True))
@click.option("--require-hard", is_flag=True, help="Gate on HARD verifiers before running SOFT/AGENTIC")
@click.option(
    "--policy",
    "-p",
    type=click.Choice(["fail_closed", "fail_open"]),
    default="fail_closed",
    help="Policy mode for the composition (default: fail_closed)",
)
@click.option(
    "--output",
    "-o",
    type=click.Choice(["json", "summary"]),
    default="summary",
    help="Output format",
)
def compose(  # pragma: no cover
    verifier_ids: tuple[str, ...],
    trace_file: str,
    require_hard: bool,
    policy: str,
    output: str,
) -> None:
    """Run a composed verifier chain against a trace file.

    Pass one or more VERIFIER_IDS followed by a TRACE_FILE:

        vr compose vr/filesystem.file_created vr/code.python.lint_ruff trace.json
    """
    from ..core.compose import compose as do_compose
    from ..core.registry import get_verifier
    from ..core.types import PolicyMode, VerifierInput

    # Load trace
    with open(trace_file) as f:
        trace = json.load(f)

    input_data = VerifierInput(
        completions=trace.get("completions", [trace.get("completion", "")]),
        ground_truth=trace.get("ground_truth", {}),
        context=trace.get("context"),
    )

    # Resolve verifiers
    verifiers = []
    for vid in verifier_ids:
        try:
            verifiers.append(get_verifier(vid))
        except KeyError as exc:
            click.echo(f"Error: {exc}", err=True)
            sys.exit(1)

    policy_mode = PolicyMode.FAIL_CLOSED if policy == "fail_closed" else PolicyMode.FAIL_OPEN
    chain = do_compose(verifiers, require_hard=require_hard, policy_mode=policy_mode)
    results = chain.verify(input_data)

    for i, result in enumerate(results):
        if output == "json":
            click.echo(result.model_dump_json(indent=2))
        else:
            status = "✅" if result.passed else "❌"
            click.echo(f"{status} Completion {i + 1}: {result.verdict.value} "
                       f"(score: {result.score:.2f})")
            if result.breakdown:
                for k, v_score in result.breakdown.items():
                    click.echo(f"   {k}: {v_score:.2f}")
