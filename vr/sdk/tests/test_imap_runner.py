"""Tests for runners/imap.py - IMAP connection manager.

All tests use mocked imaplib connections - no real IMAP server required.
"""

from __future__ import annotations

import imaplib
from unittest.mock import MagicMock, patch

import pytest

from vrdev.core.types import Verdict
from vrdev.runners.imap import IMAPRunner


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def mock_conn():
    """Pre-configured MagicMock mimicking an IMAP4_SSL connection."""
    conn = MagicMock()
    conn.socket.return_value = MagicMock()
    conn.login.return_value = ("OK", [b"Login completed"])
    conn.select.return_value = ("OK", [b"3"])
    conn.search.return_value = ("OK", [b"1 2 3"])
    conn.fetch.return_value = (
        "OK",
        [
            (
                b'3 (BODY[HEADER.FIELDS (MESSAGE-ID)] {42}',
                b"Message-ID: <test@mock.com>\r\n",
            )
        ],
    )
    conn.logout.return_value = ("BYE", [b"Logging out"])
    return conn


# ══════════════════════════════════════════════════════════════════════════════
# connect
# ══════════════════════════════════════════════════════════════════════════════


class TestIMAPConnect:
    def test_ssl_connect_success(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            result = runner.connect()
        assert result["verdict"] == Verdict.PASS
        assert result["connected"] is True
        mock_conn.login.assert_called_once_with("u", "p")

    def test_non_ssl_connect_success(self, mock_conn):
        with patch("imaplib.IMAP4", return_value=mock_conn):
            runner = IMAPRunner(
                host="imap.test.com", use_ssl=False, username="u", password="p"
            )
            result = runner.connect()
        assert result["verdict"] == Verdict.PASS
        assert result["connected"] is True

    def test_auth_failure(self):
        conn = MagicMock()
        conn.socket.return_value = MagicMock()
        conn.login.side_effect = imaplib.IMAP4.error("LOGIN failed")
        with patch("imaplib.IMAP4_SSL", return_value=conn):
            runner = IMAPRunner(host="imap.test.com", username="bad", password="bad")
            result = runner.connect()
        assert result["verdict"] == Verdict.ERROR
        assert "authentication failed" in result["error"].lower()
        assert result["connected"] is False

    def test_network_failure(self):
        with patch("imaplib.IMAP4_SSL", side_effect=ConnectionError("refused")):
            runner = IMAPRunner(host="imap.test.com")
            result = runner.connect()
        assert result["verdict"] == Verdict.ERROR
        assert "connection failed" in result["error"].lower()
        assert result["connected"] is False


# ══════════════════════════════════════════════════════════════════════════════
# search_sent
# ══════════════════════════════════════════════════════════════════════════════


class TestIMAPSearchSent:
    def test_message_found(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            runner.connect()
            result = runner.search_sent(recipient="a@b.com", subject_fragment="Hello")
        assert result["verdict"] == Verdict.PASS
        assert result["message_id"] is not None
        assert "test@mock.com" in result["message_id"]
        assert result["messages_checked"] == 3

    def test_no_messages_found(self, mock_conn):
        mock_conn.search.return_value = ("OK", [b""])
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            runner.connect()
            result = runner.search_sent(recipient="nobody@test.com")
        assert result["verdict"] == Verdict.FAIL
        assert result["message_id"] is None
        assert result["messages_checked"] == 0

    def test_not_connected(self):
        runner = IMAPRunner(host="imap.test.com")
        result = runner.search_sent(recipient="a@b.com")
        assert result["verdict"] == Verdict.ERROR
        assert "not connected" in result["error"].lower()

    def test_folder_select_fails(self, mock_conn):
        mock_conn.select.return_value = ("NO", [b"Folder not found"])
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            runner.connect()
            result = runner.search_sent(folder="NonExistent")
        assert result["verdict"] == Verdict.ERROR
        assert "could not select" in result["error"].lower()

    def test_search_query_includes_criteria(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            runner.connect()
            result = runner.search_sent(recipient="x@y.com", subject_fragment="Hi")
        assert "TO" in result["search_query"]
        assert "SUBJECT" in result["search_query"]


# ══════════════════════════════════════════════════════════════════════════════
# disconnect / context manager
# ══════════════════════════════════════════════════════════════════════════════


class TestIMAPLifecycle:
    def test_disconnect(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            runner = IMAPRunner(host="imap.test.com", username="u", password="p")
            runner.connect()
            runner.disconnect()
        mock_conn.logout.assert_called_once()
        assert runner._connection is None

    def test_context_manager(self, mock_conn):
        with patch("imaplib.IMAP4_SSL", return_value=mock_conn):
            with IMAPRunner(host="imap.test.com", username="u", password="p") as runner:
                result = runner.search_sent(recipient="a@b.com")
        assert result["verdict"] == Verdict.PASS
        mock_conn.logout.assert_called_once()
