"""Mock IMAP runner for testing the email verifier without a real mail server.

``MockIMAPRunner`` implements the same interface as ``IMAPRunner`` but returns
preconfigured results.
"""

from __future__ import annotations

from vrdev.core.types import Verdict


class MockIMAPRunner:
    """Drop-in replacement for IMAPRunner in tests.

    Parameters
    ----------
    emails : list[dict]
        Each dict has ``recipient``, ``subject``, ``message_id``.
        The search will match against these entries.
    connect_error : str | None
        If set, ``connect()`` returns ERROR with this message.
    """

    def __init__(
        self,
        emails: list[dict] | None = None,
        connect_error: str | None = None,
    ):
        self.emails = emails or []
        self.connect_error = connect_error
        self._connected = False

    def connect(self) -> dict:
        if self.connect_error:
            return {
                "verdict": Verdict.ERROR,
                "error": self.connect_error,
                "connected": False,
            }
        self._connected = True
        return {"verdict": Verdict.PASS, "error": None, "connected": True}

    def search_sent(
        self,
        recipient: str | None = None,
        subject_fragment: str | None = None,
        window_minutes: int = 10,
        folder: str = "Sent",
    ) -> dict:
        if not self._connected:
            return {
                "verdict": Verdict.ERROR,
                "error": "Not connected",
                "message_id": None,
                "search_query": "",
                "folder": folder,
                "messages_checked": 0,
            }

        # Search through mock emails
        query_parts = []
        if recipient:
            query_parts.append(f'TO "{recipient}"')
        if subject_fragment:
            query_parts.append(f'SUBJECT "{subject_fragment}"')
        search_query = " ".join(query_parts)

        for email in self.emails:
            match = True
            if recipient and email.get("recipient") != recipient:
                match = False
            if subject_fragment and subject_fragment not in email.get("subject", ""):
                match = False
            if match:
                return {
                    "verdict": Verdict.PASS,
                    "error": None,
                    "message_id": email.get("message_id", "<mock@test>"),
                    "search_query": search_query,
                    "folder": folder,
                    "messages_checked": len(self.emails),
                }

        return {
            "verdict": Verdict.FAIL,
            "error": None,
            "message_id": None,
            "search_query": search_query,
            "folder": folder,
            "messages_checked": len(self.emails),
        }

    def disconnect(self) -> None:
        self._connected = False

    def __enter__(self) -> MockIMAPRunner:
        self.connect()
        return self

    def __exit__(self, *args: object) -> None:
        self.disconnect()
