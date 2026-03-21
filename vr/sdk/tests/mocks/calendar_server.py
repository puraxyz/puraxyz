"""Calendar mock server for testing EventCreatedVerifier.

Provides canned event data on:
  GET /events/{event_id}
  GET /events?title=...
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

import pytest

# ── Canned data ──────────────────────────────────────────────────────────────

EVENTS: dict[str, dict] = {
    "EVT-001": {
        "event_id": "EVT-001",
        "title": "Team Standup",
        "date": "2026-04-15",
        "participants": ["alice@example.com", "bob@example.com"],
        "location": "Room 42",
    },
    "EVT-002": {
        "event_id": "EVT-002",
        "title": "Sprint Planning",
        "date": "2026-04-16",
        "participants": ["alice@example.com", "carol@example.com", "dave@example.com"],
        "location": "Virtual",
    },
    "EVT-003": {
        "event_id": "EVT-003",
        "title": "Client Review",
        "date": "2026-04-17",
        "participants": ["bob@example.com", "external@client.com"],
        "location": "Conference Room A",
    },
}


class CalendarHandler(BaseHTTPRequestHandler):
    """Mock CalDAV-like REST API handler."""

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = parse_qs(parsed.query)

        if path.startswith("/events/"):
            event_id = path.split("/")[-1]
            if event_id in EVENTS:
                self._json_response(200, EVENTS[event_id])
            else:
                self._json_response(404, {"error": f"Event {event_id} not found"})
        elif path == "/events":
            # Search by title
            title_query = query.get("title", [""])[0].lower()
            if title_query:
                matches = [
                    e for e in EVENTS.values()
                    if title_query in e["title"].lower()
                ]
                self._json_response(200, matches)
            else:
                self._json_response(200, list(EVENTS.values()))
        else:
            self._json_response(404, {"error": "Not found"})

    def _json_response(self, status: int, data: dict | list) -> None:
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        pass


@pytest.fixture(scope="session")
def calendar_server():
    """Session-scoped mock calendar API server on auto-assigned port.

    Yields the base URL, e.g. ``http://127.0.0.1:54323``.
    """
    server = HTTPServer(("127.0.0.1", 0), CalendarHandler)
    host, port = server.server_address
    base_url = f"http://{host}:{port}"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield base_url
    server.shutdown()
