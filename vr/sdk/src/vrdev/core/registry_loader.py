"""Registry loader - validates and hydrates VERIFIER.json / SKILL.json files.

Provides ``validate_spec()`` for JSON-Schema validation of registry specs,
and ``load_verifier_spec()`` / ``load_skill_spec()`` for parsing specs into
Pydantic models.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .types import (
    AttackSurface,
    DeterminismType,
    EvidenceQuality,
    IntendedUse,
    RiskLevel,
    VerifierScorecard,
)


# ── JSON-Schema definitions (inline, minimal) ─────────────────────────────

_VERIFIER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["id", "version", "tier", "scorecard"],
    "properties": {
        "id": {"type": "string", "pattern": "^vr/"},
        "version": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$"},
        "tier": {"type": "string", "enum": ["HARD", "SOFT", "AGENTIC"]},
        "domain": {"type": "string"},
        "task_type": {"type": "string"},
        "description": {"type": "string"},
        "source_benchmark": {"type": ["string", "null"]},
        "source_citation": {"type": "string"},
        "scorecard": {
            "type": "object",
            "required": ["determinism", "evidence_quality"],
            "properties": {
                "determinism": {
                    "type": "string",
                    "enum": ["deterministic", "stochastic-judge", "agentic"],
                },
                "evidence_quality": {
                    "type": "string",
                    "enum": ["hard-state", "api-state", "screenshot", "judge-opinion"],
                },
                "attack_surface": {
                    "type": "object",
                    "properties": {
                        "injection_risk": {"type": "string", "enum": ["low", "medium", "high"]},
                        "format_gaming_risk": {"type": "string", "enum": ["low", "medium", "high"]},
                        "tool_spoofing_risk": {"type": "string", "enum": ["low", "medium", "high"]},
                    },
                },
                "intended_use": {
                    "type": "string",
                    "enum": ["eval-and-train", "eval-only"],
                },
                "gating_required": {"type": "boolean"},
                "recommended_gates": {"type": "array", "items": {"type": "string"}},
                "permissions_required": {"type": "array", "items": {"type": "string"}},
            },
        },
        "permissions_required": {"type": "array", "items": {"type": "string"}},
        "ground_truth_schema": {"type": "object"},
        "contributor": {"type": "string"},
    },
}

_SKILL_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["skill_id", "name", "version", "verifiers"],
    "properties": {
        "skill_id": {"type": "string"},
        "name": {"type": "string", "minLength": 1},
        "version": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$"},
        "description": {"type": "string"},
        "verifiers": {"type": "array", "items": {"type": "string"}},
        "triggers": {"type": "array", "items": {"type": "string"}},
        "preconditions": {"type": "array", "items": {"type": "string"}},
        "exit_criteria": {"type": "array", "items": {"type": "string"}},
    },
}


# ── Validation ─────────────────────────────────────────────────────────────

class RegistryValidationError(Exception):
    """Raised when a registry spec fails JSON-Schema validation."""

    def __init__(self, path: Path | str, errors: list[str]):
        self.path = Path(path)
        self.errors = errors
        super().__init__(f"Validation failed for {path}: {'; '.join(errors)}")


def validate_spec(data: dict[str, Any], schema: dict[str, Any], path: Path | str = "<unknown>") -> list[str]:
    """Validate a registry spec dict against a JSON schema.

    Returns a list of error messages (empty = valid).
    """
    try:
        import jsonschema
    except ImportError:
        return ["jsonschema not installed - cannot validate"]

    validator = jsonschema.Draft7Validator(schema)
    return [
        f"{'.'.join(str(p) for p in err.absolute_path) or '<root>'}: {err.message}"
        for err in sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    ]


def validate_verifier_spec(data: dict[str, Any], path: Path | str = "<unknown>") -> list[str]:
    """Validate a VERIFIER.json spec dict."""
    return validate_spec(data, _VERIFIER_SCHEMA, path)


def validate_skill_spec(data: dict[str, Any], path: Path | str = "<unknown>") -> list[str]:
    """Validate a SKILL.json spec dict."""
    return validate_spec(data, _SKILL_SCHEMA, path)


# ── Hydration ──────────────────────────────────────────────────────────────

def _parse_scorecard(raw: dict[str, Any]) -> VerifierScorecard:
    """Parse a scorecard dict from a VERIFIER.json into a typed model."""
    attack = raw.get("attack_surface", {})
    return VerifierScorecard(
        determinism=DeterminismType(raw["determinism"]),
        evidence_quality=EvidenceQuality(raw["evidence_quality"]),
        attack_surface=AttackSurface(
            injection_risk=RiskLevel(attack.get("injection_risk", "low")),
            format_gaming_risk=RiskLevel(attack.get("format_gaming_risk", "low")),
            tool_spoofing_risk=RiskLevel(attack.get("tool_spoofing_risk", "low")),
        ),
        intended_use=IntendedUse(raw.get("intended_use", "eval-and-train")),
        gating_required=raw.get("gating_required", False),
        recommended_gates=raw.get("recommended_gates", []),
        permissions_required=raw.get("permissions_required", []),
        source_benchmark=raw.get("source_benchmark"),
        source_citation=raw.get("source_citation", ""),
    )


def load_verifier_spec(path: Path | str) -> dict[str, Any]:
    """Load and validate a VERIFIER.json file.

    Returns the full parsed dict with a ``scorecard_model`` key containing
    the hydrated ``VerifierScorecard``.
    """
    path = Path(path)
    data = json.loads(path.read_text())
    errors = validate_verifier_spec(data, path)
    if errors:
        raise RegistryValidationError(path, errors)

    data["scorecard_model"] = _parse_scorecard(data["scorecard"])
    return data


def load_skill_spec(path: Path | str) -> dict[str, Any]:
    """Load and validate a SKILL.json file."""
    path = Path(path)
    data = json.loads(path.read_text())
    errors = validate_skill_spec(data, path)
    if errors:
        raise RegistryValidationError(path, errors)
    return data


def search_verifiers(query: str) -> list[str]:
    """Keyword search across registered verifier IDs.

    Returns matching verifier IDs where *any* keyword in the query matches
    a dot-separated segment of the ID.
    """
    from .registry import list_verifiers

    keywords = query.lower().split()
    results = []
    for vid in list_verifiers():
        vid_lower = vid.lower()
        # Match if any keyword appears anywhere in the ID
        if any(kw in vid_lower for kw in keywords):
            results.append(vid)
    return results
