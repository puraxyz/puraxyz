"""Adapter for LangGraph compatibility.

Provides a ready-made graph node that runs vrdev verification as a step
in a LangGraph ``StateGraph``.

Usage::

    from langgraph.graph import StateGraph
    from vrdev import get_verifier, compose
    from vrdev.adapters.langgraph import verify_node

    pipeline = compose([
        get_verifier("vr/tau2.retail.order_cancelled"),
        get_verifier("vr/rubric.email.tone_professional"),
    ], policy_mode="fail_closed")

    node = verify_node(pipeline, completion_key="output", ground_truth_key="expected")

    graph = StateGraph(dict)
    graph.add_node("act", act_fn)
    graph.add_node("verify", node)
    graph.add_edge("act", "verify")

The node reads ``completion_key`` and ``ground_truth_key`` from graph state,
runs the verifier, and writes the results back under ``"verification"``.

Requires ``langchain-core >= 0.2`` (LangGraph depends on it)::

    pip install vrdev[langchain]
"""

from __future__ import annotations

from typing import Any, Callable

from ..core.base import BaseVerifier
from ..core.types import VerifierInput


def verify_node(
    verifier: BaseVerifier,
    *,
    completion_key: str = "output",
    ground_truth_key: str = "ground_truth",
    context_key: str | None = None,
    result_key: str = "verification",
) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Create a LangGraph-compatible node function that runs verification.

    Parameters
    ----------
    verifier : BaseVerifier
        Any vrdev verifier or composed pipeline.
    completion_key : str
        State key containing the agent's completion text.
    ground_truth_key : str
        State key containing the ground truth dict.
    context_key : str | None
        Optional state key for additional context.
    result_key : str
        State key where the verification result will be written.

    Returns
    -------
    Callable
        A function ``(state: dict) -> dict`` suitable for
        ``StateGraph.add_node()``.

    Usage::

        from vrdev.adapters.langgraph import verify_node
        node = verify_node(my_pipeline)
        graph.add_node("verify", node)
    """

    def _node(state: dict[str, Any]) -> dict[str, Any]:
        completion = str(state.get(completion_key, ""))
        ground_truth = state.get(ground_truth_key, {})
        context = state.get(context_key) if context_key else None

        inp = VerifierInput(
            completions=[completion],
            ground_truth=ground_truth if isinstance(ground_truth, dict) else {},
            context=context if isinstance(context, dict) else None,
        )
        results = verifier.verify(inp)
        if not results:
            return {
                result_key: {
                    "verdict": "ERROR",
                    "score": 0.0,
                    "passed": False,
                    "evidence": {},
                },
            }

        r = results[0]
        return {
            result_key: {
                "verdict": r.verdict.value,
                "score": r.score,
                "passed": r.passed,
                "tier": r.tier.value,
                "breakdown": r.breakdown,
                "evidence": r.evidence,
                "artifact_hash": r.artifact_hash,
            },
        }

    async def _anode(state: dict[str, Any]) -> dict[str, Any]:
        completion = str(state.get(completion_key, ""))
        ground_truth = state.get(ground_truth_key, {})
        context = state.get(context_key) if context_key else None

        inp = VerifierInput(
            completions=[completion],
            ground_truth=ground_truth if isinstance(ground_truth, dict) else {},
            context=context if isinstance(context, dict) else None,
        )
        results = await verifier.async_verify(inp)
        if not results:
            return {
                result_key: {
                    "verdict": "ERROR",
                    "score": 0.0,
                    "passed": False,
                    "evidence": {},
                },
            }

        r = results[0]
        return {
            result_key: {
                "verdict": r.verdict.value,
                "score": r.score,
                "passed": r.passed,
                "tier": r.tier.value,
                "breakdown": r.breakdown,
                "evidence": r.evidence,
                "artifact_hash": r.artifact_hash,
            },
        }

    # Attach async variant so callers can choose
    _node.afunc = _anode  # type: ignore[attr-defined]
    return _node


async def averify_node(
    verifier: BaseVerifier,
    *,
    completion_key: str = "output",
    ground_truth_key: str = "ground_truth",
    context_key: str | None = None,
    result_key: str = "verification",
) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Async variant of :func:`verify_node`.

    Returns an async ``(state: dict) -> dict`` function for use in
    async LangGraph workflows.
    """
    node = verify_node(
        verifier,
        completion_key=completion_key,
        ground_truth_key=ground_truth_key,
        context_key=context_key,
        result_key=result_key,
    )
    return node.afunc  # type: ignore[attr-defined]
