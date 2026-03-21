"""Core types, schemas, and data models for vr.dev verification artifacts."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, computed_field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Verdict(str, Enum):
    """Verification outcome. Every result carries exactly one verdict."""
    PASS = "PASS"
    FAIL = "FAIL"
    UNVERIFIABLE = "UNVERIFIABLE"
    ERROR = "ERROR"


class Tier(str, Enum):
    """Verification tier derived from VAGEN's progressive verification hierarchy."""
    HARD = "HARD"
    SOFT = "SOFT"
    AGENTIC = "AGENTIC"


class PolicyMode(str, Enum):
    """Controls how ERROR and UNVERIFIABLE verdicts propagate in composition."""
    FAIL_CLOSED = "fail_closed"
    FAIL_OPEN = "fail_open"
    ESCALATION = "escalation"
    ENSEMBLE = "ensemble"


class DeterminismType(str, Enum):
    DETERMINISTIC = "deterministic"
    STOCHASTIC_JUDGE = "stochastic-judge"
    AGENTIC = "agentic"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EvidenceQuality(str, Enum):
    HARD_STATE = "hard-state"
    API_STATE = "api-state"
    SCREENSHOT = "screenshot"
    JUDGE_OPINION = "judge-opinion"


class IntendedUse(str, Enum):
    EVAL_AND_TRAIN = "eval-and-train"
    EVAL_ONLY = "eval-only"


class PromotionStage(str, Enum):
    """Skill promotion lifecycle stage."""
    DRAFT = "DRAFT"
    CANDIDATE = "CANDIDATE"
    VERIFIED = "VERIFIED"
    DEPRECATED = "DEPRECATED"


# ---------------------------------------------------------------------------
# Verification Result components
# ---------------------------------------------------------------------------

class AttackResistance(BaseModel):
    injection_check: str = "not_applicable"
    format_gaming_check: str = "not_applicable"


class Provenance(BaseModel):
    verifier_pkg: str
    source_benchmark: Optional[str] = None
    source_citation: str
    trace_id: Optional[str] = None
    timestamp_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class ResultMetadata(BaseModel):
    execution_ms: int = 0
    permissions_used: list[str] = Field(default_factory=list)
    hard_gate_failed: bool = False
    runner_version: str = "0.1.0"
    policy_mode: PolicyMode = PolicyMode.FAIL_CLOSED


# ---------------------------------------------------------------------------
# VerificationResult - the canonical output of every verifier
# ---------------------------------------------------------------------------

class VerificationResult(BaseModel):
    """Structured, evidence-bearing, auditable record of a verification outcome."""

    verdict: Verdict
    score: float = Field(ge=0.0, le=1.0)
    tier: Tier
    breakdown: dict[str, float] = Field(default_factory=dict)
    evidence: dict[str, Any] = Field(default_factory=dict)
    provenance: Provenance
    attack_resistance: AttackResistance = Field(default_factory=AttackResistance)
    metadata: ResultMetadata = Field(default_factory=ResultMetadata)
    artifact_hash: str = ""
    input_hash: str = ""
    repair_hints: list[str] = Field(default_factory=list)
    retryable: bool = False
    suggested_action: str | None = None
    step_rewards: list[float] | None = None
    step_index: int | None = None
    is_terminal: bool = True
    signature: str | None = None
    signing_key_id: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def passed(self) -> bool:
        """Convenience: True iff verdict is PASS."""
        return self.verdict == Verdict.PASS

    def compute_hashes(self, input_data: dict) -> None:
        """Compute SHA-256 artifact_hash and input_hash for tamper-evidence."""
        artifact_content = json.dumps(
            {
                "verdict": self.verdict.value,
                "score": self.score,
                "breakdown": self.breakdown,
                "evidence": {k: str(v) for k, v in self.evidence.items()},
            },
            sort_keys=True,
        )
        self.artifact_hash = hashlib.sha256(artifact_content.encode()).hexdigest()

        input_content = json.dumps(input_data, sort_keys=True, default=str)
        self.input_hash = hashlib.sha256(input_content.encode()).hexdigest()


# ---------------------------------------------------------------------------
# VerifierInput - the canonical input to every verifier
# ---------------------------------------------------------------------------

class VerifierInput(BaseModel):
    """What the verifier receives: agent completions + ground truth + context."""

    completions: list[str]
    ground_truth: dict = Field(default_factory=dict)
    context: Optional[dict] = None


class StepInput(BaseModel):
    """A single step in a multi-step trajectory for process verification."""

    step_index: int
    completions: list[str]
    ground_truth: dict = Field(default_factory=dict)
    context: Optional[dict] = None
    is_terminal: bool = False


# ---------------------------------------------------------------------------
# VerifierScorecard - metadata per registry entry
# ---------------------------------------------------------------------------

class AttackSurface(BaseModel):
    injection_risk: RiskLevel = RiskLevel.LOW
    format_gaming_risk: RiskLevel = RiskLevel.LOW
    tool_spoofing_risk: RiskLevel = RiskLevel.LOW


class VerifierScorecard(BaseModel):
    determinism: DeterminismType
    attack_surface: AttackSurface = Field(default_factory=AttackSurface)
    evidence_quality: EvidenceQuality
    intended_use: IntendedUse = IntendedUse.EVAL_AND_TRAIN
    gating_required: bool = False
    recommended_gates: list[str] = Field(default_factory=list)
    permissions_required: list[str] = Field(default_factory=list)
    source_benchmark: Optional[str] = None
    source_citation: str = ""


# ---------------------------------------------------------------------------
# Skill Artifact - governed agent skill representation
# ---------------------------------------------------------------------------

class SkillArtifact(BaseModel):
    """A governed agent skill with promotion lifecycle."""

    skill_id: str
    promotion_stage: PromotionStage = PromotionStage.DRAFT
    description: str = ""
    triggers: list[str] = Field(default_factory=list)
    preconditions: list[str] = Field(default_factory=list)
    exit_criteria: list[str] = Field(default_factory=list)
    compatible_harnesses: list[str] = Field(default_factory=list)
    token_overhead_p50: int = 0
    latency_overhead_ms_p50: int = 0
    uplift_lower_ci: Optional[float] = None
    regression_domains: list[str] = Field(default_factory=list)
    provenance: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Skill Adoption Telemetry - per-routing-decision event
# ---------------------------------------------------------------------------

class SkillAdoptionTelemetry(BaseModel):
    """Logged every time a skill is considered during agent execution."""

    task_id: str
    skill_id: str
    discovery: bool = False
    activation: bool = False
    compliance: float = 0.0
    outcome_pass: bool = False
    token_cost: int = 0
    latency_ms: int = 0
    timestamp_utc: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
