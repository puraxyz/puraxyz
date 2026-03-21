"""Adapter for OpenClaw agent skill integration.

Provides:
- ``explain_failure``  - turn a failed result into retry instructions
- ``run_verifier``     - run a single verifier by registry ID
- ``compose_chain``    - build a composed verifier chain and run it
- ``verify_task``      - run all relevant verifiers for a task description
"""

from __future__ import annotations

from typing import Any

from ..core.compose import compose
from ..core.registry import get_verifier, list_verifiers
from ..core.types import (
    PolicyMode,
    VerificationResult,
    Verdict,
    VerifierInput,
)


# ── High-level skill functions ───────────────────────────────────────────────


def run_verifier(
    verifier_id: str,
    input_data: VerifierInput,
    **verifier_kwargs: Any,
) -> list[VerificationResult]:
    """Run a single verifier by its registry ID.

    Parameters
    ----------
    verifier_id : str
        e.g. ``"vr/tau2.retail.order_cancelled"``
    input_data : VerifierInput
        Agent completions + ground truth + context.
    **verifier_kwargs
        Additional kwargs passed to the verifier constructor.

    Returns
    -------
    list[VerificationResult]
        One result per completion.
    """
    v = get_verifier(verifier_id, **verifier_kwargs)
    return v.verify(input_data)


def compose_chain(
    verifier_ids: list[str],
    input_data: VerifierInput,
    require_hard: bool = True,
    policy_mode: PolicyMode = PolicyMode.FAIL_CLOSED,
    **verifier_kwargs: Any,
) -> list[VerificationResult]:
    """Build a composed verifier chain from registry IDs and run it.

    Parameters
    ----------
    verifier_ids : list[str]
        Ordered list of verifier registry IDs.
    input_data : VerifierInput
        Agent completions + ground truth + context.
    require_hard : bool
        If True, HARD/AGENTIC verifiers gate SOFT results.
    policy_mode : PolicyMode
        How ERROR/UNVERIFIABLE propagate.
    **verifier_kwargs
        Additional kwargs passed to each verifier constructor.

    Returns
    -------
    list[VerificationResult]
        Composed results, one per completion.
    """
    verifiers = [get_verifier(vid, **verifier_kwargs) for vid in verifier_ids]
    composed = compose(
        verifiers,
        require_hard=require_hard,
        policy_mode=policy_mode,
    )
    return composed.verify(input_data)


def verify_task(
    input_data: VerifierInput,
    verifier_ids: list[str] | None = None,
    **verifier_kwargs: Any,
) -> dict[str, list[VerificationResult]]:
    """Run multiple verifiers and return results keyed by verifier ID.

    Parameters
    ----------
    input_data : VerifierInput
        Agent completions + ground truth + context.
    verifier_ids : list[str] | None
        If None, runs all registered verifiers.
    **verifier_kwargs
        Additional kwargs passed to each verifier constructor.

    Returns
    -------
    dict[str, list[VerificationResult]]
        Results keyed by verifier ID.
    """
    ids = verifier_ids or list_verifiers()
    results: dict[str, list[VerificationResult]] = {}
    for vid in ids:
        try:
            v = get_verifier(vid, **verifier_kwargs)
            results[vid] = v.verify(input_data)
        except Exception as exc:
            results[vid] = [
                VerificationResult(
                    verdict=Verdict.ERROR,
                    score=0.0,
                    tier=v.tier if "v" in dir() else "HARD",
                    evidence={"error": str(exc)},
                    provenance={
                        "verifier_pkg": vid,
                        "source_citation": "",
                    },
                )
            ]
    return results


# ── Explain / self-correction ────────────────────────────────────────────────


def explain_failure(result: VerificationResult) -> dict:
    """Given a VerificationResult, produce a structured explanation.

    This is the function that makes verification immediately useful for
    non-RL users: it turns a failure evidence object into actionable
    self-correction instructions that OpenClaw can use to retry the task.

    Returns
    -------
    dict
        Keys: ``likely_cause``, ``suggested_action``, ``relevant_context``,
        ``message``.
    """
    if result.verdict == Verdict.PASS:
        return {
            "likely_cause": None,
            "suggested_action": None,
            "relevant_context": {},
            "message": "Verification passed. No explanation needed.",
        }

    if result.verdict == Verdict.ERROR:
        return {
            "likely_cause": "Infrastructure or configuration error",
            "suggested_action": (
                "Check verifier configuration: credentials, network access, "
                "and permissions. This is not an agent failure."
            ),
            "relevant_context": {
                "permissions_used": result.metadata.permissions_used,
                "evidence": result.evidence,
            },
            "message": f"Verifier encountered an error: {result.evidence}",
        }

    if result.verdict == Verdict.UNVERIFIABLE:
        return {
            "likely_cause": "Ambiguous system state - could not confirm or deny",
            "suggested_action": (
                "Retry the task and verification. If this persists, "
                "the environment may not support the required verification method."
            ),
            "relevant_context": {"evidence": result.evidence},
            "message": "Verification was inconclusive.",
        }

    # verdict == FAIL
    failed_components = {
        k: v for k, v in result.breakdown.items() if v < 0.5
    }

    return {
        "likely_cause": (
            f"Task verification failed. Failed components: "
            f"{list(failed_components.keys()) or ['overall score too low']}"
        ),
        "suggested_action": _suggest_correction(result),
        "relevant_context": {
            "score": result.score,
            "breakdown": result.breakdown,
            "evidence": result.evidence,
            "hard_gate_failed": result.metadata.hard_gate_failed,
        },
        "message": (
            f"Verification FAILED (score: {result.score:.2f}). "
            + (
                "Hard gate triggered - a required check failed."
                if result.metadata.hard_gate_failed
                else ""
            )
        ),
    }


def _suggest_correction(result: VerificationResult) -> str:
    """Generate a correction suggestion from the evidence."""
    suggestions: list[str] = []

    if result.metadata.hard_gate_failed:
        suggestions.append(
            "A hard verification gate failed. The core action may not have "
            "completed. Re-attempt the primary task before retrying."
        )

    for component, score in result.breakdown.items():
        if score < 0.5:
            suggestions.append(
                f"Component '{component}' scored {score:.2f} - needs improvement."
            )

    return " ".join(suggestions) if suggestions else "Re-attempt the task."
