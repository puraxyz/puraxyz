"""``vr skill`` - Manage skill artifacts and routing."""

from __future__ import annotations

import json

import click


@click.group()
def skill() -> None:
    """Manage skill artifacts and routing."""


@skill.command()
@click.argument("task_description")
@click.option("--family", default="general", help="Task family for routing")
@click.option("--top-k", default=3, type=int, help="Max skills to return")
def route(task_description: str, family: str, top_k: int) -> None:  # pragma: no cover
    """Route a task to the best available skills."""
    from ..skills.router import SkillRouter

    router = SkillRouter(top_k=top_k)
    # In production, router state would be loaded from disk
    selected = router.select_skills(task_description, family)

    if not selected:
        click.echo("No VERIFIED skills available for routing.")
        click.echo("Register and promote skills first with 'vr skill promote'.")
        return

    click.echo(f"Selected {len(selected)} skill(s) for: {task_description}")
    for sid in selected:
        stats = router.get_skill_stats(sid, family)
        click.echo(f"  → {sid} (mean utility: {stats['mean_utility']:.3f})")


@skill.command()
@click.argument("skill_id")
@click.argument(
    "target_stage",
    type=click.Choice(["CANDIDATE", "VERIFIED", "DEPRECATED"]),
)
def promote(skill_id: str, target_stage: str) -> None:  # pragma: no cover
    """Promote a skill to a new lifecycle stage."""
    from ..core.types import PromotionStage, SkillArtifact
    from ..skills.artifact import SkillLifecycleError, promote as do_promote

    # In production, load skill artifact from registry
    skill = SkillArtifact(skill_id=skill_id)
    target = PromotionStage(target_stage)

    try:
        promoted = do_promote(skill, target)
        click.echo(f"✅ {skill_id}: {skill.promotion_stage.value} → {promoted.promotion_stage.value}")
    except SkillLifecycleError as exc:
        click.echo(f"❌ Promotion failed: {exc}", err=True)


@skill.command()
@click.option("--skill-id", help="Filter by skill ID")
@click.option("--format", "fmt", type=click.Choice(["summary", "json"]), default="summary")
def report(skill_id: str | None, fmt: str) -> None:  # pragma: no cover
    """Print skill adoption telemetry summary."""
    from ..skills.telemetry import TelemetryLogger

    logger = TelemetryLogger()
    summary = logger.summary(skill_id=skill_id)

    if fmt == "json":
        click.echo(json.dumps(summary, indent=2))
    else:
        click.echo("Skill Adoption Telemetry Summary")
        click.echo(f"{'─' * 40}")
        for key, value in summary.items():
            if isinstance(value, float):
                click.echo(f"  {key}: {value:.3f}")
            else:
                click.echo(f"  {key}: {value}")
