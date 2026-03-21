"""Skill adoption telemetry logger.

Writes SkillAdoptionTelemetry events to a local JSONL file.
Enables measurement of the Skill Adoption Funnel:
  Discovery rate → Activation rate → Execution compliance → Outcome uplift
"""

from __future__ import annotations

from pathlib import Path

from ..core.types import SkillAdoptionTelemetry


class TelemetryLogger:
    """Logs ``SkillAdoptionTelemetry`` events to a local JSONL file.

    Parameters
    ----------
    log_path : str | Path | None
        Path to the JSONL log file. Defaults to ``~/.vrdev/telemetry.jsonl``.
    """

    def __init__(self, log_path: str | Path | None = None):
        if log_path is None:
            log_path = Path.home() / ".vrdev" / "telemetry.jsonl"
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def log(self, event: SkillAdoptionTelemetry) -> None:
        """Append a telemetry event to the log file."""
        with self.log_path.open("a") as f:
            f.write(event.model_dump_json() + "\n")

    def read_events(
        self,
        skill_id: str | None = None,
        task_id: str | None = None,
        limit: int = 100,
    ) -> list[SkillAdoptionTelemetry]:
        """Read telemetry events with optional filtering.

        Returns the last ``limit`` matching events.
        """
        if not self.log_path.exists():
            return []

        events: list[SkillAdoptionTelemetry] = []
        with self.log_path.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    event = SkillAdoptionTelemetry.model_validate_json(line)
                    if skill_id and event.skill_id != skill_id:
                        continue
                    if task_id and event.task_id != task_id:
                        continue
                    events.append(event)
                except Exception:
                    continue  # Skip malformed lines

        return events[-limit:]

    def summary(self, skill_id: str | None = None) -> dict:
        """Compute summary statistics from telemetry.

        Returns adoption funnel metrics: discovery rate, activation rate,
        mean compliance, outcome pass rate, and efficiency metrics.
        """
        events = self.read_events(skill_id=skill_id, limit=10_000)

        if not events:
            return {
                "total_events": 0,
                "discovery_rate": 0.0,
                "activation_rate": 0.0,
                "mean_compliance": 0.0,
                "outcome_pass_rate": 0.0,
                "mean_token_cost": 0,
                "mean_latency_ms": 0,
            }

        n = len(events)
        return {
            "total_events": n,
            "discovery_rate": sum(1 for e in events if e.discovery) / n,
            "activation_rate": sum(1 for e in events if e.activation) / n,
            "mean_compliance": sum(e.compliance for e in events) / n,
            "outcome_pass_rate": sum(1 for e in events if e.outcome_pass) / n,
            "mean_token_cost": sum(e.token_cost for e in events) // n,
            "mean_latency_ms": sum(e.latency_ms for e in events) // n,
        }
