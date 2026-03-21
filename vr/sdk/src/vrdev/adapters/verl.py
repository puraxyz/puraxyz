"""Adapter for verl (ReasoningGym's framework) compatibility.

verl expects reward functions with signature::

    def compute_score(solution_str: str, ground_truth: dict, **kwargs) -> float

This adapter bridges vrdev's VerifierInput/VerificationResult interface
to that single-completion signature.
"""

from __future__ import annotations

from typing import Any

from ..core.base import BaseVerifier
from ..core.types import VerifierInput


class VrdevRewardWrapper:
    """Wraps a vrdev verifier into verl's reward function interface.

    Usage::

        from vrdev.adapters.verl import VrdevRewardWrapper
        reward = VrdevRewardWrapper(my_verifier)
        score = reward.compute_score("agent output", {"key": "value"})
    """

    def __init__(self, verifier: BaseVerifier):
        self.verifier = verifier

    def compute_score(
        self,
        solution_str: str,
        ground_truth: dict,
        **kwargs: Any,
    ) -> float:
        """Compute a single score for a single completion."""
        input_data = VerifierInput(
            completions=[solution_str],
            ground_truth=ground_truth,
            context=kwargs.get("context", None),
        )

        results = self.verifier.verify(input_data)
        if results:
            return results[0].score
        return 0.0

    def compute_result(
        self,
        solution_str: str,
        ground_truth: dict,
        **kwargs: Any,
    ) -> dict:
        """Compute and return the full VerificationResult as a dict."""
        input_data = VerifierInput(
            completions=[solution_str],
            ground_truth=ground_truth,
            context=kwargs.get("context", None),
        )

        results = self.verifier.verify(input_data)
        if results:
            return results[0].model_dump()
        return {}
