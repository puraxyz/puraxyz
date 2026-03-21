"""Tests for runners/browser.py - Playwright BrowserRunner."""

from __future__ import annotations

import pytest

from vrdev.core.types import Verdict
from vrdev.runners.browser import BrowserRunner, _HAS_PLAYWRIGHT

from mocks.browser_mock import MockBrowserRunner, MOCK_PAGES


# ══════════════════════════════════════════════════════════════════════════════
# Config tests
# ══════════════════════════════════════════════════════════════════════════════


class TestBrowserRunnerConfig:
    def test_default_config(self):
        runner = BrowserRunner()
        assert runner.headless is True
        assert runner.timeout == 30.0

    def test_custom_config(self):
        runner = BrowserRunner(headless=False, timeout=60.0)
        assert runner.headless is False
        assert runner.timeout == 60.0


# ══════════════════════════════════════════════════════════════════════════════
# Not-launched guard tests (no Playwright needed)
# ══════════════════════════════════════════════════════════════════════════════


class TestBrowserRunnerNotLaunched:
    """Methods return error dicts when browser hasn't been launched yet."""

    def test_navigate_without_launch(self):
        runner = BrowserRunner()
        result = runner.navigate("http://example.com")
        assert result["verdict"] == Verdict.ERROR
        assert "not launched" in result["error"].lower()

    def test_evaluate_without_launch(self):
        runner = BrowserRunner()
        result = runner.evaluate("document.title")
        assert result["verdict"] == Verdict.ERROR
        assert "not launched" in result["error"].lower()

    def test_screenshot_without_launch(self):
        runner = BrowserRunner()
        result = runner.screenshot()
        assert result["verdict"] == Verdict.ERROR
        assert "not launched" in result["error"].lower()

    def test_query_selector_without_launch(self):
        runner = BrowserRunner()
        result = runner.query_selector("h1")
        assert result["verdict"] == Verdict.ERROR
        assert "not launched" in result["error"].lower()


# ══════════════════════════════════════════════════════════════════════════════
# Launch without Playwright
# ══════════════════════════════════════════════════════════════════════════════


class TestBrowserRunnerNoPlaywright:
    @pytest.mark.skipif(_HAS_PLAYWRIGHT, reason="Playwright is installed")
    def test_launch_no_playwright(self):
        """Without Playwright installed, launch returns an ERROR dict."""
        runner = BrowserRunner()
        result = runner.launch()
        assert result["verdict"] == Verdict.ERROR
        assert "playwright" in result["error"].lower()
        assert result["launched"] is False


# ══════════════════════════════════════════════════════════════════════════════
# Close / cleanup
# ══════════════════════════════════════════════════════════════════════════════


class TestBrowserRunnerClose:
    def test_close_clears_state(self):
        runner = BrowserRunner()
        runner._playwright = "fake"
        runner._browser = "fake"
        runner._page = "fake"
        runner.close()
        assert runner._playwright is None
        assert runner._browser is None
        assert runner._page is None

    def test_close_idempotent(self):
        """Calling close() multiple times is safe."""
        runner = BrowserRunner()
        runner.close()
        runner.close()
        assert runner._browser is None


# ══════════════════════════════════════════════════════════════════════════════
# MockBrowserRunner tests (validates the mock + protocol parity)
# ══════════════════════════════════════════════════════════════════════════════


class TestMockBrowserRunner:
    def test_launch(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        result = mock.launch()
        assert result["verdict"] == Verdict.PASS
        assert result["launched"] is True

    def test_launch_error(self):
        mock = MockBrowserRunner(launch_error="Chromium not found")
        result = mock.launch()
        assert result["verdict"] == Verdict.ERROR
        assert result["launched"] is False

    def test_navigate_known_page(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.navigate("http://shop.test/products/1")
        assert result["verdict"] == Verdict.PASS
        assert result["status_code"] == 200
        assert result["title"] == "Widget Pro - Shop"

    def test_navigate_unknown_page(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.navigate("http://shop.test/nonexistent")
        assert result["verdict"] == Verdict.FAIL
        assert result["status_code"] == 404

    def test_navigate_not_launched(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        result = mock.navigate("http://example.com")
        assert result["verdict"] == Verdict.ERROR

    def test_evaluate(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.evaluate("1 + 1")
        assert result["verdict"] == Verdict.PASS
        assert result["result"] == "1 + 1"

    def test_screenshot(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.screenshot()
        assert result["verdict"] == Verdict.PASS
        assert result["png_bytes"] is not None

    def test_query_selector_found(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        mock.navigate("http://shop.test/products/1")
        result = mock.query_selector("h1.product-title")
        assert result["verdict"] == Verdict.PASS
        assert result["found"] is True
        assert result["tag_name"] == "h1"
        assert result["text_content"] == "Widget Pro"

    def test_query_selector_not_found(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        mock.navigate("http://shop.test/products/1")
        result = mock.query_selector("div.nonexistent")
        assert result["verdict"] == Verdict.FAIL
        assert result["found"] is False

    def test_query_selector_no_page(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.query_selector("h1")
        assert result["verdict"] == Verdict.FAIL
        assert result["found"] is False

    def test_close(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        mock.close()
        result = mock.navigate("http://example.com")
        assert result["verdict"] == Verdict.ERROR

    def test_context_manager(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        with mock as m:
            assert m._launched is True
        assert mock._launched is False

    def test_navigate_500(self):
        mock = MockBrowserRunner(pages=MOCK_PAGES)
        mock.launch()
        result = mock.navigate("http://shop.test/error-500")
        assert result["verdict"] == Verdict.FAIL
        assert result["status_code"] == 500
