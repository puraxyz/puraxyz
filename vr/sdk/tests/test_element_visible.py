"""Tests for web.browser.element_visible verifier."""

from __future__ import annotations


from vrdev.core.types import Verdict, VerifierInput
from vrdev.tasks.web.element_visible import ElementVisibleVerifier

from mocks.browser_mock import MockBrowserRunner, MOCK_PAGES


# ══════════════════════════════════════════════════════════════════════════════
# Positive cases - element found
# ══════════════════════════════════════════════════════════════════════════════


class TestElementVisiblePositive:
    def _make_verifier(self, pages=None):
        runner = MockBrowserRunner(pages=pages or MOCK_PAGES)
        return ElementVisibleVerifier(browser_runner=runner)

    def test_element_found(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Added product to cart."],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "h1.product-title",
            },
        )
        results = v.verify(inp)
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score >= 1.0
        assert results[0].evidence["element_found"] is True

    def test_element_found_with_text_match(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "h1.product-title",
                "expected_text": "Widget Pro",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].breakdown["text_match"] == 1.0

    def test_button_element(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Clicked the button."],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "#add-to-cart",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS
        assert results[0].evidence["tag_name"] == "button"


# ══════════════════════════════════════════════════════════════════════════════
# Negative cases - element not found
# ══════════════════════════════════════════════════════════════════════════════


class TestElementVisibleNegative:
    def _make_verifier(self, pages=None):
        runner = MockBrowserRunner(pages=pages or MOCK_PAGES)
        return ElementVisibleVerifier(browser_runner=runner)

    def test_element_not_found(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Added to cart."],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "div.checkout-confirmation",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].evidence["element_found"] is False

    def test_text_mismatch(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "h1.product-title",
                "expected_text": "Wrong Product Name",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL
        assert results[0].breakdown["text_match"] == 0.0

    def test_page_not_found(self):
        v = self._make_verifier()
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "url": "http://shop.test/nonexistent",
                "selector": "h1",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.FAIL


# ══════════════════════════════════════════════════════════════════════════════
# Error / edge cases
# ══════════════════════════════════════════════════════════════════════════════


class TestElementVisibleErrors:
    def test_launch_error(self):
        runner = MockBrowserRunner(launch_error="Chromium not found")
        v = ElementVisibleVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "url": "http://example.com",
                "selector": "h1",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR
        assert "launch_error" in results[0].evidence

    def test_multiple_completions(self):
        runner = MockBrowserRunner(pages=MOCK_PAGES)
        v = ElementVisibleVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["a", "b", "c"],
            ground_truth={
                "url": "http://shop.test/products/1",
                "selector": "h1.product-title",
            },
        )
        results = v.verify(inp)
        assert len(results) == 3
        assert all(r.verdict == Verdict.PASS for r in results)

    def test_tier_is_agentic(self):
        v = ElementVisibleVerifier()
        assert v.tier.value == "AGENTIC"

    def test_empty_cart_page(self):
        runner = MockBrowserRunner(pages=MOCK_PAGES)
        v = ElementVisibleVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["Cleared the cart."],
            ground_truth={
                "url": "http://shop.test/cart/empty",
                "selector": "p.empty-msg",
                "expected_text": "Your cart is empty.",
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_server_error_page(self):
        runner = MockBrowserRunner(pages=MOCK_PAGES)
        v = ElementVisibleVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["Done."],
            ground_truth={
                "url": "http://shop.test/error-500",
                "selector": "h1",
            },
        )
        results = v.verify(inp)
        # Page loads with 500 but element not found → FAIL
        assert results[0].verdict == Verdict.FAIL
