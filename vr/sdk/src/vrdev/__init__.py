"""vr.dev - Verifiable Rewards for Real-World AI Agent Tasks."""

from vrdev.core.types import (
    Verdict,
    Tier,
    PolicyMode,
    VerificationResult,
    VerifierInput,
    VerifierScorecard,
    SkillArtifact,
    SkillAdoptionTelemetry,
    PromotionStage,
)
from vrdev.core.base import BaseVerifier
from vrdev.core.compose import compose, ComposedVerifier
from vrdev.core.normalize import z_score_normalize
from vrdev.core.registry import get_verifier, list_verifiers
from vrdev.core.config import VrConfig, get_config
from vrdev.core.registry_loader import (
    load_verifier_spec,
    search_verifiers,
    validate_verifier_spec,
)
from vrdev.core.export import export_jsonl, export_jsonl_lines
from vrdev.runners.http import async_http_get, async_http_post

__version__ = "1.0.0"

__all__ = [
    "Verdict",
    "Tier",
    "PolicyMode",
    "VerificationResult",
    "VerifierInput",
    "VerifierScorecard",
    "SkillArtifact",
    "SkillAdoptionTelemetry",
    "PromotionStage",
    "BaseVerifier",
    "compose",
    "ComposedVerifier",
    "z_score_normalize",
    "get_verifier",
    "list_verifiers",
    "VrConfig",
    "get_config",
    "load_verifier_spec",
    "search_verifiers",
    "validate_verifier_spec",
    "export_jsonl",
    "export_jsonl_lines",
    "async_http_get",
    "async_http_post",
]
