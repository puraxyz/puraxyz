"""Adapter for LangChain compatibility.

Provides two integration surfaces:

1. **VrdevVerifyTool** – a LangChain ``BaseTool`` that agents can invoke to
   verify their own actions against real system state.

2. **VrdevCallbackHandler** – a ``BaseCallbackHandler`` that automatically
   runs verification on ``on_agent_finish`` and injects the verdict into
   the run metadata.

Both accept any vrdev verifier (single or composed pipeline).

Requires ``langchain-core >= 0.2``::

    pip install vrdev[langchain]
"""

from __future__ import annotations

import json
from typing import Any, Optional

from ..core.base import BaseVerifier
from ..core.types import VerifierInput

# ---------------------------------------------------------------------------
# Lazy-check for langchain-core availability
# ---------------------------------------------------------------------------

try:
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.tools import BaseTool

    _HAS_LANGCHAIN = True
except ImportError:  # pragma: no cover
    _HAS_LANGCHAIN = False

_MISSING_MSG = (
    "langchain-core is required for the LangChain adapter.  "
    "Install it with:  pip install vrdev[langchain]"
)


def _require_langchain() -> None:
    if not _HAS_LANGCHAIN:
        raise ImportError(_MISSING_MSG)


# ═══════════════════════════════════════════════════════════════════════════
# VrdevVerifyTool
# ═══════════════════════════════════════════════════════════════════════════

class VrdevVerifyTool:
    """LangChain ``BaseTool`` that runs a vrdev verifier.

    The agent can call this tool to verify that its previous action actually
    changed system state.

    Usage::

        from vrdev import get_verifier, compose
        from vrdev.adapters.langchain import VrdevVerifyTool

        pipeline = compose([
            get_verifier("vr/tau2.retail.order_cancelled"),
            get_verifier("vr/rubric.email.tone_professional"),
        ], policy_mode="fail_closed")

        tool = VrdevVerifyTool(pipeline)

        # Add to your LangChain agent's tool list:
        agent = create_react_agent(llm, tools=[..., tool])

    The tool expects a JSON string input with ``completion`` and
    ``ground_truth`` keys.
    """

    def __new__(cls, verifier: BaseVerifier, **kwargs: Any) -> BaseTool:
        _require_langchain()
        return _make_verify_tool(verifier, **kwargs)


def _make_verify_tool(
    verifier: BaseVerifier,
    *,
    tool_name: str = "vrdev_verify",
    tool_description: str | None = None,
) -> BaseTool:
    """Build a LangChain BaseTool subclass wrapping *verifier*."""

    default_desc = (
        "Verify that an agent action actually changed system state. "
        "Input: JSON with 'completion' (str) and 'ground_truth' (dict). "
        "Returns a JSON object with verdict (PASS/FAIL), score, and evidence."
    )

    class _VerifyTool(BaseTool):
        name: str = tool_name
        description: str = tool_description or default_desc

        def _run(self, tool_input: str, **kwargs: Any) -> str:
            payload = json.loads(tool_input)
            completion = payload.get("completion", "")
            ground_truth = payload.get("ground_truth", {})
            context = payload.get("context", None)

            inp = VerifierInput(
                completions=[completion],
                ground_truth=ground_truth if isinstance(ground_truth, dict) else {},
                context=context,
            )
            results = verifier.verify(inp)
            if not results:
                return json.dumps({"verdict": "ERROR", "score": 0.0, "evidence": {}})

            r = results[0]
            return json.dumps({
                "verdict": r.verdict.value,
                "score": r.score,
                "passed": r.passed,
                "tier": r.tier.value,
                "evidence": {k: str(v) for k, v in r.evidence.items()},
                "artifact_hash": r.artifact_hash,
            })

        async def _arun(self, tool_input: str, **kwargs: Any) -> str:
            payload = json.loads(tool_input)
            completion = payload.get("completion", "")
            ground_truth = payload.get("ground_truth", {})
            context = payload.get("context", None)

            inp = VerifierInput(
                completions=[completion],
                ground_truth=ground_truth if isinstance(ground_truth, dict) else {},
                context=context,
            )
            results = await verifier.async_verify(inp)
            if not results:
                return json.dumps({"verdict": "ERROR", "score": 0.0, "evidence": {}})

            r = results[0]
            return json.dumps({
                "verdict": r.verdict.value,
                "score": r.score,
                "passed": r.passed,
                "tier": r.tier.value,
                "evidence": {k: str(v) for k, v in r.evidence.items()},
                "artifact_hash": r.artifact_hash,
            })

    return _VerifyTool()


# ═══════════════════════════════════════════════════════════════════════════
# VrdevCallbackHandler
# ═══════════════════════════════════════════════════════════════════════════

class VrdevCallbackHandler:
    """LangChain ``BaseCallbackHandler`` that auto-verifies on agent finish.

    Attaches verdicts to run metadata so they appear in LangSmith traces.

    Usage::

        from vrdev import get_verifier
        from vrdev.adapters.langchain import VrdevCallbackHandler

        verifier = get_verifier("vr/tau2.retail.order_cancelled")
        handler = VrdevCallbackHandler(
            verifier,
            ground_truth={"order_id": "ORD-42"},
        )

        agent.invoke(
            {"input": "Cancel order ORD-42"},
            config={"callbacks": [handler]},
        )

        # After the run, check handler.last_result for the verdict.
    """

    def __new__(
        cls,
        verifier: BaseVerifier,
        *,
        ground_truth: dict | None = None,
        context: dict | None = None,
    ) -> BaseCallbackHandler:
        _require_langchain()
        return _make_callback_handler(
            verifier, ground_truth=ground_truth, context=context,
        )


def _make_callback_handler(
    verifier: BaseVerifier,
    *,
    ground_truth: dict | None = None,
    context: dict | None = None,
) -> BaseCallbackHandler:
    """Build a LangChain BaseCallbackHandler wrapping *verifier*."""

    class _VrdevHandler(BaseCallbackHandler):
        name: str = "vrdev_verify"
        last_result: Optional[dict] = None

        def on_agent_finish(self, finish: Any, **kwargs: Any) -> None:
            output_text = str(getattr(finish, "return_values", {}).get("output", ""))
            gt = ground_truth or {}
            inp = VerifierInput(
                completions=[output_text],
                ground_truth=gt,
                context=context,
            )
            results = verifier.verify(inp)
            if results:
                r = results[0]
                self.last_result = {
                    "verdict": r.verdict.value,
                    "score": r.score,
                    "passed": r.passed,
                    "tier": r.tier.value,
                    "artifact_hash": r.artifact_hash,
                }

    return _VrdevHandler()
