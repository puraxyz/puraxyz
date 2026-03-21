"""Tests for registry loader - validation, hydration, and search."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from vrdev.core.registry_loader import (
    RegistryValidationError,
    load_verifier_spec,
    load_skill_spec,
    search_verifiers,
    validate_verifier_spec,
    validate_skill_spec,
    _parse_scorecard,
)
from vrdev.core.types import (
    DeterminismType,
    EvidenceQuality,
    IntendedUse,
    RiskLevel,
)


# ── Fixtures ─────────────────────────────────────────────────────────

def _valid_verifier_spec() -> dict:
    return {
        "id": "vr/test.example",
        "name": "Test Example Verifier",
        "version": "0.1.0",
        "tier": "HARD",
        "description": "A test verifier",
        "source_benchmark": "test-bench",
        "source_citation": "arXiv:0000.00000",
        "scorecard": {
            "determinism": "deterministic",
            "evidence_quality": "hard-state",
            "attack_surface": {
                "injection_risk": "low",
                "format_gaming_risk": "low",
                "tool_spoofing_risk": "low",
            },
            "intended_use": "eval-and-train",
            "gating_required": False,
            "recommended_gates": [],
            "permissions_required": ["fs:read"],
        },
        "fixtures": {
            "positive": [{"input": "x", "expected": True}],
            "negative": [{"input": "y", "expected": False}],
        },
    }


def _valid_skill_spec() -> dict:
    return {
        "skill_id": "openclaw.cancel_and_email",
        "name": "Cancel & Email",
        "version": "0.1.0",
        "description": "Cancel order then send confirmation email",
        "verifiers": [
            "vr/tau2.retail.order_cancelled",
            "vr/aiv.email.sent_folder_confirmed",
        ],
        "triggers": ["cancel order"],
        "preconditions": ["order exists"],
        "exit_criteria": ["order cancelled", "email sent"],
    }


# ── Verifier spec validation ────────────────────────────────────────

class TestVerifierValidation:
    def test_valid_spec_passes(self):
        errors = validate_verifier_spec(_valid_verifier_spec())
        assert errors == []

    def test_missing_required_field(self):
        spec = _valid_verifier_spec()
        del spec["tier"]
        errors = validate_verifier_spec(spec)
        assert len(errors) > 0
        assert any("tier" in e for e in errors)

    def test_invalid_tier(self):
        spec = _valid_verifier_spec()
        spec["tier"] = "IMPOSSIBLE"
        errors = validate_verifier_spec(spec)
        assert len(errors) > 0

    def test_invalid_id_pattern(self):
        spec = _valid_verifier_spec()
        spec["id"] = "bad-id-no-prefix"
        errors = validate_verifier_spec(spec)
        assert len(errors) > 0

    def test_invalid_version_format(self):
        spec = _valid_verifier_spec()
        spec["version"] = "not-a-version"
        errors = validate_verifier_spec(spec)
        assert len(errors) > 0

    def test_missing_scorecard_required(self):
        spec = _valid_verifier_spec()
        del spec["scorecard"]["determinism"]
        errors = validate_verifier_spec(spec)
        assert len(errors) > 0


# ── Skill spec validation ────────────────────────────────────────────

class TestSkillValidation:
    def test_valid_spec_passes(self):
        errors = validate_skill_spec(_valid_skill_spec())
        assert errors == []

    def test_missing_required_field(self):
        spec = _valid_skill_spec()
        del spec["verifiers"]
        errors = validate_skill_spec(spec)
        assert len(errors) > 0

    def test_invalid_version_format(self):
        spec = _valid_skill_spec()
        spec["version"] = "bad"
        errors = validate_skill_spec(spec)
        assert len(errors) > 0


# ── Scorecard hydration ─────────────────────────────────────────────

class TestScorecardHydration:
    def test_full_scorecard(self):
        raw = {
            "determinism": "deterministic",
            "evidence_quality": "hard-state",
            "attack_surface": {
                "injection_risk": "low",
                "format_gaming_risk": "medium",
                "tool_spoofing_risk": "high",
            },
            "intended_use": "eval-only",
            "gating_required": True,
            "recommended_gates": ["format_check"],
            "permissions_required": ["fs:read"],
            "source_benchmark": "τ²-bench",
            "source_citation": "arXiv:2406.12045",
        }
        sc = _parse_scorecard(raw)
        assert sc.determinism == DeterminismType.DETERMINISTIC
        assert sc.evidence_quality == EvidenceQuality.HARD_STATE
        assert sc.attack_surface.injection_risk == RiskLevel.LOW
        assert sc.attack_surface.format_gaming_risk == RiskLevel.MEDIUM
        assert sc.attack_surface.tool_spoofing_risk == RiskLevel.HIGH
        assert sc.intended_use == IntendedUse.EVAL_ONLY
        assert sc.gating_required is True
        assert sc.recommended_gates == ["format_check"]
        assert sc.permissions_required == ["fs:read"]

    def test_minimal_scorecard(self):
        raw = {
            "determinism": "agentic",
            "evidence_quality": "api-state",
        }
        sc = _parse_scorecard(raw)
        assert sc.determinism == DeterminismType.AGENTIC
        assert sc.evidence_quality == EvidenceQuality.API_STATE
        assert sc.attack_surface.injection_risk == RiskLevel.LOW  # default
        assert sc.gating_required is False  # default


# ── File loading ─────────────────────────────────────────────────────

class TestFileLoading:
    def test_load_verifier_spec(self, tmp_path: Path):
        f = tmp_path / "VERIFIER.json"
        f.write_text(json.dumps(_valid_verifier_spec()))
        result = load_verifier_spec(f)
        assert result["id"] == "vr/test.example"
        assert "scorecard_model" in result
        assert result["scorecard_model"].determinism == DeterminismType.DETERMINISTIC

    def test_load_invalid_verifier_spec_raises(self, tmp_path: Path):
        spec = _valid_verifier_spec()
        del spec["id"]
        f = tmp_path / "VERIFIER.json"
        f.write_text(json.dumps(spec))
        with pytest.raises(RegistryValidationError) as exc_info:
            load_verifier_spec(f)
        assert len(exc_info.value.errors) > 0

    def test_load_skill_spec(self, tmp_path: Path):
        f = tmp_path / "SKILL.json"
        f.write_text(json.dumps(_valid_skill_spec()))
        result = load_skill_spec(f)
        assert result["skill_id"] == "openclaw.cancel_and_email"

    def test_load_invalid_skill_spec_raises(self, tmp_path: Path):
        spec = _valid_skill_spec()
        del spec["skill_id"]
        f = tmp_path / "SKILL.json"
        f.write_text(json.dumps(spec))
        with pytest.raises(RegistryValidationError):
            load_skill_spec(f)


# ── Search ───────────────────────────────────────────────────────────

class TestSearch:
    def test_search_single_keyword(self):
        results = search_verifiers("email")
        assert "vr/aiv.email.sent_folder_confirmed" in results
        assert "vr/rubric.email.tone_professional" in results

    def test_search_multiple_keywords(self):
        results = search_verifiers("tau2 airline")
        assert "vr/tau2.airline.rebooking_correct" in results

    def test_search_no_match(self):
        results = search_verifiers("xyznonexistent")
        assert results == []

    def test_search_case_insensitive(self):
        results = search_verifiers("FILESYSTEM")
        assert "vr/filesystem.file_created" in results

    def test_search_partial_match(self):
        results = search_verifiers("retail")
        assert "vr/tau2.retail.order_cancelled" in results
