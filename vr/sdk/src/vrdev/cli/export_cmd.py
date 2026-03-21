"""``vr export`` - Export verification results as JSONL training data."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click


@click.command()
@click.argument("verifier_id")
@click.argument("completions_file", type=click.Path(exists=True))
@click.option(
    "--ground-truth", "-g",
    type=click.Path(exists=True),
    help="JSON file containing ground truth dict",
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    default="-",
    help="Output file (default: stdout)",
)
@click.option(
    "--context", "-c",
    type=click.Path(exists=True),
    help="JSON file containing context dict",
)
def export(  # pragma: no cover
    verifier_id: str,
    completions_file: str,
    ground_truth: str | None,
    output: str,
    context: str | None,
) -> None:
    """Export verification results as JSONL training data.

    COMPLETIONS_FILE should contain one completion per line (plain text)
    or be a JSON array of strings.
    """
    from ..core.export import export_jsonl
    from ..core.registry import get_verifier
    from ..core.types import VerifierInput

    # Load completions
    completions_path = Path(completions_file)
    raw = completions_path.read_text()
    try:
        completions = json.loads(raw)
        if not isinstance(completions, list):
            completions = [raw.strip()]
    except json.JSONDecodeError:
        completions = [line for line in raw.splitlines() if line.strip()]

    if not completions:
        click.echo("Error: no completions found", err=True)
        sys.exit(1)

    # Load ground truth
    gt: dict = {}
    if ground_truth:
        gt = json.loads(Path(ground_truth).read_text())

    # Load context
    ctx: dict | None = None
    if context:
        ctx = json.loads(Path(context).read_text())

    # Build input
    input_data = VerifierInput(
        completions=completions,
        ground_truth=gt,
        context=ctx,
    )

    # Run verifier
    try:
        v = get_verifier(verifier_id)
    except KeyError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    results = v.verify(input_data)

    # Export
    if output == "-":
        count = export_jsonl(results, input_data, verifier_id, sys.stdout)
    else:
        out_path = Path(output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            count = export_jsonl(results, input_data, verifier_id, f)

    click.echo(f"Exported {count} record(s)", err=True)
