"""``vr registry`` - list, validate, and search verifier/skill specs."""

from __future__ import annotations

import json
from pathlib import Path

import click

from ..core.registry import list_verifiers
from ..core.registry_loader import (
    search_verifiers,
    validate_verifier_spec,
    validate_skill_spec,
)


@click.group()
def registry():
    """Manage the vr.dev verifier & skill registry."""


@registry.command("list")
def list_cmd():
    """List all registered verifier IDs."""
    ids = list_verifiers()
    if not ids:
        click.echo("No verifiers registered.")
        return
    for vid in ids:
        click.echo(vid)


@registry.command()
@click.argument("path", type=click.Path(exists=True, path_type=Path))
def validate(path: Path):
    """Validate a VERIFIER.json or SKILL.json file against its schema."""
    data = json.loads(path.read_text())
    filename = path.name.upper()

    if filename == "SKILL.JSON" or "skill_id" in data:
        errors = validate_skill_spec(data, path)
    else:
        errors = validate_verifier_spec(data, path)

    if errors:
        click.secho(f"✗ {path} - {len(errors)} error(s):", fg="red")
        for err in errors:
            click.echo(f"  • {err}")
        raise SystemExit(1)
    else:
        click.secho(f"✓ {path} - valid", fg="green")


@registry.command()
@click.argument("query")
def search(query: str):
    """Search verifiers by keyword."""
    matches = search_verifiers(query)
    if not matches:
        click.echo(f"No verifiers matching '{query}'.")
        return
    for vid in matches:
        click.echo(vid)
