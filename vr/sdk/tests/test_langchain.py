"""Tests for vrdev.adapters.langchain – VrdevVerifyTool & VrdevCallbackHandler.

Uses stub verifiers to test the LangChain adapter surfaces
without requiring a running LangChain agent.
"""

from __future__ import annotations

import json

import pytest

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, VerificationResult, Verdict, VerifierInput

# Skip entire module if langchain-core is not installed
lc_core = pytest.importorskip("langchain_core", reason="langchain-core not installed")


from vrdev.adapters.langchain import VrdevCallbackHandler, VrdevVerifyTool  # noqa: E402


# ── Helpers ──────────────────────────────────────────────────────────────────


class AlwaysPassVerifier(BaseVerifier):
    name = "test.always_pass"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.PASS, 1.0, {"pass": 1.0}, {"db_row": "cancelled"}, input_data,
            )
            for _ in input_data.completions
        ]


class AlwaysFailVerifier(BaseVerifier):
    name = "test.always_fail"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return [
            self._make_result(
                Verdict.FAIL, 0.0, {"pass": 0.0}, {}, input_data,
            )
            for _ in input_data.completions
        ]


class EmptyVerifier(BaseVerifier):
    """Returns no results — edge case."""

    name = "test.empty"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return []


# ══════════════════════════════════════════════════════════════════════════════
# VrdevVerifyTool tests
# ══════════════════════════════════════════════════════════════════════════════


class TestVrdevVerifyTool:
    def test_tool_returns_pass(self):
        tool = VrdevVerifyTool(AlwaysPassVerifier())
        result_str = tool.invoke(json.dumps({
            "completion": "Order cancelled",
            "ground_truth": {"order_id": "ORD-42"},
        }))
        result = json.loads(result_str)
        assert result["verdict"] == "PASS"
        assert result["score"] == 1.0
        assert result["passed"] is True

    def test_tool_returns_fail(self):
        tool = VrdevVerifyTool(AlwaysFailVerifier())
        result_str = tool.invoke(json.dumps({
            "completion": "Order cancelled",
            "ground_truth": {"order_id": "ORD-42"},
        }))
        result = json.loads(result_str)
        assert result["verdict"] == "FAIL"
        assert result["score"] == 0.0
        assert result["passed"] is False

    def test_tool_empty_verifier(self):
        tool = VrdevVerifyTool(EmptyVerifier())
        result_str = tool.invoke(json.dumps({
            "completion": "anything",
            "ground_truth": {},
        }))
        result = json.loads(result_str)
        assert result["verdict"] == "ERROR"
        assert result["score"] == 0.0

    def test_tool_has_name_and_description(self):
        tool = VrdevVerifyTool(AlwaysPassVerifier())
        assert tool.name == "vrdev_verify"
        assert "verify" in tool.description.lower()

    def test_tool_custom_name(self):
        tool = VrdevVerifyTool(
            AlwaysPassVerifier(),
            tool_name="my_verifier",
            tool_description="Custom description",
        )
        assert tool.name == "my_verifier"
        assert tool.description == "Custom description"

    def test_tool_output_includes_evidence(self):
        tool = VrdevVerifyTool(AlwaysPassVerifier())
        result_str = tool.invoke(json.dumps({
            "completion": "done",
            "ground_truth": {},
        }))
        result = json.loads(result_str)
        assert "evidence" in result
        assert "artifact_hash" in result
        assert "tier" in result

    def test_tool_is_langchain_base_tool(self):
        from langchain_core.tools import BaseTool
        tool = VrdevVerifyTool(AlwaysPassVerifier())
        assert isinstance(tool, BaseTool)


# ══════════════════════════════════════════════════════════════════════════════
# VrdevCallbackHandler tests
# ══════════════════════════════════════════════════════════════════════════════


class _FakeAgentFinish:
    """Minimal mock of LangChain's AgentFinish."""

    def __init__(self, output: str):
        self.return_values = {"output": output}


class TestVrdevCallbackHandler:
    def test_on_agent_finish_stores_result(self):
        handler = VrdevCallbackHandler(
            AlwaysPassVerifier(),
            ground_truth={"order_id": "ORD-42"},
        )
        handler.on_agent_finish(_FakeAgentFinish("Order cancelled"))
        assert handler.last_result is not None
        assert handler.last_result["verdict"] == "PASS"
        assert handler.last_result["score"] == 1.0
        assert handler.last_result["passed"] is True

    def test_on_agent_finish_fail(self):
        handler = VrdevCallbackHandler(
            AlwaysFailVerifier(),
            ground_truth={"order_id": "ORD-42"},
        )
        handler.on_agent_finish(_FakeAgentFinish("Order cancelled"))
        assert handler.last_result is not None
        assert handler.last_result["verdict"] == "FAIL"
        assert handler.last_result["passed"] is False

    def test_handler_no_ground_truth(self):
        handler = VrdevCallbackHandler(AlwaysPassVerifier())
        handler.on_agent_finish(_FakeAgentFinish("done"))
        assert handler.last_result["verdict"] == "PASS"

    def test_handler_with_context(self):
        handler = VrdevCallbackHandler(
            AlwaysPassVerifier(),
            ground_truth={"order_id": "ORD-42"},
            context={"session": "abc"},
        )
        handler.on_agent_finish(_FakeAgentFinish("done"))
        assert handler.last_result["verdict"] == "PASS"

    def test_handler_is_base_callback_handler(self):
        from langchain_core.callbacks import BaseCallbackHandler
        handler = VrdevCallbackHandler(AlwaysPassVerifier())
        assert isinstance(handler, BaseCallbackHandler)

    def test_handler_result_structure(self):
        handler = VrdevCallbackHandler(AlwaysPassVerifier())
        handler.on_agent_finish(_FakeAgentFinish("done"))
        r = handler.last_result
        assert "verdict" in r
        assert "score" in r
        assert "passed" in r
        assert "tier" in r
        assert "artifact_hash" in r
