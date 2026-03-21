"""Messaging verifiers: Slack message sent and reaction added checks.

All are HARD-tier deterministic verifiers that query Slack API state.
They accept either a live API token or a ``pre_result`` dict for testing.
"""

from __future__ import annotations

import os
import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _slack_api(method: str, params: dict, token: str | None = None) -> dict:  # pragma: no cover
    """Call a Slack Web API method."""
    import httpx
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = httpx.get(
        f"https://slack.com/api/{method}",
        params=params,
        headers=headers,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Slack API error: {data.get('error', 'unknown')}")
    return data


class SlackMessageSentVerifier(BaseVerifier):
    """Verifies that a message containing expected text exists in a Slack channel.

    Ground truth schema::

        {
            "channel_id": str,
            "text_contains": str,
            "after_ts": str | null,      # only consider messages after this timestamp
            "pre_result": dict | null    # { "found": bool, "message_ts": str }
        }
    """

    name = "messaging.slack.message_sent"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        channel_id = gt.get("channel_id", "")
        text_contains = gt.get("text_contains", "")
        after_ts = gt.get("after_ts")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"channel_id": channel_id, "text_contains": text_contains}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            found = pre_result.get("found", False)
        elif channel_id and text_contains:
            token = os.environ.get("SLACK_BOT_TOKEN")
            if not token:
                evidence["error"] = "SLACK_BOT_TOKEN not set"
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:slack"])
            try:
                params: dict[str, Any] = {"channel": channel_id, "limit": 100}
                if after_ts:
                    params["oldest"] = after_ts
                data = _slack_api("conversations.history", params, token)
                messages = data.get("messages", [])
                found = any(text_contains in (m.get("text", "") or "") for m in messages)
                evidence["messages_checked"] = len(messages)
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:slack"], retryable=True)
        else:
            evidence["error"] = "no channel_id/text_contains or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:slack"])

        evidence["found"] = found
        breakdown["message_found"] = 1.0 if found else 0.0
        score = breakdown["message_found"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            hints.append(f"No message containing '{text_contains[:80]}' found in channel")
            hints.append("Check channel ID and message content")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:slack"], repair_hints=hints)


class SlackReactionAddedVerifier(BaseVerifier):
    """Verifies that a reaction was added to a specific Slack message.

    Ground truth schema::

        {
            "channel_id": str,
            "message_ts": str,
            "reaction_name": str,        # e.g. "thumbsup"
            "pre_result": dict | null    # { "has_reaction": bool }
        }
    """

    name = "messaging.slack.reaction_added"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        channel_id = gt.get("channel_id", "")
        message_ts = gt.get("message_ts", "")
        reaction_name = gt.get("reaction_name", "")
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {
            "channel_id": channel_id, "message_ts": message_ts, "reaction_name": reaction_name,
        }
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            has_reaction = pre_result.get("has_reaction", False)
        elif channel_id and message_ts and reaction_name:
            token = os.environ.get("SLACK_BOT_TOKEN")
            if not token:
                evidence["error"] = "SLACK_BOT_TOKEN not set"
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:slack"])
            try:
                data = _slack_api("reactions.get", {
                    "channel": channel_id, "timestamp": message_ts,
                }, token)
                msg = data.get("message", {})
                reactions = msg.get("reactions", [])
                has_reaction = any(r.get("name") == reaction_name for r in reactions)
                evidence["reactions_found"] = [r.get("name") for r in reactions]
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                         permissions=["api:slack"], retryable=True)
        else:
            evidence["error"] = "no channel_id/message_ts/reaction_name or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                                     permissions=["api:slack"])

        evidence["has_reaction"] = has_reaction
        breakdown["reaction_present"] = 1.0 if has_reaction else 0.0
        score = breakdown["reaction_present"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL

        hints: list[str] = []
        if verdict == Verdict.FAIL:
            hints.append(f"Reaction ':{reaction_name}:' not found on message")
            hints.append("Add the reaction and verify the message timestamp is correct")

        return self._make_result(verdict, score, breakdown, evidence, input_data,
                                 permissions=["api:slack"], repair_hints=hints)
