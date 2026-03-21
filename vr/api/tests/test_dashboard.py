"""Tests for dashboard analytics - agent header parsing and profile upsert."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


from vr_api.app import _record_verification


def _make_request(headers: dict | None = None, user_id: int = 1, api_key_id: str = "k1"):
    """Build a fake Request with state and headers."""
    req = MagicMock()
    req.state.user_id = user_id
    req.state.api_key_id = api_key_id
    req.headers = headers or {}
    return req


def _make_body(verifier_id: str = "api.http.status_ok"):
    body = MagicMock()
    body.verifier_id = verifier_id
    return body


def _make_result(verdict: str = "PASS", score: float = 1.0, tier: str = "HARD"):
    r = MagicMock()
    r.verdict = verdict
    r.score = score
    r.tier = tier
    r.artifact_hash = "sha256:abc123"
    result = MagicMock()
    result.results = [r]
    return result


class TestAgentHeaderParsing:
    """Verify that X-Agent-* headers are forwarded to the verification log INSERT."""

    def test_agent_headers_included_in_sql(self):
        """When agent headers are sent, they appear in the SQL params."""
        captured_params = {}

        async def _mock_execute(stmt, params=None):
            # Capture the INSERT INTO verification_logs params
            sql = str(stmt.text) if hasattr(stmt, "text") else str(stmt)
            if "verification_logs" in sql:
                captured_params.update(params or {})

        mock_session = AsyncMock()
        mock_session.execute = _mock_execute
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_factory = MagicMock(return_value=mock_session)

        req = _make_request(headers={
            "x-agent-name": "my-agent",
            "x-agent-framework": "langchain",
            "x-session-id": "sess-42",
        })

        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(), 42)
            )

        assert captured_params.get("agent_name") == "my-agent"
        assert captured_params.get("agent_framework") == "langchain"
        assert captured_params.get("session_id") == "sess-42"

    def test_no_agent_headers_gives_none(self):
        """When no agent headers are sent, params are None."""
        captured_params = {}

        async def _mock_execute(stmt, params=None):
            sql = str(stmt.text) if hasattr(stmt, "text") else str(stmt)
            if "verification_logs" in sql:
                captured_params.update(params or {})

        mock_session = AsyncMock()
        mock_session.execute = _mock_execute
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_factory = MagicMock(return_value=mock_session)

        req = _make_request(headers={})

        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(), 10)
            )

        assert captured_params.get("agent_name") is None
        assert captured_params.get("agent_framework") is None
        assert captured_params.get("session_id") is None


class TestAgentProfileUpsert:
    """Verify the agent_profiles upsert fires when agent_name is set."""

    def test_upsert_fires_with_agent_name(self):
        """An INSERT INTO agent_profiles should be issued when agent_name is present."""
        sql_statements: list[str] = []

        async def _mock_execute(stmt, params=None):
            sql = str(stmt.text) if hasattr(stmt, "text") else str(stmt)
            sql_statements.append(sql)

        mock_session = AsyncMock()
        mock_session.execute = _mock_execute
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_factory = MagicMock(return_value=mock_session)

        req = _make_request(headers={"x-agent-name": "test-bot", "x-agent-framework": "crewai"})

        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(), 5)
            )

        agent_sqls = [s for s in sql_statements if "agent_profiles" in s]
        assert len(agent_sqls) == 1, f"Expected 1 agent_profiles SQL, got {len(agent_sqls)}"
        assert "ON CONFLICT" in agent_sqls[0]

    def test_no_upsert_without_agent_name(self):
        """No agent_profiles SQL should be issued when x-agent-name is absent."""
        sql_statements: list[str] = []

        async def _mock_execute(stmt, params=None):
            sql = str(stmt.text) if hasattr(stmt, "text") else str(stmt)
            sql_statements.append(sql)

        mock_session = AsyncMock()
        mock_session.execute = _mock_execute
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_factory = MagicMock(return_value=mock_session)

        req = _make_request(headers={})

        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(), 5)
            )

        agent_sqls = [s for s in sql_statements if "agent_profiles" in s]
        assert len(agent_sqls) == 0, "agent_profiles SQL should not fire without agent_name"

    def test_pass_rate_calculation(self):
        """When verdict=PASS, the passed param should be 1.0."""
        captured = {}

        async def _mock_execute(stmt, params=None):
            sql = str(stmt.text) if hasattr(stmt, "text") else str(stmt)
            if "agent_profiles" in sql:
                captured.update(params or {})

        mock_session = AsyncMock()
        mock_session.execute = _mock_execute
        mock_session.commit = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_factory = MagicMock(return_value=mock_session)

        req = _make_request(headers={"x-agent-name": "bot"})

        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(verdict="PASS"), 5)
            )
        assert captured["passed"] == 1.0

        captured.clear()
        with patch("vr_api.app.get_session_factory", return_value=mock_factory):
            asyncio.get_event_loop().run_until_complete(
                _record_verification(req, _make_body(), _make_result(verdict="FAIL"), 5)
            )
        assert captured["passed"] == 0.0
