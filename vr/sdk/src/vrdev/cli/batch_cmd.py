"""``vr batch`` - Batch-verify multiple traces against a verifier."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click


@click.command()
@click.argument("verifier_id")
@click.argument("traces_file", type=click.Path(exists=True))
@click.option(
    "--output",
    "-o",
    type=click.Choice(["json", "summary"]),
    default="summary",
    help="Output format",
)
def batch(verifier_id: str, traces_file: str, output: str) -> None:  # pragma: no cover
    """Batch-verify multiple traces against a single verifier.

    TRACES_FILE should be a JSON array of trace objects, each with
    ``completions`` and ``ground_truth`` fields.

        vr batch vr/filesystem.file_created traces.json
    """
    from ..core.registry import get_verifier
    from ..core.types import VerifierInput

    traces = json.loads(Path(traces_file).read_text())
    if not isinstance(traces, list):
        click.echo("Error: traces file must contain a JSON array", err=True)
        sys.exit(1)

    try:
        v = get_verifier(verifier_id)
    except KeyError as exc:
        click.echo(f"Error: {exc}", err=True)
        sys.exit(1)

    total = len(traces)
    passed = 0

    for idx, trace in enumerate(traces):
        input_data = VerifierInput(
            completions=trace.get("completions", [trace.get("completion", "")]),
            ground_truth=trace.get("ground_truth", {}),
            context=trace.get("context"),
        )
        results = v.verify(input_data)

        for result in results:
            if result.passed:
                passed += 1
            if output == "json":
                click.echo(result.model_dump_json(indent=2))
            else:
                status = "✅" if result.passed else "❌"
                click.echo(f"{status} Trace {idx + 1}: {result.verdict.value} "
                           f"(score: {result.score:.2f})")

    if output == "summary":
        click.echo(f"\n{'─' * 40}")
        click.echo(f"Batch complete: {passed}/{total} passed")
