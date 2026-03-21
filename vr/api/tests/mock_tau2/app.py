"""Standalone τ²-bench mock server - FastAPI implementation.

Serves canned airline, retail, telecom, and calendar API responses matching
the ground_truth schemas expected by all 5 HTTP-based τ²-bench verifiers:

- ``vr/tau2.airline.rebooking_correct``  →  GET /bookings/{id}
- ``vr/tau2.retail.order_cancelled``     →  GET /orders/{id}
- ``vr/tau2.retail.refund_processed``    →  GET /refunds/{id}
- ``vr/tau2.retail.inventory_updated``   →  GET /inventory/{sku}
- ``vr/tau2.telecom.plan_changed``       →  GET /customers/{id}

Run standalone::

    uvicorn mock_tau2.app:app --port 8080

Or use via the ``mock_tau2_url`` pytest fixture (see conftest).
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="τ²-bench Mock Server",
    description="Canned API responses for integration testing",
    version="1.0.0",
)


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

CUSTOMERS: dict[str, dict] = {
    "TEL-001": {
        "customer_id": "TEL-001",
        "name": "Alice Premium",
        "current_plan": "Premium Unlimited",
        "data_limit_gb": 999,
        "status": "active",
    },
    "TEL-002": {
        "customer_id": "TEL-002",
        "name": "Bob Basic",
        "current_plan": "Basic 5GB",
        "data_limit_gb": 5,
        "status": "active",
    },
    "TEL-003": {
        "customer_id": "TEL-003",
        "name": "Carol Family",
        "current_plan": "Family Share 20GB",
        "data_limit_gb": 20,
        "status": "active",
    },
    "TEL-004": {
        "customer_id": "TEL-004",
        "name": "Dave Suspended",
        "current_plan": "Basic 5GB",
        "data_limit_gb": 5,
        "status": "suspended",
    },
}

EVENTS: dict[str, dict] = {
    "EVT-001": {
        "event_id": "EVT-001",
        "title": "Team standup",
        "date": "2026-03-15",
        "time": "09:00",
        "attendees": ["alice@example.com", "bob@example.com"],
    },
    "EVT-002": {
        "event_id": "EVT-002",
        "title": "Quarterly review",
        "date": "2026-03-20",
        "time": "14:00",
        "attendees": ["alice@example.com"],
    },
}


# ── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tau2-mock"}


# Retail domain
@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    if order_id not in ORDERS:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return ORDERS[order_id]


@app.get("/refunds/{refund_id}")
async def get_refund(refund_id: str):
    if refund_id not in REFUNDS:
        raise HTTPException(status_code=404, detail=f"Refund {refund_id} not found")
    return REFUNDS[refund_id]


@app.get("/inventory/{sku}")
async def get_inventory(sku: str):
    if sku not in INVENTORY:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")
    return INVENTORY[sku]


# Airline domain
@app.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    if booking_id not in BOOKINGS:
        raise HTTPException(status_code=404, detail=f"Booking {booking_id} not found")
    return BOOKINGS[booking_id]


# Telecom domain
@app.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    if customer_id not in CUSTOMERS:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    return CUSTOMERS[customer_id]


# Calendar domain
@app.get("/events/{event_id}")
async def get_event(event_id: str):
    if event_id not in EVENTS:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return EVENTS[event_id]


@app.get("/events")
async def search_events(title: str | None = None):
    """Search events by title (substring match)."""
    results = list(EVENTS.values())
    if title:
        results = [e for e in results if title.lower() in e["title"].lower()]
    return {"events": results, "count": len(results)}
