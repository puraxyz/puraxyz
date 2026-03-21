"""Tests for API/HTTP verifiers using pre_result shortcut."""

from __future__ import annotations

from vrdev.core.types import VerifierInput
from vrdev.tasks.api import (
    HttpHeaderPresentVerifier,
    HttpResponseMatchesVerifier,
    HttpStatusOkVerifier,
)


def _inp(gt: dict) -> VerifierInput:
    return VerifierInput(completions=["done"], ground_truth=gt)


class TestHttpStatusOk:
    def test_pass_200(self):
        v = HttpStatusOkVerifier()
        results = v.verify(_inp({
            "expected_status": 200,
            "pre_result": {"status_code": 200},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_wrong_status(self):
        v = HttpStatusOkVerifier()
        results = v.verify(_inp({
            "expected_status": 200,
            "pre_result": {"status_code": 404},
        }))
        assert results[0].verdict.value == "FAIL"
        assert results[0].repair_hints

    def test_fail_server_error_retryable(self):
        v = HttpStatusOkVerifier()
        results = v.verify(_inp({
            "expected_status": 200,
            "pre_result": {"status_code": 500},
        }))
        assert results[0].verdict.value == "FAIL"
        assert results[0].retryable is True

    def test_fail_auth_error(self):
        v = HttpStatusOkVerifier()
        results = v.verify(_inp({
            "expected_status": 200,
            "pre_result": {"status_code": 401},
        }))
        assert results[0].verdict.value == "FAIL"

    def test_error_no_url(self):
        v = HttpStatusOkVerifier()
        results = v.verify(_inp({"expected_status": 200}))
        assert results[0].verdict.value == "ERROR"


class TestHttpResponseMatches:
    def test_pass_all_found(self):
        v = HttpResponseMatchesVerifier()
        results = v.verify(_inp({
            "expected_substrings": ["hello", "world"],
            "pre_result": {"body": "hello beautiful world"},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_missing_substring(self):
        v = HttpResponseMatchesVerifier()
        results = v.verify(_inp({
            "expected_substrings": ["hello", "missing"],
            "pre_result": {"body": "hello world"},
        }))
        assert results[0].verdict.value == "FAIL"
        assert results[0].repair_hints

    def test_error_no_url(self):
        v = HttpResponseMatchesVerifier()
        results = v.verify(_inp({"expected_substrings": ["test"]}))
        assert results[0].verdict.value == "ERROR"


class TestHttpHeaderPresent:
    def test_pass_headers_present(self):
        v = HttpHeaderPresentVerifier()
        results = v.verify(_inp({
            "expected_headers": {"Content-Type": "application/json"},
            "pre_result": {"headers": {"Content-Type": "application/json"}},
        }))
        assert results[0].verdict.value == "PASS"

    def test_pass_any_value(self):
        v = HttpHeaderPresentVerifier()
        results = v.verify(_inp({
            "expected_headers": {"X-Request-Id": None},
            "pre_result": {"headers": {"X-Request-Id": "abc-123"}},
        }))
        assert results[0].verdict.value == "PASS"

    def test_fail_missing_header(self):
        v = HttpHeaderPresentVerifier()
        results = v.verify(_inp({
            "expected_headers": {"X-Missing": "value"},
            "pre_result": {"headers": {"Content-Type": "text/html"}},
        }))
        assert results[0].verdict.value == "FAIL"
        assert results[0].repair_hints

    def test_error_no_url(self):
        v = HttpHeaderPresentVerifier()
        results = v.verify(_inp({"expected_headers": {"X-Foo": "bar"}}))
        assert results[0].verdict.value == "ERROR"
