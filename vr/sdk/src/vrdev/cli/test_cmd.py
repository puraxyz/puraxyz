"""``vr test`` - Run fixture tests for a verifier."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click


def _find_registry_root() -> Path:
    """Walk up from the package to find the registry/ directory."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "registry" / "verifiers"
        if candidate.is_dir():
            return candidate
    return Path("registry/verifiers")


@click.command()
@click.argument("verifier_id", required=False)
@click.option("--all", "run_all", is_flag=True, help="Run all verifier fixture tests")
def test(verifier_id: str | None, run_all: bool) -> None:  # pragma: no cover
    """Run fixture tests for a verifier."""
    from ..core.registry import get_verifier, list_verifiers
    from ..core.types import VerifierInput

    if not verifier_id and not run_all:
        click.echo("Usage: vr test <verifier_id> or vr test --all")
        return

    ids = list_verifiers() if run_all else [verifier_id]
    registry_root = _find_registry_root()
    total_pass = 0
    total_fail = 0

    for vid in ids:
        click.echo(f"\n{'─' * 60}")
        click.echo(f"Testing: {vid}")

        # Find fixture directory
        dir_name = vid.replace("vr/", "")
        fixture_dir = registry_root / dir_name
        if not fixture_dir.is_dir():
            click.echo(f"  ⚠ No fixture directory found at {fixture_dir}")
            continue

        try:
            v = get_verifier(vid)
        except KeyError as exc:
            click.echo(f"  ❌ {exc}")
            total_fail += 1
            continue

        # Run each fixture file
        for fixture_file in sorted(fixture_dir.glob("*.json")):
            if fixture_file.name == "VERIFIER.json":
                continue

            with open(fixture_file) as f:
                data = json.load(f)

            click.echo(f"  📋 {fixture_file.name} ({data.get('description', '')})")

            for fixture in data.get("fixtures", []):
                inp = fixture["input"]
                expected = fixture["expected"]
                input_data = VerifierInput(
                    completions=inp["completions"],
                    ground_truth=inp.get("ground_truth", {}),
                    context=inp.get("context"),
                )

                try:
                    results = v.verify(input_data)
                    result = results[0]

                    passed = True
                    reasons = []

                    if result.verdict.value != expected["verdict"]:
                        passed = False
                        reasons.append(f"verdict={result.verdict.value} != {expected['verdict']}")

                    if "min_score" in expected and result.score < expected["min_score"]:
                        passed = False
                        reasons.append(f"score={result.score:.2f} < min={expected['min_score']}")

                    if "max_score" in expected and result.score > expected["max_score"]:
                        passed = False
                        reasons.append(f"score={result.score:.2f} > max={expected['max_score']}")

                    if passed:
                        click.echo(f"    ✅ {fixture['name']}")
                        total_pass += 1
                    else:
                        click.echo(f"    ❌ {fixture['name']}: {', '.join(reasons)}")
                        total_fail += 1

                except Exception as exc:
                    click.echo(f"    ❌ {fixture['name']}: ERROR - {exc}")
                    total_fail += 1

    click.echo(f"\n{'═' * 60}")
    click.echo(f"Results: {total_pass} passed, {total_fail} failed")
    if total_fail > 0:
        sys.exit(1)
