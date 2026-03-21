"""τ²-bench independent mock server for testing.

Provides a session-scoped pytest fixture that spins up a lightweight HTTP
server on an auto-assigned port. Exposes canned retail and airline API
responses per ADR-006 (independent mocks, not vendored τ²-bench).

API contracts:
    GET /orders/{order_id}     → Order state (retail)
    GET /bookings/{booking_id} → Booking state (airline)
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

# ── Canned data ──────────────────────────────────────────────────────────────

ORDERS: dict[str, dict] = {
    "ORD-001": {
        "order_id": "ORD-001",
        "status": "cancelled",
        "reason": "customer_request",
        "customer_id": "C-100",
    },
    "ORD-002": {
        "order_id": "ORD-002",
        "status": "active",
        "reason": None,
        "customer_id": "C-200",
    },
    "ORD-003": {
        "order_id": "ORD-003",
        "status": "cancelled",
        "reason": "duplicate_order",
        "customer_id": "C-300",
    },
    "ORD-004": {
        "order_id": "ORD-004",
        "status": "pending",
        "reason": None,
        "customer_id": "C-400",
    },
}

BOOKINGS: dict[str, dict] = {
    "BK-001": {
        "booking_id": "BK-001",
        "date": "2026-04-15",
        "cabin_class": "business",
        "passengers": 2,
        "status": "confirmed",
    },
    "BK-002": {
        "booking_id": "BK-002",
        "date": "2026-03-10",
        "cabin_class": "economy",
        "passengers": 1,
        "status": "confirmed",
    },
    "BK-003": {
        "booking_id": "BK-003",
        "date": "2026-05-01",
        "cabin_class": "first",
        "passengers": 3,
        "status": "confirmed",
    },
}

REFUNDS: dict[str, dict] = {
    "RF-001": {
        "refund_id": "RF-001",
        "order_id": "ORD-001",
        "status": "processed",
        "amount": 49.99,
        "reason": "customer_request",
    },
    "RF-002": {
        "refund_id": "RF-002",
        "order_id": "ORD-002",
        "status": "pending",
        "amount": 129.00,
        "reason": "defective_item",
    },
    "RF-003": {
        "refund_id": "RF-003",
        "order_id": "ORD-003",
        "status": "processed",
        "amount": 25.50,
        "reason": "duplicate_order",
    },
    "RF-004": {
        "refund_id": "RF-004",
        "order_id": "ORD-004",
        "status": "denied",
        "amount": 0.0,
        "reason": "policy_violation",
    },
}

INVENTORY: dict[str, dict] = {
    "SKU-100": {
        "sku": "SKU-100",
        "name": "Widget A",
        "quantity": 42,
        "warehouse": "WH-EAST",
    },
    "SKU-200": {
        "sku": "SKU-200",
        "name": "Widget B",
        "quantity": 0,
        "warehouse": "WH-WEST",
    },
    "SKU-300": {
        "sku": "SKU-300",
        "name": "Gadget C",
        "quantity": 150,
        "warehouse": "WH-EAST",
    },
}


# ── Handler ──────────────────────────────────────────────────────────────────


class Tau2MockHandler(BaseHTTPRequestHandler):
    """Minimal HTTP handler returning canned JSON for τ²-bench API contracts."""

    def do_GET(self) -> None:
        path = self.path.rstrip("/")

        if path.startswith("/orders/"):
            order_id = path.split("/")[-1]
            if order_id in ORDERS:
                self._json_response(200, ORDERS[order_id])
            else:
                self._json_response(404, {"error": f"Order {order_id} not found"})

        elif path.startswith("/bookings/"):
            booking_id = path.split("/")[-1]
            if booking_id in BOOKINGS:
                self._json_response(200, BOOKINGS[booking_id])
            else:
                self._json_response(404, {"error": f"Booking {booking_id} not found"})

        elif path.startswith("/refunds/"):
            refund_id = path.split("/")[-1]
            if refund_id in REFUNDS:
                self._json_response(200, REFUNDS[refund_id])
            else:
                self._json_response(404, {"error": f"Refund {refund_id} not found"})

        elif path.startswith("/inventory/"):
            sku = path.split("/")[-1]
            if sku in INVENTORY:
                self._json_response(200, INVENTORY[sku])
            else:
                self._json_response(404, {"error": f"SKU {sku} not found"})

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
        pass  # Suppress request logging during tests


# ── Pytest fixtures ──────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def tau2_server():
    """Session-scoped mock τ²-bench API server on an auto-assigned port.

    Yields the base URL, e.g. ``http://127.0.0.1:54321``.
    """
    server = HTTPServer(("127.0.0.1", 0), Tau2MockHandler)
    host, port = server.server_address
    base_url = f"http://{host}:{port}"

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield base_url

    server.shutdown()
