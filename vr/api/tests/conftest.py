"""Shared fixtures for vr-api tests."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Make vr_api importable from src/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from vr_api import rate_limit  # noqa: E402
from vr_api.app import app  # noqa: E402
from vr_api.db import close_db, init_db  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Reset the global rate limiter between every test."""
    rate_limit.reset_bucket()
    yield
    rate_limit.reset_bucket()


@pytest.fixture(autouse=True)
def _reset_db():
    """Initialise a fresh in-memory SQLite DB for every test."""
    asyncio.get_event_loop_policy().get_event_loop
    loop = asyncio.new_event_loop()
    loop.run_until_complete(init_db("sqlite+aiosqlite:///:memory:"))
    yield
    loop.run_until_complete(close_db())
    loop.close()


@pytest.fixture
def client(monkeypatch):
    """TestClient with auth **disabled** (no VR_API_KEYS)."""
    monkeypatch.delenv("VR_API_KEYS", raising=False)
    return TestClient(app)


@pytest.fixture
def authed_client(monkeypatch):
    """TestClient with auth **enabled** (two valid keys)."""
    monkeypatch.setenv("VR_API_KEYS", "test-key-1,test-key-2")
    return TestClient(app)
