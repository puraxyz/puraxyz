"""``vr verify`` - Run a verifier against a trace file or agent output."""

from __future__ import annotations

import json
import sys

import click


@click.command()
@click.argument("trace_file", type=click.Path(exists=True), required=False)
@click.option("--verifier", "-v", help="Verifier ID to run (e.g., vr/filesystem.file_created)")
@click.option(
    "--output",
    "-o",
    type=click.Choice(["json", "summary"]),
    default="summary",
    help="Output format",
)
@click.option("--ground-truth", "-g", help="JSON string or @file path with ground truth dict")
@click.option("--completion", "-c", help="Completion string (alternative to trace file)")
def verify(
    trace_file: str | None,
    verifier: str | None,
    output: str,
    ground_truth: str | None,
    completion: str | None,
) -> None:
    """Run a verifier against a trace file or agent output.

    Provide either a TRACE_FILE (JSON with completions/ground_truth) or
    use --completion and --ground-truth flags for inline invocation.
    """
    if not trace_file and not completion:
        click.echo("Usage: vr verify <trace.json> --verifier <verifier_id>")
        click.echo("   or: vr verify -v <verifier_id> -c <completion> -g '<json>'")
        click.echo("Run 'vr verify --help' for more information.")
        return

    if not verifier:
        click.echo("Error: --verifier is required.", err=True)
        sys.exit(1)

    from ..core.registry import get_verifier
    from ..core.types import VerifierInput

    if trace_file:
        # Load from trace file
        with open(trace_file) as f:
            trace = json.load(f)
        input_data = VerifierInput(
            completions=trace.get("completions", [trace.get("completion", "")]),
            ground_truth=trace.get("ground_truth", {}),
            context=trace.get("context"),
        )
    else:
        # Build from flags
        gt: dict = {}
        if ground_truth:
            gt = _load_json_or_file(ground_truth)
        input_data = VerifierInput(
            completions=[completion],
            ground_truth=gt,
        )

    try:
        v = get_verifier(verifier)
    except KeyError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    results = v.verify(input_data)

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
            if not result.passed and result.evidence:
                click.echo(f"   Evidence: {json.dumps(result.evidence, indent=2, default=str)[:500]}")


def _load_json_or_file(value: str) -> dict:
    """Parse *value* as inline JSON or read from a ``@path`` reference."""
    from pathlib import Path

    if value.startswith("@"):
        return json.loads(Path(value[1:]).read_text())
    return json.loads(value)
