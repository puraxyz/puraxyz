"""Tests for skill artifact promotion lifecycle."""

import pytest

from vrdev.core.types import PromotionStage, SkillArtifact
from vrdev.skills.artifact import SkillLifecycleError, can_promote, promote


class TestPromotionLifecycle:
    """Full lifecycle: DRAFT → CANDIDATE → VERIFIED → DEPRECATED."""

    def test_draft_to_candidate(self):
        skill = SkillArtifact(skill_id="test@0.1.0")
        promoted = promote(skill, PromotionStage.CANDIDATE)
        assert promoted.promotion_stage == PromotionStage.CANDIDATE

    def test_draft_cannot_skip_to_verified(self):
        skill = SkillArtifact(skill_id="test@0.1.0")
        with pytest.raises(SkillLifecycleError):
            promote(skill, PromotionStage.VERIFIED)

    def test_candidate_to_verified_requires_uplift(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
        )
        ok, reason = can_promote(skill, PromotionStage.VERIFIED)
        assert not ok
        assert "uplift_lower_ci" in reason

    def test_candidate_to_verified_with_positive_uplift(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
            uplift_lower_ci=0.05,
            token_overhead_p50=200,
            latency_overhead_ms_p50=500,
        )
        promoted = promote(skill, PromotionStage.VERIFIED)
        assert promoted.promotion_stage == PromotionStage.VERIFIED

    def test_candidate_to_verified_fails_with_negative_uplift(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
            uplift_lower_ci=-0.02,
            token_overhead_p50=200,
            latency_overhead_ms_p50=500,
        )
        with pytest.raises(SkillLifecycleError):
            promote(skill, PromotionStage.VERIFIED)

    def test_candidate_to_verified_fails_with_high_token_overhead(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
            uplift_lower_ci=0.1,
            token_overhead_p50=600,  # Over 500 threshold
            latency_overhead_ms_p50=500,
        )
        with pytest.raises(SkillLifecycleError):
            promote(skill, PromotionStage.VERIFIED)

    def test_candidate_to_verified_fails_with_high_latency(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
            uplift_lower_ci=0.1,
            token_overhead_p50=200,
            latency_overhead_ms_p50=3000,  # Over 2000ms threshold
        )
        with pytest.raises(SkillLifecycleError):
            promote(skill, PromotionStage.VERIFIED)

    def test_verified_to_deprecated(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.VERIFIED,
        )
        promoted = promote(skill, PromotionStage.DEPRECATED)
        assert promoted.promotion_stage == PromotionStage.DEPRECATED

    def test_deprecated_is_terminal(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.DEPRECATED,
        )
        with pytest.raises(SkillLifecycleError):
            promote(skill, PromotionStage.CANDIDATE)

    def test_verified_can_demote_to_candidate(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.VERIFIED,
        )
        demoted = promote(skill, PromotionStage.CANDIDATE)
        assert demoted.promotion_stage == PromotionStage.CANDIDATE

    def test_candidate_can_demote_to_draft(self):
        skill = SkillArtifact(
            skill_id="test@0.1.0",
            promotion_stage=PromotionStage.CANDIDATE,
        )
        demoted = promote(skill, PromotionStage.DRAFT)
        assert demoted.promotion_stage == PromotionStage.DRAFT

    def test_promote_returns_new_instance(self):
        """promote() returns a copy; original is unmodified."""
        skill = SkillArtifact(skill_id="test@0.1.0")
        promoted = promote(skill, PromotionStage.CANDIDATE)
        assert skill.promotion_stage == PromotionStage.DRAFT
        assert promoted.promotion_stage == PromotionStage.CANDIDATE
