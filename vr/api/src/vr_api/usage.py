"""Usage tracking middleware and quota enforcement.

Phase 5: read-only tracking via ``UsageMiddleware``.
Phase 6: ``check_quota`` dependency enforces per-key daily/monthly limits
stored in the ``quota_records`` table.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response

from .auth import require_auth
from .db import get_quota, get_usage_count, record_usage


class UsageMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that records request metadata to the usage_records table."""

    async def dispatch(
        self, request: StarletteRequest, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        latency_ms = int((time.monotonic() - start) * 1000)

        # Extract resolved key UUID from request state (set by auth middleware)
        api_key_id = getattr(request.state, "api_key_id", None)
        if not api_key_id:
            # Fallback: use header value (will likely fail FK, but is caught)
            api_key_id = request.headers.get("x-api-key", "anonymous")
        endpoint = request.url.path
        method = request.method

        # Fire-and-forget - don't block the response
        try:
            await record_usage(
                api_key=api_key_id,
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                latency_ms=latency_ms,
            )
        except Exception:
            pass  # Never fail the request due to usage tracking

        return response


async def check_quota(
    request: Request,
    auth_id: str = Depends(require_auth),
) -> None:
    """FastAPI dependency - enforces per-key daily/monthly quotas and graduated tier gates.

    Graduated tiers:
    - **free**: 1000 lifetime verifications, then 403
    - **testnet**: 10 000 lifetime verifications, then 403
    - **mainnet**: unrestricted (x402 payers bypass)

    Also enforces per-key daily/monthly quotas from ``quota_records``.
    """
    # x402 payers bypass quota - they pay per-request on-chain
    if auth_id.startswith("x402:"):
        return

    # dev mode - unrestricted
    if auth_id == "dev":
        return

    # ── Graduated tier gate ──────────────────────────────────────────────
    payment_tier = getattr(request.state, "payment_tier", None)
    lifetime = getattr(request.state, "lifetime_verifications", 0)

    if payment_tier == "free" and lifetime >= 1000:
        raise HTTPException(
            status_code=403,
            detail="Free tier limit reached (1 000 verifications). Enable testnet billing on your dashboard to continue.",
        )
    elif payment_tier == "testnet" and lifetime >= 10_000:
        raise HTTPException(
            status_code=403,
            detail="Testnet tier limit reached (10 000 verifications). Upgrade to mainnet billing on your dashboard to continue.",
        )
    # mainnet and unknown tiers - no gate

    # ── Per-key daily/monthly quota ──────────────────────────────────────
    # Extract the DB key UUID from the keyid: prefix set by auth
    if auth_id.startswith("keyid:"):
        lookup_key = auth_id[6:]
    else:
        lookup_key = auth_id  # env key - lookup by raw key

    try:
        quota = await get_quota(lookup_key)
    except Exception:
        return  # DB error - don't block the request
    if quota is None:
        return  # no quota configured → unrestricted

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Daily check
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    daily_count = await get_usage_count(lookup_key, day_start)
    if daily_count >= quota.daily_limit:
        seconds_left = int((day_start + timedelta(days=1) - now).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Daily quota exceeded ({quota.daily_limit} requests/day)",
            headers={"Retry-After": str(max(1, seconds_left))},
        )

    # Monthly check
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_count = await get_usage_count(lookup_key, month_start)
    if monthly_count >= quota.monthly_limit:
        # Next month start
        if now.month == 12:
            next_month = now.replace(year=now.year + 1, month=1, day=1,
                                     hour=0, minute=0, second=0, microsecond=0)
        else:
            next_month = now.replace(month=now.month + 1, day=1,
                                     hour=0, minute=0, second=0, microsecond=0)
        seconds_left = int((next_month - now).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Monthly quota exceeded ({quota.monthly_limit} requests/month)",
            headers={"Retry-After": str(max(1, seconds_left))},
        )
