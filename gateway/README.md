# Pura Gateway

LLM API gateway on [Pura](https://pura.xyz), deployed on Base.

Routes chat completions across OpenAI, Anthropic, Groq, and Gemini. A complexity scorer picks cheap models for simple tasks and premium models for hard ones. Capacity weights come from on-chain BackpressurePool contracts. This is the reference consumer of the protocol.

See [BUSINESSPLAN.md](BUSINESSPLAN.md) for the user flow, revenue model, and fork-and-deploy guide.

## How it works

```
POST /api/chat (API key + messages)
  → Score task complexity
  → Check provider quality scores
  → Route to best-fit model
  → Stream response back (OpenAI-compatible SSE)
  → Record completion receipt on-chain
  → Rebalance pool weights if threshold crossed
```

Four LLM providers are registered as sinks in a BackpressurePool:

- OpenAI (gpt-4o)
- Anthropic (claude-sonnet)
- Groq (llama-3.3-70b)
- Gemini (gemini-2.0-flash)

Each has capacity tracked via CapacityRegistry, completions recorded through CompletionTracker, and pricing set by PricingCurve.

## Quick start

```bash
npm install

cp .env.example .env
# Fill in: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, OPERATOR_PRIVATE_KEY

# Build SDK (from repo root)
cd ../sdk && npm run build && cd ../gateway

npm run sync-sdk
npm run setup    # register sinks + create pool (once)
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
  -H "Authorization: Bearer pura_..." \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

The provider is selected automatically based on complexity score and pool capacity. Pass `"model": "gpt-4o"` or `"model": "claude-sonnet-4-20250514"` to override.

5,000 free requests per key. After that, fund a Lightning wallet and pay per-request in sats:

```bash
curl -X POST http://localhost:3100/api/wallet/fund \
  -H "Authorization: Bearer pura_..." \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'
```

The funding response includes a BOLT11 `paymentRequest`, a public `invoiceUrl` with a QR code, and an authenticated `statusUrl` for settlement checks.

### `GET /api/state`

Pool state, provider capacity, key stats.

### `GET /api/income`

24h income summary for the authenticated key.

### `GET /api/report`

Cost breakdown by provider over the last 24 hours.

## Architecture

```
gateway/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Main endpoint
│   │   ├── keys/route.ts        # Key generation
│   │   ├── income/route.ts      # Income summary
│   │   ├── marketplace/         # Skill registration, listing, hiring, completion
│   │   ├── report/route.ts      # Cost report
│   │   ├── state/route.ts       # Pool state
│   │   └── wallet/
│   │       ├── balance/route.ts # Balance check
│   │       ├── fund/route.ts    # Funding invoice creation
│   │       └── status/route.ts  # Authenticated invoice status
│   ├── invoice/page.tsx         # Public invoice + QR page
│   ├── economy/page.tsx         # Economy dashboard
│   ├── page.tsx                 # Gateway dashboard
│   └── layout.tsx               # Root layout
├── lib/
│   ├── auth.ts                  # API key validation + free tier check
│   ├── chain.ts                 # Viem clients (Base Sepolia)
│   ├── completion.ts            # Record completions on-chain
│   ├── complexity.ts            # Task complexity scoring
│   ├── income.ts                # Income tracking
│   ├── invoice-links.ts         # Public invoice/status URL helpers
│   ├── invoices.ts              # Invoice persistence + reconciliation
│   ├── keys.ts                  # Key storage (JSON file for MVP)
│   ├── marketplace.ts           # Skill marketplace logic
│   ├── providers.ts             # Provider config
│   ├── providers/
│   │   ├── openai.ts            # OpenAI streaming
│   │   ├── anthropic.ts         # Anthropic streaming → OpenAI SSE format
│   │   ├── groq.ts              # Groq streaming
│   │   └── gemini.ts            # Gemini streaming
│   ├── quality.ts               # Provider quality scoring
│   ├── rebalance.ts             # Trigger pool rebalance
│   ├── routing.ts               # Quality-weighted provider selection
│   ├── settlement.ts            # Lightning settlement
│   └── stream.ts                # Unified stream interface
└── scripts/
    └── setup.ts                 # Register sinks + create pool
```

## On-chain integration

The gateway uses these Pura contracts on Base Sepolia:

| Contract | Purpose |
|----------|---------|
| BackpressurePool | Capacity-weighted provider routing |
| CapacityRegistry | Per-provider capacity tracking |
| CompletionTracker | On-chain completion receipts |
| PricingCurve | Dynamic pricing based on utilization |

## License

MIT — see root [LICENSE](../LICENSE).
