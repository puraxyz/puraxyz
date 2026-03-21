"""Tests for skill telemetry logger."""

from __future__ import annotations

from vrdev.core.types import SkillAdoptionTelemetry
from vrdev.skills.telemetry import TelemetryLogger


class TestTelemetryLogger:
    def test_log_and_read(self, tmp_path):
        log = tmp_path / "telemetry.jsonl"
        tl = TelemetryLogger(log_path=log)

        event = SkillAdoptionTelemetry(
            skill_id="test.skill",
            task_id="task-1",
            event_type="execution",
            compliance_score=0.95,
            outcome_pass=True,
            token_cost=100,
            latency_ms=50,
        )
        tl.log(event)
        events = tl.read_events()
        assert len(events) == 1
        assert events[0].skill_id == "test.skill"

    def test_read_empty(self, tmp_path):
        log = tmp_path / "empty.jsonl"
        tl = TelemetryLogger(log_path=log)
        assert tl.read_events() == []

    def test_filter_by_skill(self, tmp_path):
        log = tmp_path / "telemetry.jsonl"
        tl = TelemetryLogger(log_path=log)

        for sid in ["a", "b", "a"]:
            tl.log(SkillAdoptionTelemetry(
                skill_id=sid, task_id="t", event_type="execution",
                compliance_score=1.0, outcome_pass=True, token_cost=0, latency_ms=0,
            ))
        assert len(tl.read_events(skill_id="a")) == 2

    def test_summary_empty(self, tmp_path):
        log = tmp_path / "empty.jsonl"
        tl = TelemetryLogger(log_path=log)
        s = tl.summary()
        assert s["total_events"] == 0

    def test_summary_with_events(self, tmp_path):
        log = tmp_path / "telemetry.jsonl"
        tl = TelemetryLogger(log_path=log)
        for _ in range(3):
            tl.log(SkillAdoptionTelemetry(
                skill_id="s", task_id="t", event_type="execution",
                compliance_score=0.8, outcome_pass=True, token_cost=100, latency_ms=50,
            ))
        s = tl.summary()
        assert s["total_events"] == 3
