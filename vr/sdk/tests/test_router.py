"""Tests for the skill router (Thompson sampling contextual bandit)."""

import tempfile
from pathlib import Path


from vrdev.core.types import PromotionStage, SkillArtifact, Verdict
from vrdev.skills.router import BetaDistribution, SkillRouter


# ── BetaDistribution ─────────────────────────────────────────────────────────


class TestBetaDistribution:
    def test_initial_prior(self):
        d = BetaDistribution()
        assert d.alpha == 1.0
        assert d.beta == 1.0

    def test_mean_initial(self):
        d = BetaDistribution()
        assert d.mean() == 0.5

    def test_update_success(self):
        d = BetaDistribution()
        d.update_success(1.0)
        assert d.alpha == 2.0
        assert d.beta == 1.0
        assert d.mean() > 0.5

    def test_update_failure(self):
        d = BetaDistribution()
        d.update_failure(1.0)
        assert d.alpha == 1.0
        assert d.beta == 2.0
        assert d.mean() < 0.5

    def test_serialization_roundtrip(self):
        d = BetaDistribution(alpha=5.0, beta=3.0)
        data = d.to_dict()
        restored = BetaDistribution.from_dict(data)
        assert restored.alpha == 5.0
        assert restored.beta == 3.0

    def test_sample_within_range(self):
        d = BetaDistribution(alpha=10.0, beta=10.0)
        for _ in range(100):
            s = d.sample()
            assert 0.0 <= s <= 1.0


# ── SkillRouter ──────────────────────────────────────────────────────────────


class TestSkillRouter:
    def _make_verified_skill(self, skill_id: str) -> SkillArtifact:
        return SkillArtifact(
            skill_id=skill_id,
            promotion_stage=PromotionStage.VERIFIED,
            description="Test skill",
            token_overhead_p50=100,
            latency_overhead_ms_p50=200,
            uplift_lower_ci=0.1,
        )

    def _make_draft_skill(self, skill_id: str) -> SkillArtifact:
        return SkillArtifact(
            skill_id=skill_id,
            promotion_stage=PromotionStage.DRAFT,
        )

    def test_empty_router_returns_nothing(self):
        router = SkillRouter()
        selected = router.select_skills("cancel order", "retail")
        assert selected == []

    def test_draft_skills_not_routed(self):
        router = SkillRouter()
        router.register_skill(self._make_draft_skill("skills/draft@0.1.0"))
        selected = router.select_skills("cancel order", "retail")
        assert selected == []

    def test_verified_skills_are_routed(self):
        router = SkillRouter()
        router.register_skill(self._make_verified_skill("skills/a@0.1.0"))
        selected = router.select_skills("cancel order", "retail")
        assert "skills/a@0.1.0" in selected

    def test_top_k_limits_selection(self):
        router = SkillRouter(top_k=2)
        for i in range(5):
            router.register_skill(self._make_verified_skill(f"skills/s{i}@0.1.0"))
        selected = router.select_skills("task", "general")
        assert len(selected) <= 2

    def test_update_pass_improves_selection(self):
        router = SkillRouter(top_k=1)
        router.register_skill(self._make_verified_skill("skills/good@0.1.0"))
        router.register_skill(self._make_verified_skill("skills/bad@0.1.0"))

        for _ in range(20):
            router.update("skills/good@0.1.0", "retail", Verdict.PASS, 1.0)
            router.update("skills/bad@0.1.0", "retail", Verdict.FAIL, 0.0)

        # After training, "good" should dominate selection.
        selections = []
        for _ in range(100):
            selected = router.select_skills("cancel order", "retail")
            if selected:
                selections.append(selected[0])

        good_count = selections.count("skills/good@0.1.0")
        assert good_count > 80

    def test_unverifiable_does_not_update(self):
        router = SkillRouter()
        router.register_skill(self._make_verified_skill("skills/a@0.1.0"))

        dist_before = router.get_distribution("skills/a@0.1.0", "retail")
        alpha_before, beta_before = dist_before.alpha, dist_before.beta

        router.update("skills/a@0.1.0", "retail", Verdict.UNVERIFIABLE, 0.0)

        dist_after = router.get_distribution("skills/a@0.1.0", "retail")
        assert dist_after.alpha == alpha_before
        assert dist_after.beta == beta_before

    def test_error_does_not_update(self):
        router = SkillRouter()
        router.register_skill(self._make_verified_skill("skills/a@0.1.0"))

        dist_before = router.get_distribution("skills/a@0.1.0", "retail")
        alpha_before = dist_before.alpha

        router.update("skills/a@0.1.0", "retail", Verdict.ERROR, 0.0)

        dist_after = router.get_distribution("skills/a@0.1.0", "retail")
        assert dist_after.alpha == alpha_before

    def test_state_persistence(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            state_path = f.name

        try:
            router1 = SkillRouter(state_path=state_path)
            router1.register_skill(self._make_verified_skill("skills/a@0.1.0"))
            router1.update("skills/a@0.1.0", "retail", Verdict.PASS, 1.0)

            router2 = SkillRouter(state_path=state_path)
            dist = router2.get_distribution("skills/a@0.1.0", "retail")
            assert dist.alpha == 2.0  # 1 (prior) + 1 (update)
        finally:
            Path(state_path).unlink(missing_ok=True)

    def test_get_skill_stats(self):
        router = SkillRouter()
        router.register_skill(self._make_verified_skill("skills/a@0.1.0"))
        router.update("skills/a@0.1.0", "retail", Verdict.PASS, 1.0)
        router.update("skills/a@0.1.0", "retail", Verdict.FAIL, 0.0)

        stats = router.get_skill_stats("skills/a@0.1.0", "retail")
        assert stats["skill_id"] == "skills/a@0.1.0"
        assert stats["total_observations"] == 2.0
