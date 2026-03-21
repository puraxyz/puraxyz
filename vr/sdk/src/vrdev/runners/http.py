"""Sandboxed HTTP client for API-based verification.

Used by Tier A verifiers that check API state (e.g., order status, booking state).
"""

from __future__ import annotations

import asyncio

from ..core.types import Verdict

try:
    import httpx

    _HAS_HTTPX = True
except ImportError:
    _HAS_HTTPX = False


def _no_httpx_error() -> dict:
    return {
        "verdict": Verdict.ERROR,
        "status_code": None,
        "body": None,
        "headers": None,
        "error": "httpx not installed. Run: pip install vrdev[http]",
    }


def http_get(
    url: str,
    headers: dict | None = None,
    timeout: float = 15.0,
    params: dict | None = None,
) -> dict:
    """Execute a sandboxed HTTP GET request.

    Returns
    -------
    dict
        ``verdict`` (PASS if 2xx, FAIL if 4xx/5xx, ERROR on connection issue),
        ``status_code``, ``body`` (truncated to 10 KB), ``headers``, ``error``.
    """
    if not _HAS_HTTPX:
        return _no_httpx_error()

    try:
        resp = httpx.get(url, headers=headers, timeout=timeout, params=params)
        body = resp.text[:10_240]

        if 200 <= resp.status_code < 300:
            verdict = Verdict.PASS
        elif 400 <= resp.status_code < 600:
            verdict = Verdict.FAIL
        else:
            verdict = Verdict.UNVERIFIABLE

        return {
            "verdict": verdict,
            "status_code": resp.status_code,
            "body": body,
            "headers": dict(resp.headers),
            "error": None,
        }
    except httpx.TimeoutException:
        return {
            "verdict": Verdict.ERROR,
            "status_code": None,
            "body": None,
            "headers": None,
            "error": f"HTTP request timed out after {timeout}s",
        }
    except (httpx.ConnectError, httpx.RequestError) as exc:
        return {
            "verdict": Verdict.ERROR,
            "status_code": None,
            "body": None,
            "headers": None,
            "error": f"HTTP connection failed: {exc}",
        }


def http_post(
    url: str,
    json_body: dict | None = None,
    headers: dict | None = None,
    timeout: float = 15.0,
) -> dict:
    """Execute a sandboxed HTTP POST request."""
    if not _HAS_HTTPX:
        return _no_httpx_error()

    try:
        resp = httpx.post(url, json=json_body, headers=headers, timeout=timeout)
        body = resp.text[:10_240]

        if 200 <= resp.status_code < 300:
            verdict = Verdict.PASS
        elif 400 <= resp.status_code < 600:
            verdict = Verdict.FAIL
        else:
            verdict = Verdict.UNVERIFIABLE

        return {
            "verdict": verdict,
            "status_code": resp.status_code,
            "body": body,
            "headers": dict(resp.headers),
            "error": None,
        }
    except httpx.TimeoutException:
        return {
            "verdict": Verdict.ERROR,
            "status_code": None,
            "body": None,
            "headers": None,
            "error": f"HTTP request timed out after {timeout}s",
        }
    except (httpx.ConnectError, httpx.RequestError) as exc:
        return {
            "verdict": Verdict.ERROR,
            "status_code": None,
            "body": None,
            "headers": None,
            "error": f"HTTP connection failed: {exc}",
        }


# ── Async wrappers ───────────────────────────────────────────────────────────


async def async_http_get(
    url: str,
    headers: dict | None = None,
    timeout: float = 15.0,
    params: dict | None = None,
) -> dict:
    """Async version of :func:`http_get` via ``asyncio.to_thread``."""
    return await asyncio.to_thread(http_get, url, headers, timeout, params)


async def async_http_post(
    url: str,
    json_body: dict | None = None,
    headers: dict | None = None,
    timeout: float = 15.0,
) -> dict:
    """Async version of :func:`http_post` via ``asyncio.to_thread``."""
    return await asyncio.to_thread(http_post, url, json_body, headers, timeout)
