"""Managed IMAP connection for agentic email verification.

Distinguishes between:
- verdict=FAIL → message not found (agent failure)
- verdict=ERROR → infrastructure/credentials/timeout issue (not agent's fault)
"""

from __future__ import annotations

import imaplib
from datetime import datetime, timedelta, timezone

from ..core.types import Verdict


class IMAPRunner:
    """IMAP connection manager for email verification.

    Implements the VAGEN "latent state" insight: the email appearing to send
    in the UI does not mean it actually sent. This runner checks the real
    IMAP Sent folder state.
    """

    def __init__(
        self,
        host: str,
        port: int = 993,
        username: str = "",
        password: str = "",
        use_ssl: bool = True,
        timeout: float = 15.0,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.timeout = timeout
        self._connection: imaplib.IMAP4_SSL | imaplib.IMAP4 | None = None

    def connect(self) -> dict:
        """Establish IMAP connection.

        Returns
        -------
        dict
            ``verdict``, ``error``, ``connected`` status.
        """
        try:
            if self.use_ssl:
                self._connection = imaplib.IMAP4_SSL(self.host, self.port)
            else:
                self._connection = imaplib.IMAP4(self.host, self.port)

            self._connection.socket().settimeout(self.timeout)
            self._connection.login(self.username, self.password)

            return {"verdict": Verdict.PASS, "error": None, "connected": True}
        except imaplib.IMAP4.error as exc:
            return {
                "verdict": Verdict.ERROR,
                "error": f"IMAP authentication failed: {exc}",
                "connected": False,
            }
        except (ConnectionError, TimeoutError, OSError) as exc:
            return {
                "verdict": Verdict.ERROR,
                "error": f"IMAP connection failed: {exc}",
                "connected": False,
            }

    def search_sent(
        self,
        recipient: str | None = None,
        subject_fragment: str | None = None,
        window_minutes: int = 10,
        folder: str = "Sent",
    ) -> dict:
        """Search for a message in the specified folder.

        Returns
        -------
        dict
            ``verdict`` (PASS/FAIL/ERROR), ``message_id``, ``search_query``,
            ``folder``, ``messages_checked``.
        """
        if self._connection is None:
            return {
                "verdict": Verdict.ERROR,
                "error": "Not connected. Call connect() first.",
                "message_id": None,
                "search_query": "",
                "folder": folder,
                "messages_checked": 0,
            }

        try:
            status, _ = self._connection.select(folder, readonly=True)
            if status != "OK":
                return {
                    "verdict": Verdict.ERROR,
                    "error": f"Could not select folder '{folder}'",
                    "message_id": None,
                    "search_query": "",
                    "folder": folder,
                    "messages_checked": 0,
                }

            # Build search criteria
            criteria_parts: list[str] = []
            since_date = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
            date_str = since_date.strftime("%d-%b-%Y")
            criteria_parts.append(f"SINCE {date_str}")

            if recipient:
                criteria_parts.append(f'TO "{recipient}"')
            if subject_fragment:
                criteria_parts.append(f'SUBJECT "{subject_fragment}"')

            search_query = " ".join(criteria_parts)
            status, data = self._connection.search(None, *criteria_parts)

            if status != "OK" or not data or not data[0]:
                return {
                    "verdict": Verdict.FAIL,
                    "error": None,
                    "message_id": None,
                    "search_query": search_query,
                    "folder": folder,
                    "messages_checked": 0,
                }

            message_ids = data[0].split()

            if not message_ids:
                return {
                    "verdict": Verdict.FAIL,
                    "error": None,
                    "message_id": None,
                    "search_query": search_query,
                    "folder": folder,
                    "messages_checked": 0,
                }

            # Fetch the Message-ID header of the most recent match
            latest_id = message_ids[-1]
            status, msg_data = self._connection.fetch(
                latest_id, "(BODY[HEADER.FIELDS (MESSAGE-ID)])"
            )
            msg_id_str = None
            if status == "OK" and msg_data and msg_data[0] is not None:
                raw = msg_data[0]
                if isinstance(raw, tuple) and len(raw) > 1:
                    msg_id_str = raw[1].decode("utf-8", errors="replace").strip()

            return {
                "verdict": Verdict.PASS,
                "error": None,
                "message_id": msg_id_str,
                "search_query": search_query,
                "folder": folder,
                "messages_checked": len(message_ids),
            }

        except (imaplib.IMAP4.error, TimeoutError, OSError) as exc:
            return {
                "verdict": Verdict.ERROR,
                "error": f"IMAP search failed: {exc}",
                "message_id": None,
                "search_query": "",
                "folder": folder,
                "messages_checked": 0,
            }

    def disconnect(self) -> None:
        """Close the IMAP connection."""
        if self._connection:
            try:
                self._connection.logout()
            except Exception:
                pass
            self._connection = None

    def __enter__(self) -> IMAPRunner:
        self.connect()
        return self

    def __exit__(self, *args: object) -> None:
        self.disconnect()
