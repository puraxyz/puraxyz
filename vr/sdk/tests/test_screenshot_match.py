"""Tests for vr/web.browser.screenshot_match - AGENTIC verifier."""

from __future__ import annotations

import base64
import io

import pytest

from vrdev.core.types import Tier, Verdict, VerifierInput
from vrdev.tasks.web.screenshot_match import ScreenshotMatchVerifier, _compute_ssim


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_png(width: int = 10, height: int = 10, color: int = 128) -> bytes:
    """Create a minimal valid PNG with a solid colour."""
    from PIL import Image

    img = Image.new("L", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_reference_b64(width: int = 10, height: int = 10, color: int = 128) -> str:
    return base64.b64encode(_make_png(width, height, color)).decode()


# ── Mock browser runner ──────────────────────────────────────────────────────


class MockBrowserRunner:
    """Deterministic browser runner for testing."""

    def __init__(
        self,
        screenshot_data: bytes = b"",
        nav_ok: bool = True,
        launch_ok: bool = True,
    ):
        self._screenshot_data = screenshot_data
        self._nav_ok = nav_ok
        self._launch_ok = launch_ok

    def launch(self) -> dict:
        if not self._launch_ok:
            return {"verdict": Verdict.ERROR, "error": "launch failed"}
        return {"verdict": Verdict.PASS}

    def navigate(self, url: str) -> dict:
        if not self._nav_ok:
            return {"verdict": Verdict.ERROR, "error": "nav failed"}
        return {"verdict": Verdict.PASS, "status_code": 200, "title": "Test"}

    def screenshot(self) -> dict:
        return {"data": self._screenshot_data}

    def close(self) -> None:
        pass


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def ref_png():
    return _make_png(10, 10, 128)


@pytest.fixture
def ref_b64(ref_png):
    return base64.b64encode(ref_png).decode()


# ── Tests: SSIM computation ─────────────────────────────────────────────────


class TestSSIM:
    def test_identical_images(self, ref_png):
        ssim = _compute_ssim(ref_png, ref_png)
        assert ssim == pytest.approx(1.0, abs=0.001)

    def test_different_images(self):
        a = _make_png(10, 10, 0)
        b = _make_png(10, 10, 255)
        ssim = _compute_ssim(a, b)
        assert ssim < 0.5

    def test_similar_images(self):
        a = _make_png(10, 10, 128)
        b = _make_png(10, 10, 130)
        ssim = _compute_ssim(a, b)
        assert ssim > 0.95

    def test_different_sizes_handled(self):
        a = _make_png(20, 20, 128)
        b = _make_png(10, 10, 128)
        ssim = _compute_ssim(a, b)
        assert ssim == pytest.approx(1.0, abs=0.01)


# ── Tests: Verifier ─────────────────────────────────────────────────────────


class TestScreenshotMatch:
    def test_tier_is_agentic(self):
        v = ScreenshotMatchVerifier(browser_runner=MockBrowserRunner())
        assert v.tier == Tier.AGENTIC

    def test_name(self):
        v = ScreenshotMatchVerifier(browser_runner=MockBrowserRunner())
        assert v.name == "web.browser.screenshot_match"

    def test_pass_identical_screenshot(self, ref_png, ref_b64):
        runner = MockBrowserRunner(screenshot_data=ref_png)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert len(results) == 1
        r = results[0]
        assert r.verdict == Verdict.PASS
        assert r.score >= 0.95
        assert r.breakdown["meets_threshold"] == 1.0

    def test_fail_different_screenshot(self, ref_b64):
        different_png = _make_png(10, 10, 0)
        runner = MockBrowserRunner(screenshot_data=different_png)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "url": "http://example.com",
                "reference_screenshot": ref_b64,
                "min_ssim": 0.95,
            },
        )
        results = v.verify(inp)
        r = results[0]
        assert r.verdict == Verdict.FAIL
        assert r.breakdown["meets_threshold"] == 0.0

    def test_custom_min_ssim(self, ref_b64):
        slightly_different = _make_png(10, 10, 120)
        runner = MockBrowserRunner(screenshot_data=slightly_different)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={
                "url": "http://example.com",
                "reference_screenshot": ref_b64,
                "min_ssim": 0.5,  # very lenient
            },
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.PASS

    def test_launch_failure(self, ref_b64):
        runner = MockBrowserRunner(launch_ok=False)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_navigation_failure(self, ref_b64):
        runner = MockBrowserRunner(nav_ok=False)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_bad_reference_data(self):
        runner = MockBrowserRunner()
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": "!!!bad!!!"},
        )
        results = v.verify(inp)
        assert results[0].verdict == Verdict.ERROR

    def test_multiple_completions(self, ref_png, ref_b64):
        runner = MockBrowserRunner(screenshot_data=ref_png)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["a", "b"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert len(results) == 2

    def test_ssim_in_evidence(self, ref_png, ref_b64):
        runner = MockBrowserRunner(screenshot_data=ref_png)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert "ssim" in results[0].evidence

    def test_provenance(self, ref_png, ref_b64):
        runner = MockBrowserRunner(screenshot_data=ref_png)
        v = ScreenshotMatchVerifier(browser_runner=runner)
        inp = VerifierInput(
            completions=["done"],
            ground_truth={"url": "http://example.com", "reference_screenshot": ref_b64},
        )
        results = v.verify(inp)
        assert results[0].provenance.source_benchmark == "WebArena"
        assert "2307.13854" in results[0].provenance.source_citation
