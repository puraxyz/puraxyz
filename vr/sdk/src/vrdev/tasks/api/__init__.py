"""API/HTTP verifiers: status code, response matching, and header checks.

All are HARD-tier deterministic verifiers that inspect HTTP responses.
They accept either a live ``url`` or a ``pre_result`` dict for testing.
"""

from __future__ import annotations

import time
from typing import Any

from vrdev.core.base import BaseVerifier
from vrdev.core.types import Tier, Verdict, VerifierInput, VerificationResult


def _http_get(url: str, headers: dict | None = None, timeout: int = 10) -> dict:  # pragma: no cover
    """Perform a simple HTTP GET request using httpx."""
    import httpx
    resp = httpx.get(url, headers=headers or {}, timeout=timeout, follow_redirects=True)
    return {
        "status_code": resp.status_code,
        "headers": dict(resp.headers),
        "body": resp.text[:10_000],  # cap at 10KB
    }


class HttpStatusOkVerifier(BaseVerifier):
    """Verifies that an HTTP endpoint returns the expected status code.

    Ground truth schema::

        {
            "url": str | null,
            "expected_status": int,     # default 200
            "pre_result": dict | null   # { "status_code": int }
        }
    """

    name = "api.http.status_ok"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        url = gt.get("url")
        expected_status = gt.get("expected_status", 200)
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"expected_status": expected_status}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            actual_status = pre_result.get("status_code", 0)
        elif url:
            try:
                resp = _http_get(url)
                actual_status = resp["status_code"]
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])
        else:
            evidence["error"] = "no url or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])

        evidence["actual_status"] = actual_status
        breakdown["status_match"] = 1.0 if actual_status == expected_status else 0.0
        score = breakdown["status_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        is_retryable = False
        if verdict == Verdict.FAIL:
            hints.append(f"Got status {actual_status} instead of {expected_status}")
            if actual_status >= 500:
                hints.append("Server error - may be transient, consider retrying")
                is_retryable = True
            elif actual_status == 401 or actual_status == 403:
                hints.append("Check auth headers and API credentials")
            hints.append("Check endpoint URL is correct")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["net:http"],
                                 repair_hints=hints, retryable=is_retryable)


class HttpResponseMatchesVerifier(BaseVerifier):
    """Verifies that an HTTP response body contains expected substrings.

    Ground truth schema::

        {
            "url": str | null,
            "expected_substrings": list[str],
            "pre_result": dict | null   # { "body": str }
        }
    """

    name = "api.http.response_matches"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        url = gt.get("url")
        expected = gt.get("expected_substrings", [])
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"expected_substrings": expected}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            body = pre_result.get("body", "")
        elif url:
            try:
                resp = _http_get(url)
                body = resp["body"]
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])
        else:
            evidence["error"] = "no url or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])

        found = sum(1 for s in expected if s in body)
        breakdown["substring_match"] = found / len(expected) if expected else 1.0
        evidence["found_count"] = found
        evidence["expected_count"] = len(expected)

        score = breakdown["substring_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            missing = [s for s in expected if s not in body]
            for m in missing[:3]:
                hints.append(f"Expected substring not found: '{m[:80]}'")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["net:http"],
                                 repair_hints=hints)


class HttpHeaderPresentVerifier(BaseVerifier):
    """Verifies that an HTTP response contains expected headers.

    Ground truth schema::

        {
            "url": str | null,
            "expected_headers": dict[str, str | null],  # header_name → expected_value or null (any value)
            "pre_result": dict | null   # { "headers": dict }
        }
    """

    name = "api.http.header_present"
    tier = Tier.HARD
    version = "0.1.0"

    def verify(self, input_data: VerifierInput) -> list[VerificationResult]:
        gt = input_data.ground_truth
        results: list[VerificationResult] = []
        for completion in input_data.completions:
            start = time.monotonic_ns()
            r = self._verify_single(gt, input_data)
            r.metadata.execution_ms = (time.monotonic_ns() - start) // 1_000_000
            results.append(r)
        return results

    def _verify_single(self, gt: dict, input_data: VerifierInput) -> VerificationResult:
        url = gt.get("url")
        expected_headers = gt.get("expected_headers", {})
        pre_result = gt.get("pre_result")

        evidence: dict[str, Any] = {"expected_headers": list(expected_headers.keys())}
        breakdown: dict[str, float] = {}

        if pre_result is not None:
            headers = {k.lower(): v for k, v in pre_result.get("headers", {}).items()}
        elif url:
            try:
                resp = _http_get(url)
                headers = {k.lower(): v for k, v in resp["headers"].items()}
            except Exception as exc:
                evidence["error"] = str(exc)
                return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])
        else:
            evidence["error"] = "no url or pre_result provided"
            return self._make_result(Verdict.ERROR, 0.0, breakdown, evidence, input_data, permissions=["net:http"])

        matched = 0
        for h_name, h_value in expected_headers.items():
            actual = headers.get(h_name.lower())
            if actual is not None:
                if h_value is None or actual == h_value:
                    matched += 1

        breakdown["headers_match"] = matched / len(expected_headers) if expected_headers else 1.0
        evidence["matched_count"] = matched
        evidence["expected_count"] = len(expected_headers)

        score = breakdown["headers_match"]
        verdict = Verdict.PASS if score >= 1.0 else Verdict.FAIL
        hints: list[str] = []
        if verdict == Verdict.FAIL:
            missing = [h for h in expected_headers if headers.get(h.lower()) is None]
            for h in missing[:3]:
                hints.append(f"Expected header '{h}' not found in response")
        return self._make_result(verdict, score, breakdown, evidence, input_data, permissions=["net:http"],
                                 repair_hints=hints)
