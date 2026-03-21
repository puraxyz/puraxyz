"""Browser runner - Playwright-based headless browser for AGENTIC verifiers.

Provides a sandboxed browser interface for verifiers that need to check
real browser DOM state (e.g., element visibility, page content).

Requires: ``pip install playwright && python -m playwright install chromium``
"""

from __future__ import annotations

from ..core.types import Verdict

_INSTALL_MSG = (
    "BrowserRunner requires Playwright. Install with:\n"
    "  pip install playwright && python -m playwright install chromium"
)

try:
    from playwright.sync_api import sync_playwright

    _HAS_PLAYWRIGHT = True
except ImportError:
    sync_playwright = None  # type: ignore[assignment]
    _HAS_PLAYWRIGHT = False


class BrowserRunner:  # pragma: no cover
    """Headless browser runner for web-based verifications.

    Parameters
    ----------
    headless : bool
        Run in headless mode (default ``True``).
    timeout : float
        Page-level timeout in seconds (default ``30``).
    """

    def __init__(self, *, headless: bool = True, timeout: float = 30.0):
        self.headless = headless
        self.timeout = timeout
        self._playwright = None
        self._browser = None
        self._page = None

    def launch(self) -> dict:
        """Launch the browser.

        Returns
        -------
        dict
            ``verdict``, ``error``, ``launched``.
        """
        if not _HAS_PLAYWRIGHT:
            return {
                "verdict": Verdict.ERROR,
                "error": _INSTALL_MSG,
                "launched": False,
            }
        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            self._page = self._browser.new_page()
            self._page.set_default_timeout(self.timeout * 1000)
            return {"verdict": Verdict.PASS, "error": None, "launched": True}
        except Exception as exc:
            self.close()
            return {
                "verdict": Verdict.ERROR,
                "error": f"Browser launch failed: {exc}",
                "launched": False,
            }

    def navigate(self, url: str) -> dict:
        """Navigate to a URL and return page state.

        Returns
        -------
        dict
            ``verdict``, ``url``, ``title``, ``status_code``, ``body``, ``error``.
        """
        if self._page is None:
            return {
                "verdict": Verdict.ERROR,
                "url": url,
                "title": None,
                "status_code": None,
                "body": None,
                "error": "Browser not launched. Call launch() first.",
            }
        try:
            response = self._page.goto(url, wait_until="domcontentloaded")
            status = response.status if response else None
            title = self._page.title()
            body = self._page.content()[:10_240]  # Truncate like HTTP runner

            if status and 200 <= status < 300:
                verdict = Verdict.PASS
            elif status and 400 <= status < 600:
                verdict = Verdict.FAIL
            else:
                verdict = Verdict.UNVERIFIABLE

            return {
                "verdict": verdict,
                "url": self._page.url,
                "title": title,
                "status_code": status,
                "body": body,
                "error": None,
            }
        except Exception as exc:
            return {
                "verdict": Verdict.ERROR,
                "url": url,
                "title": None,
                "status_code": None,
                "body": None,
                "error": f"Navigation failed: {exc}",
            }

    def evaluate(self, js_expression: str) -> dict:
        """Evaluate a JavaScript expression in the page context.

        Returns
        -------
        dict
            ``verdict``, ``result``, ``error``.
        """
        if self._page is None:
            return {
                "verdict": Verdict.ERROR,
                "result": None,
                "error": "Browser not launched. Call launch() first.",
            }
        try:
            result = self._page.evaluate(js_expression)
            return {
                "verdict": Verdict.PASS,
                "result": result,
                "error": None,
            }
        except Exception as exc:
            return {
                "verdict": Verdict.ERROR,
                "result": None,
                "error": f"JS evaluation failed: {exc}",
            }

    def screenshot(self) -> dict:
        """Capture a screenshot of the current page.

        Returns
        -------
        dict
            ``verdict``, ``png_bytes``, ``error``.
        """
        if self._page is None:
            return {
                "verdict": Verdict.ERROR,
                "png_bytes": None,
                "error": "Browser not launched. Call launch() first.",
            }
        try:
            png = self._page.screenshot()
            return {
                "verdict": Verdict.PASS,
                "png_bytes": png,
                "error": None,
            }
        except Exception as exc:
            return {
                "verdict": Verdict.ERROR,
                "png_bytes": None,
                "error": f"Screenshot failed: {exc}",
            }

    def query_selector(self, selector: str) -> dict:
        """Check if an element matching the CSS selector exists.

        Returns
        -------
        dict
            ``verdict``, ``found``, ``tag_name``, ``text_content``, ``error``.
        """
        if self._page is None:
            return {
                "verdict": Verdict.ERROR,
                "found": False,
                "tag_name": None,
                "text_content": None,
                "error": "Browser not launched. Call launch() first.",
            }
        try:
            el = self._page.query_selector(selector)
            if el is None:
                return {
                    "verdict": Verdict.FAIL,
                    "found": False,
                    "tag_name": None,
                    "text_content": None,
                    "error": None,
                }
            tag = el.evaluate("e => e.tagName.toLowerCase()")
            text = el.text_content() or ""
            return {
                "verdict": Verdict.PASS,
                "found": True,
                "tag_name": tag,
                "text_content": text[:1024],
                "error": None,
            }
        except Exception as exc:
            return {
                "verdict": Verdict.ERROR,
                "found": False,
                "tag_name": None,
                "text_content": None,
                "error": f"Selector query failed: {exc}",
            }

    def close(self) -> None:
        """Close the browser and Playwright context."""
        if self._page:
            try:
                self._page.close()
            except Exception:
                pass
            self._page = None
        if self._browser:
            try:
                self._browser.close()
            except Exception:
                pass
            self._browser = None
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

    def __enter__(self) -> BrowserRunner:
        self.launch()
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
