"""Tests for vrdev.adapters.langgraph – verify_node.

Uses stub verifiers to test the LangGraph node adapter
without requiring a running LangGraph workflow.
"""

from __future__ import annotations

import asyncio

import pytest

from vrdev.adapters.langgraph import verify_node
from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, VerificationResult, Verdict, VerifierInput


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
    name = "test.empty"
    tier = Tier.HARD
    version = "0.0.1"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        return []


# ══════════════════════════════════════════════════════════════════════════════
# Sync node tests
# ══════════════════════════════════════════════════════════════════════════════


class TestVerifyNode:
    def test_pass_result(self):
        node = verify_node(AlwaysPassVerifier())
        state = {"output": "Order cancelled", "ground_truth": {"order_id": "ORD-42"}}
        result = node(state)
        assert "verification" in result
        v = result["verification"]
        assert v["verdict"] == "PASS"
        assert v["score"] == 1.0
        assert v["passed"] is True

    def test_fail_result(self):
        node = verify_node(AlwaysFailVerifier())
        state = {"output": "Order cancelled", "ground_truth": {"order_id": "ORD-42"}}
        result = node(state)
        v = result["verification"]
        assert v["verdict"] == "FAIL"
        assert v["score"] == 0.0
        assert v["passed"] is False

    def test_empty_verifier(self):
        node = verify_node(EmptyVerifier())
        state = {"output": "anything", "ground_truth": {}}
        result = node(state)
        v = result["verification"]
        assert v["verdict"] == "ERROR"
        assert v["score"] == 0.0
        assert v["passed"] is False

    def test_custom_keys(self):
        node = verify_node(
            AlwaysPassVerifier(),
            completion_key="agent_output",
            ground_truth_key="expected",
            result_key="vr_result",
        )
        state = {"agent_output": "done", "expected": {"k": "v"}}
        result = node(state)
        assert "vr_result" in result
        assert result["vr_result"]["verdict"] == "PASS"

    def test_missing_keys_defaults(self):
        node = verify_node(AlwaysPassVerifier())
        state = {}  # no output, no ground_truth
        result = node(state)
        assert result["verification"]["verdict"] == "PASS"

    def test_result_structure(self):
        node = verify_node(AlwaysPassVerifier())
        state = {"output": "done", "ground_truth": {}}
        result = node(state)
        v = result["verification"]
        assert "verdict" in v
        assert "score" in v
        assert "passed" in v
        assert "tier" in v
        assert "breakdown" in v
        assert "evidence" in v
        assert "artifact_hash" in v

    def test_context_key(self):
        node = verify_node(
            AlwaysPassVerifier(),
            context_key="ctx",
        )
        state = {"output": "done", "ground_truth": {}, "ctx": {"session": "abc"}}
        result = node(state)
        assert result["verification"]["verdict"] == "PASS"


# ══════════════════════════════════════════════════════════════════════════════
# Async node tests
# ══════════════════════════════════════════════════════════════════════════════


class TestVerifyNodeAsync:
    def test_async_pass(self):
        node = verify_node(AlwaysPassVerifier())
        state = {"output": "Order cancelled", "ground_truth": {"order_id": "ORD-42"}}
        result = asyncio.get_event_loop().run_until_complete(node.afunc(state))
        assert result["verification"]["verdict"] == "PASS"
        assert result["verification"]["score"] == 1.0

    def test_async_fail(self):
        node = verify_node(AlwaysFailVerifier())
        state = {"output": "Order cancelled", "ground_truth": {"order_id": "ORD-42"}}
        result = asyncio.get_event_loop().run_until_complete(node.afunc(state))
        assert result["verification"]["verdict"] == "FAIL"

    def test_async_empty(self):
        node = verify_node(EmptyVerifier())
        state = {"output": "anything", "ground_truth": {}}
        result = asyncio.get_event_loop().run_until_complete(node.afunc(state))
        assert result["verification"]["verdict"] == "ERROR"
