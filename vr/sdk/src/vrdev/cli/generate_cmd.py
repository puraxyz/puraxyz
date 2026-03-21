"""Scaffold a new verifier from a template.

Usage::

    vr generate --name "database.row.updated" --tier hard
    vr generate --name "messaging.slack.sent" --tier agentic
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import click


_VERIFY_PY_TEMPLATE = '''\
"""Verifier: {name}

Ground truth schema::

    {{
        "TODO": "define expected fields"
    }}

Context (optional)::

    {{
        "TODO": "define runtime config"
    }}
"""

from __future__ import annotations

import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


class {class_name}(BaseVerifier):
    """{description}"""

    name = "{name}"
    tier = Tier.{tier_upper}
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []

        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(gt, completion, input_data)
            result.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(result)

        return results

    def _verify_single(
        self,
        gt: dict[str, Any],
        completion: str,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {{}}
        breakdown: dict[str, float] = {{}}

        # TODO: Implement verification logic
        # 1. Extract expected values from gt
        # 2. Check actual system state
        # 3. Populate breakdown and evidence
        # 4. Determine verdict and score

        verdict = Verdict.PASS
        score = 1.0

        return self._make_result(
            verdict, score, breakdown, evidence, input_data,
            permissions=[],
        )
'''

_VERIFIER_JSON_TEMPLATE = {
    "version": "0.1.0",
    "ground_truth_schema": {
        "type": "object",
        "required": [],
        "properties": {},
    },
    "scorecard": {
        "determinism": "deterministic",
        "evidence_quality": "hard-state",
        "intended_use": "eval-and-train",
        "gating_required": False,
        "recommended_gates": [],
        "permissions_required": [],
    },
    "contributor": "vr.dev",
}

_FIXTURE_TEMPLATE = {"fixtures": []}


def _name_to_class(name: str) -> str:
    """Convert 'database.row.updated' to 'RowUpdatedVerifier'."""
    parts = name.split(".")
    # Use the last 2 parts for the class name
    relevant = parts[-2:] if len(parts) >= 2 else parts
    return "".join(p.capitalize() for p in relevant) + "Verifier"


def _name_to_domain(name: str) -> str:
    """Extract domain from name: 'database.row.updated' -> 'database'."""
    return name.split(".")[0]


@click.command()
@click.option(
    "--name", "-n", default=None,
    help="Verifier name (e.g. database.row.updated)",
)
@click.option(
    "--tier", "-t", default=None,
    type=click.Choice(["hard", "soft", "agentic"], case_sensitive=False),
    help="Verifier tier",
)
@click.option(
    "--description", "-d", default="",
    help="Short description of what this verifier checks",
)
@click.option(
    "--output", "-o", default=None, type=click.Path(),
    help="Output directory (default: registry/verifiers/<name>/)",
)
@click.option(
    "--task", default=None,
    help="Natural language task description for AI-powered generation (requires OPENAI_API_KEY)",
)
@click.option(
    "--api", "api_spec", default=None, type=click.Path(exists=True),
    help="OpenAPI/Swagger spec file for grounding AI generation",
)
@click.option(
    "--schema", "sql_schema", default=None, type=click.Path(exists=True),
    help="SQL schema file for grounding AI generation",
)
@click.option(
    "--model", default="gpt-4o",
    help="OpenAI model for AI generation (default: gpt-4o)",
)
def generate(  # pragma: no cover
    name: str | None,
    tier: str | None,
    description: str,
    output: str | None,
    task: str | None,
    api_spec: str | None,
    sql_schema: str | None,
    model: str,
) -> None:
    """Scaffold a new verifier from a template, or generate one with AI.

    Template mode (default):
        vr generate --name database.row.updated --tier hard

    AI-powered mode (requires OPENAI_API_KEY):
        vr generate --task "Cancel order and confirm refund" --api swagger.json
        vr generate --task "Verify database row updated" --schema schema.sql
        vr generate --task "Check if file exists at path" --tier hard
    """
    if task:
        _generate_ai(task, tier, output, api_spec, sql_schema, model)
        return

    # Template mode - requires --name and --tier
    if not name:
        raise click.UsageError("--name is required in template mode. Use --task for AI generation.")
    if not tier:
        raise click.UsageError("--tier is required in template mode. Use --task for AI generation.")
    verifier_id = f"vr/{name}"
    class_name = _name_to_class(name)
    domain = _name_to_domain(name)
    tier_upper = tier.upper()

    if not description:
        description = f"Verifies {name.replace('.', ' ')}"

    # Determine output path
    if output:
        out_dir = Path(output)
    else:
        # Default: relative to the registry directory
        out_dir = Path("registry") / "verifiers" / name
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Write VERIFIER.json
    spec = {
        "id": verifier_id,
        **_VERIFIER_JSON_TEMPLATE,
        "tier": tier_upper,
        "domain": domain,
        "task_type": name.split(".")[-1] if "." in name else name,
        "description": description,
        "created_at": date.today().isoformat(),
        "source_citation": "",
        "permissions_required": [],
    }
    spec_path = out_dir / "VERIFIER.json"
    spec_path.write_text(json.dumps(spec, indent=2) + "\n")

    # 2. Write verify.py
    verify_path = out_dir / "verify.py"
    verify_path.write_text(
        _VERIFY_PY_TEMPLATE.format(
            name=name,
            class_name=class_name,
            tier_upper=tier_upper,
            description=description,
        )
    )

    # 3. Write fixture files
    for fixture_name in ("positive", "negative", "adversarial"):
        fixture_path = out_dir / f"{fixture_name}.json"
        fixture_path.write_text(json.dumps(_FIXTURE_TEMPLATE, indent=2) + "\n")

    click.echo(f"✓ Scaffolded verifier: {verifier_id}")
    click.echo(f"  Directory: {out_dir}")
    click.echo("  Files created:")
    click.echo("    VERIFIER.json   - spec (edit ground_truth_schema)")
    click.echo("    verify.py       - implementation (fill in TODO)")
    click.echo("    positive.json   - add 3+ passing fixtures")
    click.echo("    negative.json   - add 3+ failing fixtures")
    click.echo("    adversarial.json - add 3+ adversarial fixtures")
    click.echo()
    click.echo("  Next steps:")
    click.echo("    1. Edit verify.py - implement _verify_single()")
    click.echo(f"    2. Add to registry.py: \"{verifier_id}\": \"module:{class_name}\"")
    click.echo("    3. Add fixture data to positive/negative/adversarial.json")
    click.echo(f"    4. Run: vr registry validate {out_dir}")


def _generate_ai(
    task: str,
    tier: str | None,
    output: str | None,
    api_spec: str | None,
    sql_schema: str | None,
    model: str,
) -> None:
    """AI-powered verifier generation using LLM synthesis."""
    from .synth import synthesize_verifier

    click.echo("🤖 AI Verifier Synthesis")
    click.echo(f"  Task: {task}")

    spec_path = api_spec or sql_schema
    spec_type = None
    if api_spec:
        spec_type = "OpenAPI"
        click.echo(f"  Spec: {api_spec} (OpenAPI)")
    elif sql_schema:
        spec_type = "SQL Schema"
        click.echo(f"  Spec: {sql_schema} (SQL)")

    if tier:
        click.echo(f"  Tier: {tier.upper()}")

    click.echo()

    try:
        result = synthesize_verifier(
            task=task,
            tier=tier.upper() if tier else None,
            spec_path=spec_path,
            spec_type=spec_type,
            model=model,
            verbose=True,
        )
    except ImportError as e:
        raise click.ClickException(str(e))

    # Determine output path
    if output:
        out_dir = Path(output)
    else:
        out_dir = Path("registry") / "verifiers" / result.name
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write all artifacts
    (out_dir / "verify.py").write_text(result.verify_py)
    (out_dir / "VERIFIER.json").write_text(json.dumps(result.verifier_json, indent=2) + "\n")
    (out_dir / "positive.json").write_text(json.dumps(result.positive_fixtures, indent=2) + "\n")
    (out_dir / "negative.json").write_text(json.dumps(result.negative_fixtures, indent=2) + "\n")
    (out_dir / "adversarial.json").write_text(json.dumps(result.adversarial_fixtures, indent=2) + "\n")

    click.echo()
    click.echo(f"✓ Generated verifier: vr/{result.name}")
    click.echo(f"  Tier: {result.tier}")
    click.echo(f"  Description: {result.description}")
    click.echo(f"  Directory: {out_dir}")
    click.echo("  Files:")
    click.echo("    verify.py         - AI-generated implementation")
    click.echo("    VERIFIER.json     - spec with ground_truth_schema")
    click.echo(f"    positive.json     - {len(result.positive_fixtures.get('fixtures', []))} fixtures")
    click.echo(f"    negative.json     - {len(result.negative_fixtures.get('fixtures', []))} fixtures")
    click.echo(f"    adversarial.json  - {len(result.adversarial_fixtures.get('fixtures', []))} fixtures")

    if result.warnings:
        click.echo()
        click.echo("  ⚠ Warnings (review before use):")
        for w in result.warnings:
            click.echo(f"    - {w}")
