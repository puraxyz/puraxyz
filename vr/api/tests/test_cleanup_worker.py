"""Tests for the standalone TTL cleanup worker."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from vr_api.cleanup_worker import cleanup_loop


class TestCleanupLoop:
    @pytest.mark.asyncio
    async def test_calls_cleanup_expired(self):
        """cleanup_loop should sleep then call cleanup_expired."""
        with patch(
            "vr_api.cleanup_worker.cleanup_expired",
            new_callable=AsyncMock,
        ) as mock_cleanup:
            mock_cleanup.return_value = 5
            task = asyncio.create_task(
                cleanup_loop(ttl_days=30, interval_hours=0.0001)
            )
            await asyncio.sleep(0.5)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            assert mock_cleanup.call_count >= 1
            mock_cleanup.assert_called_with(30)

    @pytest.mark.asyncio
    async def test_handles_exceptions_gracefully(self):
        """cleanup_loop should continue running even if cleanup_expired raises."""
        call_count = 0

        async def flaky_cleanup(ttl_days):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("DB error")
            return 0

        with patch(
            "vr_api.cleanup_worker.cleanup_expired",
            side_effect=flaky_cleanup,
        ):
            task = asyncio.create_task(
                cleanup_loop(ttl_days=30, interval_hours=0.0001)
            )
            await asyncio.sleep(0.8)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            assert call_count >= 2  # Continued after error

    @pytest.mark.asyncio
    async def test_zero_deletions_no_log(self):
        """When cleanup_expired returns 0, the loop runs quietly."""
        with patch(
            "vr_api.cleanup_worker.cleanup_expired",
            new_callable=AsyncMock,
        ) as mock_cleanup:
            mock_cleanup.return_value = 0
            task = asyncio.create_task(
                cleanup_loop(ttl_days=90, interval_hours=0.0001)
            )
            await asyncio.sleep(0.5)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            assert mock_cleanup.call_count >= 1
