"""``vr inspect`` - display a detailed scorecard for a verifier.

Usage::

    vr inspect vr/filesystem.file_created
    vr inspect vr/tau2.retail.order_cancelled --json
"""

from __future__ import annotations

import json
from pathlib import Path

import click

from ..core.registry import list_verifiers

# Registry root: <repo>/registry/verifiers
# __file__ = packages/vrdev/src/vrdev/cli/inspect_cmd.py  →  parents[5] = repo root
_REGISTRY_ROOT = Path(__file__).resolve().parents[5] / "registry" / "verifiers"


def _count_fixtures(verifier_dir: Path) -> dict[str, int]:
    """Count fixture entries in each fixture file."""
    counts: dict[str, int] = {}
    for name in ("positive.json", "negative.json", "adversarial.json"):
        fpath = verifier_dir / name
        if fpath.exists():
            try:
                data = json.loads(fpath.read_text())
                fixtures = data.get("fixtures", data) if isinstance(data, dict) else data
                counts[name.replace(".json", "")] = len(fixtures) if isinstance(fixtures, list) else 0
            except (json.JSONDecodeError, TypeError):
                counts[name.replace(".json", "")] = 0
        else:
            counts[name.replace(".json", "")] = 0
    return counts


@click.command()
@click.argument("verifier_id")
@click.option("--json-output", "as_json", is_flag=True, help="Output as JSON")
def inspect(verifier_id: str, as_json: bool) -> None:
    """Display the scorecard and metadata for a verifier.

    VERIFIER_ID is the fully-qualified verifier ID (e.g., vr/filesystem.file_created).
    """
    # Validate verifier exists in code registry
    all_ids = list_verifiers()
    if verifier_id not in all_ids:
        raise click.ClickException(
            f"Unknown verifier: {verifier_id}. "
            f"Run 'vr registry list' to see all available verifiers."
        )

    # Derive directory name from ID (vr/x.y.z → x.y.z)
    dir_name = verifier_id.removeprefix("vr/")
    verifier_dir = _REGISTRY_ROOT / dir_name
    spec_path = verifier_dir / "VERIFIER.json"

    if not spec_path.exists():
        raise click.ClickException(
            f"Registry spec not found at {spec_path}. "
            f"Verifier is registered in code but missing VERIFIER.json."
        )

    spec = json.loads(spec_path.read_text())
    fixture_counts = _count_fixtures(verifier_dir)

    if as_json:
        output = {
            **spec,
            "fixture_summary": fixture_counts,
        }
        click.echo(json.dumps(output, indent=2))
        return

    # Pretty-print scorecard
    scorecard = spec.get("scorecard", {})
    attack = scorecard.get("attack_surface", {})

    click.echo(f"\n{'═' * 60}")
    click.echo(f"  {verifier_id}  v{spec.get('version', '?')}")
    click.echo(f"{'═' * 60}")
    click.echo(f"  Description : {spec.get('description', '-')}")
    click.echo(f"  Tier        : {spec.get('tier', '?')}")
    click.echo(f"  Domain      : {spec.get('domain', '?')}")
    click.echo(f"  Task Type   : {spec.get('task_type', '?')}")
    click.echo(f"  Benchmark   : {spec.get('source_benchmark') or '-'}")
    click.echo(f"  Citation    : {spec.get('source_citation', '-')}")
    click.echo(f"  Contributor : {spec.get('contributor', '?')}")
    click.echo()

    click.echo("  Scorecard")
    click.echo(f"  {'─' * 40}")
    click.echo(f"  Determinism      : {scorecard.get('determinism', '?')}")
    click.echo(f"  Evidence Quality : {scorecard.get('evidence_quality', '?')}")
    click.echo(f"  Intended Use     : {scorecard.get('intended_use', '?')}")
    if attack:
        click.echo(f"  Injection Risk   : {attack.get('injection_risk', '-')}")
        click.echo(f"  Format Gaming    : {attack.get('format_gaming_risk', '-')}")
        click.echo(f"  Tool Spoofing    : {attack.get('tool_spoofing_risk', '-')}")
    click.echo()

    perms = spec.get("permissions_required", [])
    click.echo(f"  Permissions : {', '.join(perms) if perms else 'none'}")
    click.echo(f"  Gating Req. : {'yes' if spec.get('gating_required') else 'no'}")
    click.echo()

    click.echo("  Fixtures")
    click.echo(f"  {'─' * 40}")
    total = 0
    for kind, count in fixture_counts.items():
        click.echo(f"  {kind:14s} : {count}")
        total += count
    click.echo(f"  {'total':14s} : {total}")
    click.echo()
