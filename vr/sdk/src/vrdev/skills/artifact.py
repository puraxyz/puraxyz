"""Skill artifact management with promotion lifecycle.

Lifecycle: DRAFT → CANDIDATE → VERIFIED → DEPRECATED
                     ↕               ↓
                   DRAFT        CANDIDATE (demotion)

DEPRECATED is terminal - no transitions out.
"""

from __future__ import annotations

from ..core.types import PromotionStage, SkillArtifact

# ── Valid state transitions ──────────────────────────────────────────────────

VALID_TRANSITIONS: dict[PromotionStage, set[PromotionStage]] = {
    PromotionStage.DRAFT: {PromotionStage.CANDIDATE},
    PromotionStage.CANDIDATE: {PromotionStage.VERIFIED, PromotionStage.DRAFT},
    PromotionStage.VERIFIED: {PromotionStage.DEPRECATED, PromotionStage.CANDIDATE},
    PromotionStage.DEPRECATED: set(),  # Terminal state
}

# ── Promotion requirements (for documentation / UI) ─────────────────────────

PROMOTION_REQUIREMENTS: dict[PromotionStage, list[str]] = {
    PromotionStage.CANDIDATE: [
        "SKILL.json validates against schema",
        "Fixtures are syntactically valid",
        "Basic sanity checks pass",
    ],
    PromotionStage.VERIFIED: [
        "Positive uplift: lower bound of 95% CI on pass-rate improvement > 0",
        "No critical domain regressions",
        "Token overhead <= 500 tokens p50",
        "Latency overhead <= 2000ms p50",
        "At least 30 paired evaluation samples",
    ],
}


class SkillLifecycleError(Exception):
    """Raised when an invalid state transition is attempted."""


def can_promote(
    skill: SkillArtifact,
    target: PromotionStage,
) -> tuple[bool, str]:
    """Check whether a skill can be promoted to the target stage.

    Returns
    -------
    tuple[bool, str]
        ``(can_promote, reason)``
    """
    current = skill.promotion_stage

    if target not in VALID_TRANSITIONS.get(current, set()):
        valid = [s.value for s in VALID_TRANSITIONS.get(current, set())]
        return False, (
            f"Cannot transition from {current.value} to {target.value}. "
            f"Valid targets: {valid}"
        )

    if target == PromotionStage.VERIFIED:
        # Check uplift requirement
        if skill.uplift_lower_ci is None:
            return False, "uplift_lower_ci is not set. Run paired evaluation first."
        if skill.uplift_lower_ci <= 0:
            return False, (
                f"uplift_lower_ci is {skill.uplift_lower_ci:.4f} (must be > 0). "
                f"Skill does not demonstrate positive uplift."
            )
        # Check overhead thresholds
        if skill.token_overhead_p50 > 500:
            return False, (
                f"Token overhead p50 is {skill.token_overhead_p50} "
                f"(must be <= 500 tokens)."
            )
        if skill.latency_overhead_ms_p50 > 2000:
            return False, (
                f"Latency overhead p50 is {skill.latency_overhead_ms_p50}ms "
                f"(must be <= 2000ms)."
            )

    return True, "OK"


def promote(skill: SkillArtifact, target: PromotionStage) -> SkillArtifact:
    """Promote a skill to a new lifecycle stage.

    Returns a new ``SkillArtifact`` with the updated stage.

    Raises
    ------
    SkillLifecycleError
        If the transition is invalid or promotion requirements are not met.
    """
    ok, reason = can_promote(skill, target)
    if not ok:
        raise SkillLifecycleError(reason)

    return skill.model_copy(update={"promotion_stage": target})
