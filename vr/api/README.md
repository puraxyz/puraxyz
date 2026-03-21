# vr-api: Hosted Verification Service

Live at **api.vr.dev** (Railway). Wraps the `vrdev` Python SDK in a FastAPI service
with authentication, rate limiting, evidence persistence, and usage tracking.

## Architecture

Zero verifier logic lives here. The API wraps `packages/vrdev/` and adds infrastructure
concerns. The same verifier code runs locally (free, `pip install vrdev`) and through
the hosted API (metered). This ensures parity.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/verify` | Single verifier execution |
| POST | `/v1/compose` | Compose multiple verifiers with policy modes |
| POST | `/v1/batch` | Batch verification (multiple inputs) |
| POST | `/v1/verify/step` | Progressive step-level trajectory verification |
| POST | `/v1/verify/stream` | SSE streaming for full trajectory data |
| GET | `/v1/estimate` | Cost preview before running verification |
| POST | `/v1/export` | Export results to TRL/VERL/JSONL format |
| GET | `/v1/registry` | List all available verifiers |
| GET | `/v1/evidence/{hash}/proof` | Retrieve Merkle inclusion proof |
| GET | `/v1/keys` | Current Ed25519 public signing key |

## Features

- **Auth**: API key via `X-API-Key` header. Keys provisioned through vr.dev dashboard.
- **Rate limiting**: Sliding window per key, limits in `X-RateLimit-*` response headers.
- **Evidence signing**: Ed25519 signatures on every verification result.
- **Merkle anchoring**: Batch evidence hashes into Merkle trees, anchor roots on Base L2.
- **Step verification**: Submit agent steps progressively with `X-Session-ID`. Hard gate
  failures halt the trajectory mid-execution.
- **Budget-aware escalation**: `policy_mode: "escalation"` runs cheap HARD checks first,
  skips expensive tiers on failure or budget exhaustion. Every result includes `cost_usd`.
- **Dashboard analytics**: Agent tracking via `X-Agent-Name`/`X-Agent-Framework` headers.
  Pass rates, latency, verifier heatmaps, per-agent breakdowns.

## Local Development

```bash
docker compose up        # Postgres + Redis + API
# or
pip install -e ".[dev]"
uvicorn vr_api.app:app --reload
```

## Tests

```bash
cd packages/vr-api
python -m pytest tests/ --ignore=tests/integration -v
# 160+ tests
```

## Dependencies

- **vrdev SDK** (`>=0.3.0`): all verifier logic
- **FastAPI + SQLAlchemy async**: web layer + persistence
- **cryptography**: Ed25519 signing
- Optional: `web3` (Merkle anchoring), `redis` (rate limiting), `otel` (tracing)
