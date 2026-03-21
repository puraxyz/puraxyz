"""Abstract base class for all vr.dev verifiers."""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import Any

from .types import (
    AttackResistance,
    Provenance,
    ResultMetadata,
    StepInput,
    Tier,
    VerificationResult,
    Verdict,
    VerifierInput,
)


class BaseVerifier(ABC):
    """Abstract base class for all vr.dev verifiers.

    Every verifier must implement the ``verify`` method which takes a
    ``VerifierInput`` and returns one ``VerificationResult`` per completion.
    """

    name: str
    tier: Tier
    version: str = "0.1.0"

    @abstractmethod
    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        """Verify agent completions against ground truth.

        Parameters
        ----------
        input_data : VerifierInput
            The agent completions, ground truth, and optional context.

        Returns
        -------
        list[VerificationResult]
            One result per completion in ``input_data.completions``.
        """
        ...

    async def async_verify(
        self, input_data: VerifierInput
    ) -> list[VerificationResult]:
        """Async wrapper around :meth:`verify` via ``asyncio.to_thread``.

        Allows any synchronous verifier to run in an async context without
        blocking the event loop.
        """
        return await asyncio.to_thread(self.verify, input_data)

    @property
    def pkg_id(self) -> str:
        """Canonical package identifier (e.g., ``email.sent@0.1.0``)."""
        return f"{self.name}@{self.version}"

    def _make_result(
        self,
        verdict: Verdict,
        score: float,
        breakdown: dict[str, float],
        evidence: dict[str, Any],
        input_data: VerifierInput,
        *,
        permissions: list[str] | None = None,
        attack_resistance: AttackResistance | None = None,
        source_benchmark: str | None = None,
        source_citation: str = "",
        repair_hints: list[str] | None = None,
        retryable: bool = False,
        suggested_action: str | None = None,
    ) -> VerificationResult:
        """Create a VerificationResult with standard provenance and hashes.

        HARD and AGENTIC verifiers default to ``injection_check='passed'``
        because they verify actual system state rather than LLM output.
        """
        # Default attack resistance based on tier
        if attack_resistance is None:
            if self.tier in (Tier.HARD, Tier.AGENTIC):
                attack_resistance = AttackResistance(
                    injection_check="passed",
                    format_gaming_check="passed",
                )
            else:
                attack_resistance = AttackResistance()

        result = VerificationResult(
            verdict=verdict,
            score=round(score, 4),
            tier=self.tier,
            breakdown=breakdown,
            evidence=evidence,
            provenance=Provenance(
                verifier_pkg=self.pkg_id,
                source_benchmark=source_benchmark,
                source_citation=source_citation,
            ),
            attack_resistance=attack_resistance or AttackResistance(),
            metadata=ResultMetadata(
                permissions_used=permissions or [],
            ),
            repair_hints=repair_hints or [],
            retryable=retryable,
            suggested_action=suggested_action,
        )
        result.compute_hashes(input_data.model_dump())
        return result

    def verify_step(self, step: StepInput) -> list[VerificationResult]:
        """Verify a single step in a trajectory.

        Wraps ``StepInput`` into ``VerifierInput``, delegates to
        :meth:`verify`, and stamps ``step_index`` / ``is_terminal`` on
        each result.
        """
        inp = VerifierInput(
            completions=step.completions,
            ground_truth=step.ground_truth,
            context={**(step.context or {}), "step_index": step.step_index},
        )
        results = self.verify(inp)
        for r in results:
            r.step_index = step.step_index
            r.is_terminal = step.is_terminal
        return results
