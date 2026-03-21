"""Tests for runners/managed_imap.py - connection-pooled IMAP runner."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from vrdev.core.types import Verdict
from vrdev.runners.managed_imap import ManagedIMAPRunner


@pytest.fixture
def mock_conn():
    """Pre-configured mock IMAP4_SSL connection."""
    conn = MagicMock()
    conn.socket.return_value = MagicMock()
    conn.login.return_value = ("OK", [b"OK"])
    conn.select.return_value = ("OK", [b"2"])
    conn.search.return_value = ("OK", [b"1 2"])
    conn.fetch.return_value = (
        "OK",
        [(b"2 (BODY...)", b"Message-ID: <pool@test>\r\n")],
    )
    conn.logout.return_value = ("BYE", [b""])
    return conn


class TestManagedIMAPRunner:
    def test_search_returns_result(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            pool = ManagedIMAPRunner(
                host="imap.test", username="u", password="p", pool_size=2
            )
            result = pool.search_sent(recipient="a@b.com")
        assert result["verdict"] == Verdict.PASS
        assert result["messages_checked"] == 2

    def test_pool_reuses_connections(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            pool = ManagedIMAPRunner(
                host="imap.test", username="u", password="p", pool_size=2
            )
            pool.search_sent(recipient="a@b.com")
            assert pool.active_connections == 1  # returned to pool

            pool.search_sent(recipient="c@d.com")
            assert pool.active_connections == 1  # reused

    def test_close_all(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            pool = ManagedIMAPRunner(
                host="imap.test", username="u", password="p", pool_size=2
            )
            pool.search_sent(recipient="a@b.com")
            assert pool.active_connections == 1
            pool.close_all()
            assert pool.active_connections == 0

    def test_context_manager(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            with ManagedIMAPRunner(
                host="imap.test", username="u", password="p"
            ) as pool:
                pool.search_sent(recipient="a@b.com")
                assert pool.active_connections == 1
            assert pool.active_connections == 0

    def test_error_disconnects_runner(self, mock_conn):
        mock_conn.select.side_effect = Exception("IMAP broken")
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            pool = ManagedIMAPRunner(
                host="imap.test", username="u", password="p"
            )
            result = pool.search_sent(recipient="a@b.com")
        assert result["verdict"] == Verdict.ERROR
        assert "pool error" in result["error"].lower()
        assert pool.active_connections == 0  # error → not returned to pool
