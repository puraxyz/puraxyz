"""Shared pytest fixtures for vr.dev test suite.

Re-exports the session-scoped τ²-bench mock server and provides
convenience factories for mock IMAP runners and stub LLM judges.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure tests/ helper modules (mocks/) are importable
sys.path.insert(0, str(Path(__file__).parent))

import pytest  # noqa: E402

from mocks.tau2_server import tau2_server  # noqa: E402, F401
from mocks.webarena_server import webarena_server  # noqa: E402, F401
from mocks.calendar_server import calendar_server  # noqa: E402, F401
from mocks.telecom_server import telecom_server  # noqa: E402, F401
from mocks.imap_mock import MockIMAPRunner  # noqa: E402
from mocks.browser_mock import (  # noqa: E402, F401
    MockBrowserRunner,
    mock_browser,
    mock_browser_empty,
    mock_browser_launch_error,
)

from vrdev.core.llm import StubJudge  # noqa: E402


@pytest.fixture
def mock_imap_with_email():
    """MockIMAPRunner pre-loaded with one matching email."""
    return MockIMAPRunner(
        emails=[
            {
                "recipient": "customer@example.com",
                "subject": "Order Cancellation Confirmation",
                "message_id": "<test-001@vrdev.test>",
            },
        ],
    )


@pytest.fixture
def mock_imap_empty():
    """MockIMAPRunner with no emails (search always returns FAIL)."""
    return MockIMAPRunner(emails=[])


@pytest.fixture
def mock_imap_connection_error():
    """MockIMAPRunner that fails to connect."""
    return MockIMAPRunner(connect_error="IMAP auth failed: invalid credentials")


@pytest.fixture
def stub_judge_perfect():
    """StubJudge returning a perfect rubric score."""
    return StubJudge(
        '{"greeting_present": 1, "appropriate_formality": 1, '
        '"key_info_included": 1, "no_inappropriate_content": 1}'
    )


@pytest.fixture
def stub_judge_partial():
    """StubJudge returning a partial rubric score (2/4)."""
    return StubJudge(
        '{"greeting_present": 1, "appropriate_formality": 0, '
        '"key_info_included": 0, "no_inappropriate_content": 1}'
    )


@pytest.fixture
def stub_judge_fail():
    """StubJudge returning all zeros."""
    return StubJudge(
        '{"greeting_present": 0, "appropriate_formality": 0, '
        '"key_info_included": 0, "no_inappropriate_content": 0}'
    )
