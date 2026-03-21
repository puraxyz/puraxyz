"""Tests for core type definitions and validation."""

import pytest

from vrdev.core.types import (
    PromotionStage,
    Provenance,
    SkillAdoptionTelemetry,
    SkillArtifact,
    Tier,
    Verdict,
    VerificationResult,
    VerifierInput,
)


class TestVerdict:
    def test_verdict_values(self):
        assert Verdict.PASS == "PASS"
        assert Verdict.FAIL == "FAIL"
        assert Verdict.UNVERIFIABLE == "UNVERIFIABLE"
        assert Verdict.ERROR == "ERROR"

    def test_verdict_membership(self):
        assert len(Verdict) == 4


class TestVerificationResult:
    def test_minimal_result(self):
        result = VerificationResult(
            verdict=Verdict.PASS,
            score=1.0,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="vr/test@0.1.0", source_citation="test"),
        )
        assert result.verdict == Verdict.PASS
        assert result.score == 1.0
        assert result.tier == Tier.HARD
        assert result.passed is True

    def test_fail_result_passed_is_false(self):
        result = VerificationResult(
            verdict=Verdict.FAIL,
            score=0.0,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="test", source_citation="test"),
        )
        assert result.passed is False

    def test_score_validation_too_high(self):
        with pytest.raises(Exception):
            VerificationResult(
                verdict=Verdict.PASS,
                score=1.5,
                tier=Tier.HARD,
                provenance=Provenance(verifier_pkg="test", source_citation="test"),
            )

    def test_score_validation_too_low(self):
        with pytest.raises(Exception):
            VerificationResult(
                verdict=Verdict.PASS,
                score=-0.1,
                tier=Tier.HARD,
                provenance=Provenance(verifier_pkg="test", source_citation="test"),
            )

    def test_hash_computation(self):
        result = VerificationResult(
            verdict=Verdict.PASS,
            score=0.8,
            tier=Tier.HARD,
            breakdown={"check_a": 1.0, "check_b": 0.6},
            provenance=Provenance(verifier_pkg="vr/test@0.1.0", source_citation="test"),
        )
        input_data = {"completions": ["hello"], "ground_truth": {"key": "value"}}
        result.compute_hashes(input_data)

        assert len(result.artifact_hash) == 64  # SHA256 hex
        assert len(result.input_hash) == 64

    def test_identical_inputs_produce_identical_hashes(self):
        r1 = VerificationResult(
            verdict=Verdict.PASS,
            score=0.5,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="test", source_citation="test"),
        )
        r2 = VerificationResult(
            verdict=Verdict.PASS,
            score=0.5,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="test", source_citation="test"),
        )
        input_data = {"completions": ["x"], "ground_truth": {}}
        r1.compute_hashes(input_data)
        r2.compute_hashes(input_data)

        assert r1.artifact_hash == r2.artifact_hash
        assert r1.input_hash == r2.input_hash

    def test_different_scores_produce_different_artifact_hashes(self):
        r1 = VerificationResult(
            verdict=Verdict.PASS,
            score=0.5,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="test", source_citation="test"),
        )
        r2 = VerificationResult(
            verdict=Verdict.PASS,
            score=0.6,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="test", source_citation="test"),
        )
        input_data = {"completions": ["x"], "ground_truth": {}}
        r1.compute_hashes(input_data)
        r2.compute_hashes(input_data)

        assert r1.artifact_hash != r2.artifact_hash

    def test_serialization_roundtrip(self):
        result = VerificationResult(
            verdict=Verdict.PASS,
            score=0.9,
            tier=Tier.HARD,
            provenance=Provenance(verifier_pkg="vr/test@0.1.0", source_citation="test"),
        )
        data = result.model_dump()
        assert data["verdict"] == "PASS"
        assert data["score"] == 0.9

        restored = VerificationResult.model_validate(data)
        assert restored.verdict == Verdict.PASS
        assert restored.score == 0.9


class TestVerifierInput:
    def test_minimal_input(self):
        inp = VerifierInput(
            completions=["I cancelled the order"],
            ground_truth={"order_id": "1234"},
        )
        assert len(inp.completions) == 1
        assert inp.context is None

    def test_with_context(self):
        inp = VerifierInput(
            completions=["done"],
            ground_truth={},
            context={"trace_id": "abc123", "conversation_history": []},
        )
        assert inp.context["trace_id"] == "abc123"


class TestSkillArtifact:
    def test_defaults(self):
        skill = SkillArtifact(skill_id="skills/test@0.1.0")
        assert skill.promotion_stage == PromotionStage.DRAFT
        assert skill.uplift_lower_ci is None
        assert skill.triggers == []

    def test_full_artifact(self):
        skill = SkillArtifact(
            skill_id="skills/email.unsubscribe@0.2.0",
            promotion_stage=PromotionStage.CANDIDATE,
            description="Unsubscribe from mailing lists",
            triggers=["unsubscribe", "opt out"],
            exit_criteria=["vr/aiv.email.sent_folder_confirmed"],
            token_overhead_p50=200,
            latency_overhead_ms_p50=500,
        )
        assert skill.promotion_stage == PromotionStage.CANDIDATE
        assert len(skill.triggers) == 2


class TestSkillAdoptionTelemetry:
    def test_defaults(self):
        event = SkillAdoptionTelemetry(task_id="t1", skill_id="s1")
        assert event.discovery is False
        assert event.activation is False
        assert event.outcome_pass is False

    def test_serialization(self):
        event = SkillAdoptionTelemetry(
            task_id="t1",
            skill_id="s1",
            discovery=True,
            activation=True,
            compliance=0.9,
            outcome_pass=True,
            token_cost=150,
            latency_ms=300,
        )
        data = event.model_dump()
        restored = SkillAdoptionTelemetry.model_validate(data)
        assert restored.task_id == "t1"
        assert restored.outcome_pass is True
