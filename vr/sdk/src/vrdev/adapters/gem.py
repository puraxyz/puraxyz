"""Adapter for Google's GEM (Generalized Evaluation Model) compatibility.

GEM expects reward functions with signature::

    def compute_reward(response: str, reference: dict, **kwargs) -> dict

returning ``{"score": float, "metadata": dict}``.

This adapter bridges vrdev's VerifierInput/VerificationResult interface
to that signature.
"""

from __future__ import annotations

from typing import Any

from ..core.base import BaseVerifier
from ..core.types import VerifierInput


class GEMRewardWrapper:
    """Wraps a vrdev verifier into GEM's reward function interface.

    Usage::

        from vrdev.adapters.gem import GEMRewardWrapper
        reward = GEMRewardWrapper(my_verifier)
        result = reward.compute_reward("agent output", {"key": "value"})
        # result = {"score": 0.85, "metadata": {...}}
    """

    def __init__(self, verifier: BaseVerifier):
        self.verifier = verifier

    def compute_reward(
        self,
        response: str,
        reference: dict,
        **kwargs: Any,
    ) -> dict:
        """Compute a reward dict for a single response.

        Returns
        -------
        dict
            ``{"score": float, "metadata": dict}`` where metadata contains
            verdict, tier, breakdown, and evidence fields.
        """
        input_data = VerifierInput(
            completions=[response],
            ground_truth=reference,
            context=kwargs.get("context", None),
        )

        results = self.verifier.verify(input_data)
        if not results:
            return {"score": 0.0, "metadata": {}}

        r = results[0]
        return {
            "score": r.score,
            "metadata": {
                "verdict": r.verdict.value,
                "tier": r.tier.value,
                "breakdown": r.breakdown,
                "evidence": r.evidence,
                "artifact_hash": r.artifact_hash,
                "passed": r.passed,
            },
        }

    def compute_batch_rewards(
        self,
        responses: list[str],
        reference: dict,
        **kwargs: Any,
    ) -> list[dict]:
        """Compute rewards for a batch of responses.

        Passes all responses as completions in a single verify call
        for efficiency (one verifier invocation).
        """
        input_data = VerifierInput(
            completions=responses,
            ground_truth=reference,
            context=kwargs.get("context", None),
        )

        results = self.verifier.verify(input_data)
        return [
            {
                "score": r.score,
                "metadata": {
                    "verdict": r.verdict.value,
                    "tier": r.tier.value,
                    "breakdown": r.breakdown,
                    "evidence": r.evidence,
                    "artifact_hash": r.artifact_hash,
                    "passed": r.passed,
                },
            }
            for r in results
        ]
