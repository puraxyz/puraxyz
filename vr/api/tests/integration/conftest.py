"""Fixtures for integration tests - mock τ²-bench server + latency benchmarking.

The ``mock_tau2_url`` fixture spins up the standalone FastAPI mock server
on an auto-assigned port using uvicorn in a background thread.

The ``benchmark_results`` fixture collects per-test timing data and writes
a JSON summary artifact at the end of the session.
"""

from __future__ import annotations

import json
import socket
import threading
import time
from pathlib import Path
from typing import Any

import pytest
import uvicorn

from mock_tau2.app import app as tau2_app


# ── Mock τ²-bench server fixture ─────────────────────────────────────────────


def _find_free_port() -> int:
    """Find a free TCP port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def mock_tau2_url():
    """Session-scoped FastAPI mock server on an auto-assigned port.

    Yields the base URL, e.g. ``http://127.0.0.1:54321``.
    """
    port = _find_free_port()
    config = uvicorn.Config(
        tau2_app,
        host="127.0.0.1",
        port=port,
        log_level="error",
    )
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Wait for server to be ready
    base_url = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            import httpx

            resp = httpx.get(f"{base_url}/health", timeout=1.0)
            if resp.status_code == 200:
                break
        except Exception:
            time.sleep(0.1)
    else:
        raise RuntimeError(f"Mock τ²-bench server failed to start on {base_url}")

    yield base_url

    server.should_exit = True
    thread.join(timeout=5)


# ── Latency benchmarking ─────────────────────────────────────────────────────


class BenchmarkCollector:
    """Collects per-test timing data during a session."""

    def __init__(self) -> None:
        self.results: list[dict[str, Any]] = []

    def record(self, test_name: str, verifier_id: str, latency_ms: float) -> None:
        self.results.append({
            "test": test_name,
            "verifier_id": verifier_id,
            "latency_ms": round(latency_ms, 2),
        })

    def summary(self) -> dict[str, Any]:
        """Aggregate per-verifier stats."""
        from collections import defaultdict

        by_verifier: dict[str, list[float]] = defaultdict(list)
        for r in self.results:
            by_verifier[r["verifier_id"]].append(r["latency_ms"])

        verifier_stats = {}
        for vid, latencies in sorted(by_verifier.items()):
            latencies.sort()
            n = len(latencies)
            verifier_stats[vid] = {
                "count": n,
                "min_ms": latencies[0],
                "max_ms": latencies[-1],
                "mean_ms": round(sum(latencies) / n, 2),
                "p50_ms": latencies[n // 2],
                "p95_ms": latencies[int(n * 0.95)] if n >= 20 else latencies[-1],
            }

        return {
            "total_tests": len(self.results),
            "verifiers": verifier_stats,
            "all_results": self.results,
        }


@pytest.fixture(scope="session")
def benchmark_collector():
    """Session-scoped benchmark data collector."""
    return BenchmarkCollector()


@pytest.fixture(autouse=True, scope="session")
def _write_benchmark_artifact(benchmark_collector):
    """Write benchmark JSON artifact after all tests complete."""
    yield

    if not benchmark_collector.results:
        return

    summary = benchmark_collector.summary()
    artifact_path = Path(__file__).parent / "benchmark_results.json"
    artifact_path.write_text(json.dumps(summary, indent=2) + "\n")

    # Print summary to stdout for CI visibility
    print("\n\n=== Latency Benchmark Summary ===")
    for vid, stats in summary["verifiers"].items():
        print(f"  {vid}: mean={stats['mean_ms']:.1f}ms  p50={stats['p50_ms']:.1f}ms"
              f"  min={stats['min_ms']:.1f}ms  max={stats['max_ms']:.1f}ms  n={stats['count']}")
    print(f"  Total: {summary['total_tests']} measurements")
    print("=================================\n")
