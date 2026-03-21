"""Telecom CRM mock server for testing PlanChangedVerifier.

Provides canned customer data on ``GET /customers/{customer_id}``.
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

# ── Canned data ──────────────────────────────────────────────────────────────

CUSTOMERS: dict[str, dict] = {
    "TEL-001": {
        "customer_id": "TEL-001",
        "name": "Alice Johnson",
        "current_plan": "Premium Unlimited",
        "previous_plan": "Basic 5GB",
        "effective_date": "2026-03-01",
        "status": "active",
    },
    "TEL-002": {
        "customer_id": "TEL-002",
        "name": "Bob Smith",
        "current_plan": "Basic 5GB",
        "previous_plan": "Basic 5GB",
        "effective_date": "2025-01-15",
        "status": "active",
    },
    "TEL-003": {
        "customer_id": "TEL-003",
        "name": "Carol Davis",
        "current_plan": "Family Share 20GB",
        "previous_plan": "Premium Unlimited",
        "effective_date": "2026-02-20",
        "status": "active",
    },
    "TEL-004": {
        "customer_id": "TEL-004",
        "name": "Dave Wilson",
        "current_plan": "Basic 5GB",
        "previous_plan": None,
        "effective_date": None,
        "status": "suspended",
    },
}


class TelecomHandler(BaseHTTPRequestHandler):
    """Mock Telecom CRM API handler."""

    def do_GET(self) -> None:
        path = self.path.rstrip("/")
        if path.startswith("/customers/"):
            customer_id = path.split("/")[-1]
            if customer_id in CUSTOMERS:
                self._json_response(200, CUSTOMERS[customer_id])
            else:
                self._json_response(
                    404, {"error": f"Customer {customer_id} not found"}
                )
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
def telecom_server():
    """Session-scoped mock Telecom CRM server on auto-assigned port.

    Yields the base URL, e.g. ``http://127.0.0.1:54324``.
    """
    server = HTTPServer(("127.0.0.1", 0), TelecomHandler)
    host, port = server.server_address
    base_url = f"http://{host}:{port}"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield base_url
    server.shutdown()
