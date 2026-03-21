"""Adapter for Hugging Face trl GRPOTrainer compatibility.

trl's GRPOTrainer expects reward functions with signature::

    def reward_func(completions: list[str], **kwargs) -> list[float]

This adapter bridges vrdev's VerifierInput/VerificationResult interface
to that signature, enabling any vr.dev verifier as a zero-friction drop-in.
"""

from __future__ import annotations

from typing import Any, Callable

from ..core.base import BaseVerifier
from ..core.types import VerifierInput


def to_trl_reward_func(
    verifier: BaseVerifier,
) -> Callable[..., list[float]]:
    """Wrap a vrdev verifier as a trl-compatible reward function.

    Usage::

        from vrdev.adapters.trl import to_trl_reward_func
        reward_fn = to_trl_reward_func(my_verifier)

        trainer = GRPOTrainer(
            model=model,
            reward_funcs=[reward_fn],
            ...
        )
    """

    def reward_func(completions: list[str], **kwargs: Any) -> list[float]:
        ground_truth = kwargs.get("ground_truth", {})
        context = kwargs.get("context", None)

        input_data = VerifierInput(
            completions=completions,
            ground_truth=ground_truth if isinstance(ground_truth, dict) else {},
            context=context,
        )

        results = verifier.verify(input_data)
        return [r.score for r in results]

    return reward_func
