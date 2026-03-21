"""Tests for async verification wrappers.

Covers BaseVerifier.async_verify, async_http_get, and async_http_post.
Uses pytest-asyncio to run coroutines.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from vrdev.core.types import Verdict, VerifierInput
from vrdev.runners.http import async_http_get, async_http_post
from vrdev.tasks.tau2.policy import ConstraintNotViolatedVerifier


# ── Embedded HTTP mock (reused from test_http_runner) ────────────────────────


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        self._json(200, {"msg": "ok"})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""
        self._json(200, {"msg": "ok", "received": json.loads(body) if body else None})

    def _json(self, status: int, data: dict) -> None:
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *_a: object) -> None:
        pass


@pytest.fixture(scope="module")
def async_http_server():
    srv = HTTPServer(("127.0.0.1", 0), _Handler)
    host, port = srv.server_address
    url = f"http://{host}:{port}"
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield url
    srv.shutdown()


# ── Helpers ──────────────────────────────────────────────────────────────────


def _policy_input(*, pass_: bool = True) -> VerifierInput:
    policies = [
        {"rule_id": "max_amount", "field": "amount", "operator": "lte", "value": 100},
    ]
    actions = [{"type": "refund", "amount": 50 if pass_ else 200}]
    return VerifierInput(
        completions=["done"],
        ground_truth={"policies": policies, "actions": actions},
    )


# ══════════════════════════════════════════════════════════════════════════════
# BaseVerifier.async_verify
# ══════════════════════════════════════════════════════════════════════════════


class TestAsyncVerify:
    @pytest.mark.asyncio
    async def test_async_verify_pass(self):
        v = ConstraintNotViolatedVerifier()
        results = await v.async_verify(_policy_input(pass_=True))
        assert len(results) == 1
        assert results[0].verdict == Verdict.PASS
        assert results[0].score == 1.0

    @pytest.mark.asyncio
    async def test_async_verify_fail(self):
        v = ConstraintNotViolatedVerifier()
        results = await v.async_verify(_policy_input(pass_=False))
        assert results[0].verdict == Verdict.FAIL

    @pytest.mark.asyncio
    async def test_async_verify_multiple_completions(self):
        v = ConstraintNotViolatedVerifier()
        inp = VerifierInput(
            completions=["first", "second", "third"],
            ground_truth={
                "policies": [
                    {"rule_id": "cap", "field": "amount", "operator": "lte", "value": 10},
                ],
                "actions": [{"type": "buy", "amount": 5}],
            },
        )
        results = await v.async_verify(inp)
        assert len(results) == 3
        assert all(r.verdict == Verdict.PASS for r in results)

    @pytest.mark.asyncio
    async def test_async_verify_preserves_metadata(self):
        v = ConstraintNotViolatedVerifier()
        results = await v.async_verify(_policy_input(pass_=True))
        assert results[0].provenance.source_benchmark == "τ²-bench"
        assert results[0].metadata.execution_ms >= 0


# ══════════════════════════════════════════════════════════════════════════════
# async_http_get / async_http_post
# ══════════════════════════════════════════════════════════════════════════════


class TestAsyncHttpGet:
    @pytest.mark.asyncio
    async def test_pass(self, async_http_server):
        r = await async_http_get(f"{async_http_server}/ok")
        assert r["verdict"] == Verdict.PASS
        assert r["status_code"] == 200

    @pytest.mark.asyncio
    async def test_error_on_bad_host(self):
        r = await async_http_get("http://127.0.0.1:1/nope", timeout=1.0)
        assert r["verdict"] == Verdict.ERROR


class TestAsyncHttpPost:
    @pytest.mark.asyncio
    async def test_pass(self, async_http_server):
        r = await async_http_post(f"{async_http_server}/ok", json_body={"k": "v"})
        assert r["verdict"] == Verdict.PASS
        assert r["status_code"] == 200

    @pytest.mark.asyncio
    async def test_error_on_bad_host(self):
        r = await async_http_post("http://127.0.0.1:1/nope", timeout=1.0)
        assert r["verdict"] == Verdict.ERROR
