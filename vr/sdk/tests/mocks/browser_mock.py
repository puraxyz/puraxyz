"""Mock browser runner for unit tests - no real Playwright dependency.

Provides ``MockBrowserRunner`` that returns canned responses for all
browser operations, matching the BrowserRunner protocol.
"""

from __future__ import annotations

import pytest

from vrdev.core.types import Verdict


class MockBrowserRunner:
    """In-memory browser runner that returns canned HTML / DOM results.

    Parameters
    ----------
    pages : dict[str, dict]
        Map of URL → page data.  Each page data dict should contain:
        ``status`` (int), ``title`` (str), ``body`` (str),
        ``elements`` (dict[str, dict]) mapping CSS selectors to
        ``{"tag_name": str, "text_content": str}``.
    launch_error : str | None
        If set, ``launch()`` returns an ERROR dict with this message.
    """

    def __init__(
        self,
        pages: dict[str, dict] | None = None,
        launch_error: str | None = None,
    ):
        self.pages: dict[str, dict] = pages or {}
        self.launch_error = launch_error
        self._launched = False
        self._current_url: str | None = None
        self._current_page: dict | None = None

    def launch(self) -> dict:
        if self.launch_error:
            return {
                "verdict": Verdict.ERROR,
                "error": self.launch_error,
                "launched": False,
            }
        self._launched = True
        return {"verdict": Verdict.PASS, "error": None, "launched": True}

    def navigate(self, url: str) -> dict:
        if not self._launched:
            return {
                "verdict": Verdict.ERROR,
                "url": url,
                "title": None,
                "status_code": None,
                "body": None,
                "error": "Browser not launched. Call launch() first.",
            }
        page = self.pages.get(url)
        if page is None:
            self._current_url = url
            self._current_page = None
            return {
                "verdict": Verdict.FAIL,
                "url": url,
                "title": None,
                "status_code": 404,
                "body": "Not Found",
                "error": None,
            }
        self._current_url = url
        self._current_page = page
        status = page.get("status", 200)
        if 200 <= status < 300:
            verdict = Verdict.PASS
        elif 400 <= status < 600:
            verdict = Verdict.FAIL
        else:
            verdict = Verdict.UNVERIFIABLE
        return {
            "verdict": verdict,
            "url": url,
            "title": page.get("title", ""),
            "status_code": status,
            "body": page.get("body", ""),
            "error": None,
        }

    def evaluate(self, js_expression: str) -> dict:
        if not self._launched:
            return {
                "verdict": Verdict.ERROR,
                "result": None,
                "error": "Browser not launched. Call launch() first.",
            }
        # Return the JS expression as the result for test predictability
        return {
            "verdict": Verdict.PASS,
            "result": js_expression,
            "error": None,
        }

    def screenshot(self) -> dict:
        if not self._launched:
            return {
                "verdict": Verdict.ERROR,
                "png_bytes": None,
                "error": "Browser not launched. Call launch() first.",
            }
        return {
            "verdict": Verdict.PASS,
            "png_bytes": b"\x89PNG_MOCK",
            "error": None,
        }

    def query_selector(self, selector: str) -> dict:
        if not self._launched:
            return {
                "verdict": Verdict.ERROR,
                "found": False,
                "tag_name": None,
                "text_content": None,
                "error": "Browser not launched. Call launch() first.",
            }
        if self._current_page is None:
            return {
                "verdict": Verdict.FAIL,
                "found": False,
                "tag_name": None,
                "text_content": None,
                "error": None,
            }
        elements = self._current_page.get("elements", {})
        el = elements.get(selector)
        if el is None:
            return {
                "verdict": Verdict.FAIL,
                "found": False,
                "tag_name": None,
                "text_content": None,
                "error": None,
            }
        return {
            "verdict": Verdict.PASS,
            "found": True,
            "tag_name": el.get("tag_name", "div"),
            "text_content": el.get("text_content", ""),
            "error": None,
        }

    def close(self) -> None:
        self._launched = False
        self._current_url = None
        self._current_page = None

    def __enter__(self) -> MockBrowserRunner:
        self.launch()
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


# ── Pytest fixtures ──────────────────────────────────────────────────────────

MOCK_PAGES: dict[str, dict] = {
    "http://shop.test/products/1": {
        "status": 200,
        "title": "Widget Pro - Shop",
        "body": '<html><body><h1 class="product-title">Widget Pro</h1>'
        '<span class="price">$29.99</span>'
        '<button id="add-to-cart">Add to Cart</button></body></html>',
        "elements": {
            "h1.product-title": {
                "tag_name": "h1",
                "text_content": "Widget Pro",
            },
            "#add-to-cart": {
                "tag_name": "button",
                "text_content": "Add to Cart",
            },
            "span.price": {
                "tag_name": "span",
                "text_content": "$29.99",
            },
        },
    },
    "http://shop.test/cart/empty": {
        "status": 200,
        "title": "Cart - Shop",
        "body": '<html><body><p class="empty-msg">Your cart is empty.</p></body></html>',
        "elements": {
            "p.empty-msg": {
                "tag_name": "p",
                "text_content": "Your cart is empty.",
            },
        },
    },
    "http://shop.test/error-500": {
        "status": 500,
        "title": "Server Error",
        "body": "<html><body>Internal Server Error</body></html>",
        "elements": {},
    },
}


@pytest.fixture
def mock_browser():
    """MockBrowserRunner pre-loaded with canned shop pages."""
    return MockBrowserRunner(pages=MOCK_PAGES)


@pytest.fixture
def mock_browser_empty():
    """MockBrowserRunner with no pages (navigate always returns 404)."""
    return MockBrowserRunner(pages={})


@pytest.fixture
def mock_browser_launch_error():
    """MockBrowserRunner that fails to launch."""
    return MockBrowserRunner(launch_error="Chromium binary not found")
