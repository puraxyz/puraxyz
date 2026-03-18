# Mandalay

Capacity-routed LLM API gateway powered by [Backproto](https://backproto.io) on Base.

Routes chat completions across OpenAI and Anthropic based on on-chain capacity weights from a BackpressurePool. Serves as a reference implementation — customer #1 for the protocol.

See [BUSINESSPLAN.md](BUSINESSPLAN.md) for the full user journey, revenue model, and fork-and-deploy guide.

## How it works

```
POST /api/chat (API key + messages)
  → Read capacity from BackpressurePool
  → Route to provider with most spare capacity
  → Stream response back (OpenAI-compatible SSE)
  → Record completion receipt on-chain
  → Rebalance pool weights if threshold crossed
```

Two LLM providers are registered as **sinks** in a BackpressurePool:
- **OpenAI** (gpt-4o)
- **Anthropic** (claude-sonnet)

Each has capacity tracked via CapacityRegistry. Completions go through CompletionTracker. Pricing follows the PricingCurve.

## Quick start

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env
# Fill in: OPENAI_API_KEY, ANTHROPIC_API_KEY, OPERATOR_PRIVATE_KEY

# Build SDK (from repo root)
cd ../sdk && npm run build && cd ../gateway

# Sync local SDK
npm run sync-sdk

# Run setup (register sinks + create pool — once)
npm run setup

# Start dev server
npm run dev
```

## API

### `POST /api/keys`

Generate an API key.

```bash
curl -X POST http://localhost:3100/api/keys \
  -H "Content-Type: application/json" \
  -d '{"label": "my-app"}'
```

### `POST /api/chat`

OpenAI-compatible chat completions endpoint.

```bash
curl -X POST http://localhost:3100/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer bp_..." \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

**Routing:** Provider is selected automatically based on pool capacity. Optionally pass `"model": "gpt-4o"` or `"model": "claude-sonnet-4-20250514"` to override.

**Free tier:** 100 requests per key. After that, link a wallet:

```bash
curl -X POST http://localhost:3100/api/wallet \
  -H "Authorization: Bearer bp_..." \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0x..."}'
```

### `GET /api/state`

Pool state, provider capacity, key stats.

## Architecture

```
gateway/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Main endpoint
│   │   ├── keys/route.ts      # Key generation
│   │   ├── state/route.ts     # Pool state
│   │   └── wallet/route.ts    # Link wallet
│   ├── page.tsx               # Dashboard
│   └── layout.tsx             # Root layout
├── lib/
│   ├── auth.ts                # API key validation + free tier check
│   ├── chain.ts               # Viem clients (Base Sepolia)
│   ├── completion.ts          # Record completions on-chain
│   ├── keys.ts                # Key storage (JSON file for MVP)
│   ├── providers.ts           # Provider config
│   ├── providers/
│   │   ├── openai.ts          # OpenAI streaming via fetch
│   │   └── anthropic.ts       # Anthropic streaming → OpenAI SSE format
│   ├── rebalance.ts           # Trigger pool rebalance
│   ├── routing.ts             # Capacity-based provider selection
│   └── stream.ts              # Unified stream interface
└── scripts/
    └── setup.ts               # Register sinks + create pool
```

## On-chain integration

The gateway uses these Backproto contracts on Base Sepolia:

| Contract | Purpose |
|----------|---------|
| BackpressurePool | Capacity-weighted provider routing |
| CapacityRegistry | Per-provider capacity tracking |
| CompletionTracker | On-chain completion receipts |
| PricingCurve | Dynamic pricing based on utilization |

## License

MIT — see root [LICENSE](../LICENSE).
