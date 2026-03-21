"""Async HTTP client for the vr.dev hosted API.

Provides ``AsyncVerificationClient`` for progressive step-by-step
verification and standard verify/compose calls.

Requires ``httpx`` (``pip install vrdev[client]`` or ``pip install httpx``).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]


@dataclass
class StepResult:
    """Result from a single step verification."""
    results: list[dict[str, Any]]
    step_index: int
    is_terminal: bool
    trajectory_halted: bool = False
    steps_completed: int = 0


@dataclass
class VerifyResult:
    """Result from a verify or compose call."""
    results: list[dict[str, Any]]


class AsyncVerificationClient:  # pragma: no cover
    """Async client for the vr.dev verification API.

    Usage::

        async with AsyncVerificationClient(api_key="vr_...") as client:
            r = await client.verify("api.http.status_ok", ...)
            step = await client.verify_step(session_id="s1", ...)
    """

    def __init__(
        self,
        base_url: str = "https://api.vr.dev",
        api_key: str | None = None,
        agent_name: str | None = None,
        agent_framework: str | None = None,
        timeout: float = 30.0,
    ):
        if httpx is None:
            raise ImportError("httpx is required: pip install httpx")
        headers: dict[str, str] = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if agent_name:
            headers["X-Agent-Name"] = agent_name
        if agent_framework:
            headers["X-Agent-Framework"] = agent_framework
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
        )

    async def __aenter__(self) -> "AsyncVerificationClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self._client.aclose()

    async def verify(
        self,
        verifier_id: str,
        completions: list[str],
        ground_truth: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> VerifyResult:
        """Run a single verifier."""
        resp = await self._client.post("/v1/verify", json={
            "verifier_id": verifier_id,
            "completions": completions,
            "ground_truth": ground_truth,
            "context": context,
        })
        resp.raise_for_status()
        return VerifyResult(results=resp.json()["results"])

    async def compose(
        self,
        verifier_ids: list[str],
        completions: list[str],
        ground_truth: dict[str, Any],
        context: dict[str, Any] | None = None,
        require_hard: bool = True,
        policy_mode: str = "fail_closed",
        budget_limit_usd: float | None = None,
    ) -> VerifyResult:
        """Run composed verification."""
        payload: dict[str, Any] = {
            "verifier_ids": verifier_ids,
            "completions": completions,
            "ground_truth": ground_truth,
            "context": context,
            "require_hard": require_hard,
            "policy_mode": policy_mode,
        }
        if budget_limit_usd is not None:
            payload["budget_limit_usd"] = budget_limit_usd
        resp = await self._client.post("/v1/compose", json=payload)
        resp.raise_for_status()
        return VerifyResult(results=resp.json()["results"])

    async def verify_step(
        self,
        session_id: str,
        verifier_ids: list[str],
        step_index: int,
        completions: list[str],
        ground_truth: dict[str, Any],
        context: dict[str, Any] | None = None,
        is_terminal: bool = False,
        require_hard: bool = True,
        policy_mode: str = "fail_closed",
        budget_limit_usd: float | None = None,
    ) -> StepResult:
        """Submit a single step for progressive trajectory verification."""
        payload: dict[str, Any] = {
            "verifier_ids": verifier_ids,
            "step": {
                "step_index": step_index,
                "completions": completions,
                "ground_truth": ground_truth,
                "context": context,
                "is_terminal": is_terminal,
            },
            "require_hard": require_hard,
            "policy_mode": policy_mode,
        }
        if budget_limit_usd is not None:
            payload["budget_limit_usd"] = budget_limit_usd
        resp = await self._client.post(
            "/v1/verify/step",
            json=payload,
            headers={"X-Session-ID": session_id},
        )
        resp.raise_for_status()
        data = resp.json()
        return StepResult(
            results=data["results"],
            step_index=data["step_index"],
            is_terminal=data["is_terminal"],
            trajectory_halted=data.get("trajectory_halted", False),
            steps_completed=data.get("steps_completed", 0),
        )

    async def verify_trajectory(
        self,
        session_id: str,
        verifier_ids: list[str],
        steps: list[dict[str, Any]],
        require_hard: bool = True,
        policy_mode: str = "fail_closed",
    ) -> list[StepResult]:
        """Convenience: submit all steps in sequence, stopping on halt."""
        results: list[StepResult] = []
        for step in steps:
            sr = await self.verify_step(
                session_id=session_id,
                verifier_ids=verifier_ids,
                step_index=step["step_index"],
                completions=step["completions"],
                ground_truth=step.get("ground_truth", {}),
                context=step.get("context"),
                is_terminal=step.get("is_terminal", False),
                require_hard=require_hard,
                policy_mode=policy_mode,
            )
            results.append(sr)
            if sr.trajectory_halted:
                break
        return results

    async def estimate(
        self,
        verifier_ids: list[str],
        policy_mode: str = "fail_closed",
        budget_limit_usd: float | None = None,
    ) -> dict[str, Any]:
        """Preview costs without running verification."""
        params: dict[str, Any] = {
            "verifier_ids": ",".join(verifier_ids),
            "policy_mode": policy_mode,
        }
        if budget_limit_usd is not None:
            params["budget_limit_usd"] = budget_limit_usd
        resp = await self._client.get("/v1/estimate", params=params)
        resp.raise_for_status()
        return resp.json()

    async def stream_verify(
        self,
        verifier_ids: list[str],
        steps: list[dict[str, Any]],
        require_hard: bool = True,
        policy_mode: str = "fail_closed",
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream step-level verification results via SSE."""
        async with self._client.stream(
            "POST",
            "/v1/verify/stream",
            json={
                "verifier_ids": verifier_ids,
                "steps": steps,
                "require_hard": require_hard,
                "policy_mode": policy_mode,
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    if "done" in data:
                        break
                    yield data
