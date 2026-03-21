"""Connection-pooled IMAP runner for managed deployments.

Wraps :class:`IMAPRunner` with a bounded pool so that multiple concurrent
verifications share a fixed number of IMAP connections rather than opening
(and tearing down) one connection per verification.
"""

from __future__ import annotations

import threading
from collections import deque

from ..core.types import Verdict
from .imap import IMAPRunner


class ManagedIMAPRunner:
    """Pool of :class:`IMAPRunner` instances with bounded concurrency.

    Parameters
    ----------
    host, port, username, password, use_ssl, timeout
        Forwarded to each pooled :class:`IMAPRunner`.
    pool_size : int
        Maximum number of concurrent IMAP connections (default ``3``).
    """

    def __init__(
        self,
        host: str,
        port: int = 993,
        username: str = "",
        password: str = "",
        use_ssl: bool = True,
        timeout: float = 15.0,
        pool_size: int = 3,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_ssl = use_ssl
        self.timeout = timeout
        self.pool_size = pool_size

        self._pool: deque[IMAPRunner] = deque()
        self._semaphore = threading.Semaphore(pool_size)
        self._lock = threading.Lock()

    def _get_runner(self) -> IMAPRunner:
        """Acquire a runner from the pool or create a new one."""
        with self._lock:
            if self._pool:
                return self._pool.popleft()
        runner = IMAPRunner(
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            use_ssl=self.use_ssl,
            timeout=self.timeout,
        )
        runner.connect()
        return runner

    def _return_runner(self, runner: IMAPRunner) -> None:
        """Return a runner to the pool."""
        with self._lock:
            if len(self._pool) < self.pool_size:
                self._pool.append(runner)
            else:
                runner.disconnect()

    def search_sent(
        self,
        recipient: str | None = None,
        subject_fragment: str | None = None,
        window_minutes: int = 10,
        folder: str = "Sent",
    ) -> dict:
        """Acquire a pooled connection, search, then release.

        Returns the same dict shape as :meth:`IMAPRunner.search_sent`.
        """
        self._semaphore.acquire()
        try:
            runner = self._get_runner()
            try:
                result = runner.search_sent(
                    recipient=recipient,
                    subject_fragment=subject_fragment,
                    window_minutes=window_minutes,
                    folder=folder,
                )
                self._return_runner(runner)
                return result
            except Exception as exc:
                runner.disconnect()
                return {
                    "verdict": Verdict.ERROR,
                    "error": f"IMAP pool error: {exc}",
                    "message_id": None,
                    "search_query": "",
                    "folder": folder,
                    "messages_checked": 0,
                }
        finally:
            self._semaphore.release()

    def close_all(self) -> None:
        """Disconnect every pooled runner."""
        with self._lock:
            while self._pool:
                runner = self._pool.popleft()
                runner.disconnect()

    @property
    def active_connections(self) -> int:
        """Number of connections currently in the pool."""
        with self._lock:
            return len(self._pool)

    def __enter__(self) -> ManagedIMAPRunner:
        return self

    def __exit__(self, *args: object) -> None:
        self.close_all()
