"""WebArena-style mock e-commerce server for testing OrderPlacedVerifier.

Provides canned order data on ``GET /orders/{order_id}``.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

# ── Canned data ──────────────────────────────────────────────────────────────

ORDERS: dict[str, dict] = {
    "WEB-001": {
        "order_id": "WEB-001",
        "status": "confirmed",
        "items": ["Widget A", "Widget B"],
        "total": 49.98,
        "customer_id": "C-100",
    },
    "WEB-002": {
        "order_id": "WEB-002",
        "status": "confirmed",
        "items": ["Gadget X"],
        "total": 129.99,
        "customer_id": "C-200",
    },
    "WEB-003": {
        "order_id": "WEB-003",
        "status": "cancelled",
        "items": ["Widget A"],
        "total": 24.99,
        "customer_id": "C-300",
    },
    "WEB-004": {
        "order_id": "WEB-004",
        "status": "placed",
        "items": ["Mega Pack", "Widget A", "Gadget X"],
        "total": 299.97,
        "customer_id": "C-400",
    },
}


class WebArenaHandler(BaseHTTPRequestHandler):
    """Mock WebArena e-commerce API handler."""

    def do_GET(self) -> None:
        path = self.path.rstrip("/")
        if path.startswith("/orders/"):
            order_id = path.split("/")[-1]
            if order_id in ORDERS:
                self._json_response(200, ORDERS[order_id])
            else:
                self._json_response(404, {"error": f"Order {order_id} not found"})
        else:
            self._json_response(404, {"error": "Not found"})

    def _json_response(self, status: int, data: dict) -> None:
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        pass


@pytest.fixture(scope="session")
def webarena_server():
    """Session-scoped mock WebArena API server on auto-assigned port.

    Yields the base URL, e.g. ``http://127.0.0.1:54322``.
    """
    server = HTTPServer(("127.0.0.1", 0), WebArenaHandler)
    host, port = server.server_address
    base_url = f"http://{host}:{port}"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield base_url
    server.shutdown()
