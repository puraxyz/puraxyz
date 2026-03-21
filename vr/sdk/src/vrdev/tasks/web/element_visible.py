"""vr/web.browser.element_visible - AGENTIC verifier for DOM element visibility.

Source: WebArena (arXiv:2307.13854)
Navigates to a URL via BrowserRunner and checks whether a specific CSS
selector is present in the DOM. This verifier catches agents that claim
UI actions succeeded but never actually modified the page.
"""

from __future__ import annotations

import time
from typing import Any

from ...core.base import BaseVerifier
from ...core.types import Tier, VerificationResult, Verdict, VerifierInput


class ElementVisibleVerifier(BaseVerifier):
    """Verifies that a DOM element is visible on a web page.

    Ground truth schema::

        {
            "url": str,
            "selector": str,           # CSS selector
            "expected_text": str | null # optional text content check
        }

    Context (optional)::

        {"browser_config": {"headless": bool, "timeout": float}}

    Accepts an optional ``browser_runner`` constructor kwarg for injecting
    a mock in tests (same pattern as ``imap_runner`` in
    ``SentFolderConfirmedVerifier``).
    """

    name = "web.browser.element_visible"
    tier = Tier.AGENTIC
    version = "0.1.0"

    def __init__(self, browser_runner: Any | None = None):
        self._browser_runner = browser_runner

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        url = gt.get("url", "")
        selector = gt.get("selector", "")
        expected_text = gt.get("expected_text")
        browser_config = (input_data.context or {}).get("browser_config", {})

        results = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            result = self._verify_single(
                url, selector, expected_text, browser_config, input_data,
            )
            elapsed_ms = (time.monotonic_ns() - start) // 1_000_000
            result.metadata.execution_ms = elapsed_ms
            results.append(result)
        return results

    def _verify_single(
        self,
        url: str,
        selector: str,
        expected_text: str | None,
        browser_config: dict,
        input_data: VerifierInput,
    ) -> VerificationResult:
        evidence: dict[str, Any] = {"url": url, "selector": selector}
        breakdown: dict[str, float] = {}

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
            # ── Launch ───────────────────────────────────────────────────
            launch_result = runner.launch()
            if launch_result["verdict"] != Verdict.PASS:
                evidence["launch_error"] = launch_result.get("error")
                return self._make_result(
                    Verdict.ERROR, 0.0, breakdown, evidence, input_data,
                    permissions=["net:browser"],
                    source_benchmark="WebArena",
                    source_citation="arXiv:2307.13854",
                )

            # ── Navigate ─────────────────────────────────────────────────
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

            # ── Query selector ───────────────────────────────────────────
            qs_result = runner.query_selector(selector)
            evidence["element_found"] = qs_result.get("found", False)
            evidence["tag_name"] = qs_result.get("tag_name")
            evidence["text_content"] = qs_result.get("text_content")

            if qs_result.get("error"):
                evidence["selector_error"] = qs_result["error"]

            breakdown["element_present"] = 1.0 if qs_result["found"] else 0.0

            # ── Optional text match ──────────────────────────────────────
            if expected_text is not None:
                actual_text = (qs_result.get("text_content") or "").strip()
                text_match = expected_text.lower() in actual_text.lower()
                breakdown["text_match"] = 1.0 if text_match else 0.0

            # ── Aggregate ────────────────────────────────────────────────
            checks = list(breakdown.values())
            score = sum(checks) / len(checks) if checks else 0.0
            verdict = Verdict.PASS if all(v >= 1.0 for v in checks) else Verdict.FAIL

            return self._make_result(
                verdict, round(score, 4), breakdown, evidence, input_data,
                permissions=["net:browser"],
                source_benchmark="WebArena",
                source_citation="arXiv:2307.13854",
            )
        finally:
            if owns_runner:
                runner.close()
