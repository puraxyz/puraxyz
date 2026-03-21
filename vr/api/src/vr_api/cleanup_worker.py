"""Standalone evidence TTL cleanup worker.

Run as a separate process for production deployments::

    python -m vr_api.cleanup_worker

Falls back to in-process cleanup when started as a background task inside
the API lifespan (see ``app.py``).
"""

from __future__ import annotations

import asyncio
import logging
import os

from .db import cleanup_expired, close_db, init_db

logger = logging.getLogger(__name__)


async def cleanup_loop(
    ttl_days: int = 90,
    interval_hours: float = 6.0,
) -> None:
    """Run evidence TTL cleanup on a fixed interval.

    Designed to run as an ``asyncio.Task`` inside the API lifespan **or** as
    the main coroutine of a standalone worker process.
    """
    logger.info(
        "TTL cleanup started (ttl_days=%d, interval=%.1fh)",
        ttl_days,
        interval_hours,
    )
    while True:
        await asyncio.sleep(interval_hours * 3600)
        try:
            deleted = await cleanup_expired(ttl_days)
            if deleted:
                logger.info("TTL cleanup: deleted %d expired records", deleted)
        except Exception:
            logger.exception("TTL cleanup failed")


async def main() -> None:  # pragma: no cover
    """Entry point for standalone worker process."""
    ttl_days = int(os.environ.get("VR_EVIDENCE_TTL_DAYS", "90"))
    interval_hours = float(os.environ.get("VR_CLEANUP_INTERVAL_HOURS", "6"))

    await init_db()
    try:
        await cleanup_loop(ttl_days=ttl_days, interval_hours=interval_hours)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
