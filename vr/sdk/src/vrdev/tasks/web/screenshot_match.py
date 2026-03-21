"""vr/web.browser.screenshot_match - AGENTIC verifier for visual regression.

Source: WebArena (arXiv:2307.13854)
Navigates to a URL via BrowserRunner, captures a screenshot, and compares
it to a reference image using Structural Similarity Index (SSIM) from Pillow.

Requires the ``vision`` optional dependency: ``pip install vrdev[vision]``

SSIM threshold is configurable via ``ground_truth.min_ssim`` (default 0.95).
"""

from __future__ import annotations

import io
import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput


def _compute_ssim(img_a_bytes: bytes, img_b_bytes: bytes) -> float:
    """Compute SSIM between two images given as raw PNG bytes.

    Uses Pillow for image loading and a pure-Python SSIM implementation
    to avoid heavy native dependencies (no scikit-image).
    """
    try:
        from PIL import Image
    except ImportError:
        raise ImportError(
            "Screenshot comparison requires Pillow. "
            "Install with: pip install vrdev[vision]"
        ) from None

    img_a = Image.open(io.BytesIO(img_a_bytes)).convert("L")
    img_b = Image.open(io.BytesIO(img_b_bytes)).convert("L")

    # Resize to common dimensions for comparison
    width = min(img_a.width, img_b.width)
    height = min(img_a.height, img_b.height)
    img_a = img_a.resize((width, height))
    img_b = img_b.resize((width, height))

    pixels_a = list(img_a.getdata()) if not hasattr(img_a, "get_flattened_data") else list(img_a.get_flattened_data())
    pixels_b = list(img_b.getdata()) if not hasattr(img_b, "get_flattened_data") else list(img_b.get_flattened_data())

    n = len(pixels_a)
    if n == 0:
        return 0.0

    # Means
    mean_a = sum(pixels_a) / n
    mean_b = sum(pixels_b) / n

    # Variances and covariance
    var_a = sum((p - mean_a) ** 2 for p in pixels_a) / n
    var_b = sum((p - mean_b) ** 2 for p in pixels_b) / n
    cov_ab = sum((a - mean_a) * (b - mean_b) for a, b in zip(pixels_a, pixels_b)) / n

    # SSIM constants (for 8-bit images, L = 255)
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2

    numerator = (2 * mean_a * mean_b + c1) * (2 * cov_ab + c2)
    denominator = (mean_a**2 + mean_b**2 + c1) * (var_a + var_b + c2)

    return numerator / denominator if denominator != 0 else 0.0


class ScreenshotMatchVerifier(BaseVerifier):
    """Verifies visual similarity between a live page screenshot and a reference.

    Ground truth schema::

        {
            "url": str,
            "reference_screenshot": str,  # base64-encoded PNG or file path
            "min_ssim": float             # default 0.95
        }

    Context (optional)::

        {"browser_config": {"headless": bool, "timeout": float}}

    Accepts an optional ``browser_runner`` constructor kwarg for injecting
    a mock in tests.
    """

    name = "web.browser.screenshot_match"
    tier = Tier.AGENTIC
    version = "0.1.0"

    def __init__(self, browser_runner: Any | None = None):
        self._browser_runner = browser_runner

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        url = gt.get("url", "")
        min_ssim = float(gt.get("min_ssim", 0.95))
        reference_data = gt.get("reference_screenshot", "")
        browser_config = (input_data.context or {}).get("browser_config", {})

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                url, reference_data, min_ssim, browser_config, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        url: str,
        reference_data: str,
        min_ssim: float,
        browser_config: dict,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"url": url, "min_ssim": min_ssim}
        breakdown: dict[str, float] = {}

        # Decode reference screenshot
        try:
            import base64

            reference_bytes = base64.b64decode(reference_data)
        except Exception as exc:
            evidence["error"] = f"Failed to decode reference screenshot: {exc}"
            return self._make_result(
                Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                permissions=["net:browser"],
                source_benchmark="WebArena",
                source_citation="arXiv:2307.13854",
            )

        runner = self._browser_runner
        owns_runner = False
        if runner is None:
            from ...runners.browser import BrowserRunner

            owns_runner = True
            runner = BrowserRunner(
                headless=browser_config.get("headless", True),
                timeout=browser_config.get("timeout", 30.0),
            )

        try:
            # Launch browser
            launch_result = runner.launch()
            if launch_result["verdict"] != Verdict.PASS:
                evidence["launch_error"] = launch_result.get("error")
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                    permissions=["net:browser"],
                    source_benchmark="WebArena",
                    source_citation="arXiv:2307.13854",
                )

            # Navigate
            nav_result = runner.navigate(url)
            evidence["status_code"] = nav_result.get("status_code")
            evidence["page_title"] = nav_result.get("title")

            if nav_result["verdict"] == Verdict.ERROR:
                evidence["navigation_error"] = nav_result.get("error")
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                    permissions=["net:browser"],
                    source_benchmark="WebArena",
                    source_citation="arXiv:2307.13854",
                )

            breakdown["page_loaded"] = (
                1.0 if nav_result["verdict"] == Verdict.PASS else 0.0
            )

            # Capture screenshot
            screenshot_result = runner.screenshot()
            if screenshot_result.get("error"):
                evidence["screenshot_error"] = screenshot_result["error"]
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                    permissions=["net:browser"],
                    source_benchmark="WebArena",
                    source_citation="arXiv:2307.13854",
                )

            live_bytes = screenshot_result.get("data", b"")

            # Compute SSIM
            try:
                ssim = _compute_ssim(reference_bytes, live_bytes)
            except Exception as exc:
                evidence["ssim_error"] = str(exc)
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                    permissions=["net:browser"],
                    source_benchmark="WebArena",
                    source_citation="arXiv:2307.13854",
                )

            evidence["ssim"] = round(ssim, 6)
            breakdown["ssim_score"] = round(ssim, 4)
            breakdown["meets_threshold"] = 1.0 if ssim >= min_ssim else 0.0

            # Aggregate
            score = ssim
            verdict = Verdict.PASS if ssim >= min_ssim else Verdict.FAIL

            return self._make_result(
                verdict, round(score, 4), breakdown, evidence, input_data,
                permissions=["net:browser"],
                source_benchmark="WebArena",
                source_citation="arXiv:2307.13854",
            )
        finally:
            if owns_runner:
                runner.close()
