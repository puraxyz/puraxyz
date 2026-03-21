"""Tests for runners/http.py - sandboxed HTTP client.

Covers GET/POST happy paths (2xx/4xx/5xx), timeout, connection errors,
body truncation, and the no-httpx fallback helper.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

import httpx
import pytest

from vrdev.core.types import Verdict
from vrdev.runners.http import _no_httpx_error, http_get, http_post


# ── Embedded HTTP mock ───────────────────────────────────────────────────────


class _Handler(BaseHTTPRequestHandler):
    """Minimal handler for runner unit tests."""

    def do_GET(self) -> None:
        path = self.path.split("?")[0]
        if path == "/ok":
            self._json(200, {"msg": "ok"})
        elif path == "/not-found":
            self._json(404, {"error": "not found"})
        elif path == "/large":
            # 20 KB body - runner should truncate to 10 KB
            self._json(200, {"data": "x" * 20_000})
        elif path == "/server-error":
            self._json(500, {"error": "internal server error"})
        else:
            self._json(404, {"error": "unknown"})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""
        path = self.path.split("?")[0]
        if path == "/ok":
            received = json.loads(body) if body else None
            self._json(200, {"msg": "ok", "received": received})
        elif path == "/server-error":
            self._json(500, {"error": "internal server error"})
        else:
            self._json(404, {"error": "unknown"})

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
def http_server():
    """Module-scoped throwaway HTTP server on an auto-assigned port."""
    srv = HTTPServer(("127.0.0.1", 0), _Handler)
    host, port = srv.server_address
    url = f"http://{host}:{port}"
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    yield url
    srv.shutdown()


# ══════════════════════════════════════════════════════════════════════════════
# http_get
# ══════════════════════════════════════════════════════════════════════════════


class TestHttpGet:
    def test_pass_on_2xx(self, http_server):
        r = http_get(f"{http_server}/ok")
        assert r["verdict"] == Verdict.PASS
        assert r["status_code"] == 200
        assert r["error"] is None

    def test_fail_on_404(self, http_server):
        r = http_get(f"{http_server}/not-found")
        assert r["verdict"] == Verdict.FAIL
        assert r["status_code"] == 404

    def test_fail_on_500(self, http_server):
        r = http_get(f"{http_server}/server-error")
        assert r["verdict"] == Verdict.FAIL
        assert r["status_code"] == 500

    def test_body_truncated_to_10kb(self, http_server):
        r = http_get(f"{http_server}/large")
        assert r["verdict"] == Verdict.PASS
        assert len(r["body"]) <= 10_240

    def test_response_fields(self, http_server):
        r = http_get(f"{http_server}/ok")
        assert isinstance(r["headers"], dict)
        assert "content-type" in r["headers"]
        assert '"msg"' in r["body"]

    def test_error_on_timeout(self):
        with patch("httpx.get", side_effect=httpx.TimeoutException("timed out")):
            r = http_get("http://example.com/slow")
        assert r["verdict"] == Verdict.ERROR
        assert "timed out" in r["error"]

    def test_error_on_connect_failure(self):
        r = http_get("http://127.0.0.1:1/nope", timeout=1.0)
        assert r["verdict"] == Verdict.ERROR
        assert r["error"] is not None


# ══════════════════════════════════════════════════════════════════════════════
# http_post
# ══════════════════════════════════════════════════════════════════════════════


class TestHttpPost:
    def test_pass_on_2xx(self, http_server):
        r = http_post(f"{http_server}/ok", json_body={"key": "val"})
        assert r["verdict"] == Verdict.PASS
        assert r["status_code"] == 200

    def test_fail_on_500(self, http_server):
        r = http_post(f"{http_server}/server-error")
        assert r["verdict"] == Verdict.FAIL
        assert r["status_code"] == 500

    def test_error_on_timeout(self):
        with patch("httpx.post", side_effect=httpx.TimeoutException("timed out")):
            r = http_post("http://example.com/slow")
        assert r["verdict"] == Verdict.ERROR
        assert "timed out" in r["error"]

    def test_error_on_connect_failure(self):
        r = http_post("http://127.0.0.1:1/nope", timeout=1.0)
        assert r["verdict"] == Verdict.ERROR
        assert r["error"] is not None


# ══════════════════════════════════════════════════════════════════════════════
# No-httpx fallback
# ══════════════════════════════════════════════════════════════════════════════


class TestNoHttpx:
    def test_error_shape(self):
        err = _no_httpx_error()
        assert err["verdict"] == Verdict.ERROR
        assert err["status_code"] is None
        assert err["body"] is None
        assert "httpx not installed" in err["error"]
