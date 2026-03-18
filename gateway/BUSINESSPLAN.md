# Mandalay — Business Plan

**Capacity-routed LLM gateway. Open source. Business in a box.**

Mandalay routes API requests across LLM providers based on real-time capacity, with transparent on-chain economics. It's a working product, a reference implementation for Backproto, and a forkable business.

---

## What Mandalay proves

1. **Backproto works in production.** Real API traffic, real capacity routing, real completion receipts — not a testnet demo.
2. **On-chain coordination adds value.** Routing decisions are better when they're informed by transparent, verifiable capacity signals rather than opaque load balancers.
3. **The economics are sustainable.** A thin margin on LLM API calls, paid via streaming micropayments, covers infrastructure and generates profit.

---

## User journey

### For the developer (customer)

```
1. Visit mandalay.dev
2. Click "Get API Key" — instant, no signup
3. Copy key, replace OpenAI base URL:
   - Before: https://api.openai.com/v1/chat/completions
   - After:  https://mandalay.dev/api/chat
4. Same request format. Same streaming SSE. Just works.
5. First 100 requests are free.
6. At request 101, get 402 response: "Link a wallet to continue."
7. POST /api/wallet with their Ethereum address.
8. Wallet opens a Superfluid payment stream (pennies per request).
9. Requests resume. Provider is chosen automatically by capacity.
10. Dashboard at mandalay.dev shows which provider handled each request,
    capacity weights, completion count, and spend.
```

**What the customer gets:**
- Multi-provider redundancy (if OpenAI goes down, Anthropic picks up automatically)
- Capacity-optimal routing (requests go to the provider with the most headroom)
- Cost transparency (on-chain receipts for every completion)
- No vendor lock-in (OpenAI-compatible format means they can leave anytime)
- Optional model override (`"model": "claude-sonnet-4-20250514"` bypasses auto-routing)

### For you (the operator / CEO)

**Daily operations:**
- Monitor the dashboard (provider capacity, request volume, key creation rate)
- Top up the operator wallet with ETH for gas (Base Sepolia is ~free; Base mainnet is cheap)
- Keep provider API keys funded (OpenAI/Anthropic billing)
- Review rebalance transactions (automatic, but worth watching)

**Weekly:**
- Check completion receipts on-chain match expected volume
- Review new API key signups and wallet linkage rate (conversion funnel)
- Adjust free tier threshold if needed (env var, redeploy)

**Monthly:**
- P&L: provider API costs vs. payment stream revenue
- Add new providers based on demand (Gemini, Groq, etc.)
- Content: write about what the routing data reveals (blog fodder)

---

## Revenue model

### Unit economics

| Item | Amount |
|------|--------|
| Average LLM API cost per request (blended) | ~$0.003–0.01 |
| Mandalay charge per request (via payment stream) | ~$0.005–0.015 |
| **Gross margin per request** | **~40–60%** |
| Free tier cost (100 req × $0.01) | $1.00 per key |

### Revenue tiers

| Stage | Monthly requests | Monthly revenue | Monthly cost | Net |
|-------|-----------------|----------------|-------------|-----|
| Early (50 users) | 50,000 | $375 | ~$700 | -$325 |
| Growth (500 users) | 500,000 | $3,750 | ~$3,500 | +$250 |
| Scale (5,000 users) | 5,000,000 | $37,500 | ~$25,000 | +$12,500 |

**Break-even: ~400 paying users at ~1,000 req/month each.**

### Additional revenue opportunities

- **Priority routing:** Paid tier gets guaranteed low-latency provider selection.
- **Custom pools:** Enterprise customers get their own BackpressurePool with dedicated capacity.
- **Analytics API:** Sell aggregated routing/latency data (which providers are fastest for which prompt types).
- **White-label:** Forks pay for hosted Backproto integration (managed pool setup, completion tracking).

---

## Why someone would fork this

Mandalay is open source. Someone forks it when they want:

1. **Their own customer base.** A YC startup running its own branded gateway for its portfolio companies.
2. **Different providers.** A company that only uses Groq + Mistral (no OpenAI/Anthropic).
3. **Private deployment.** Enterprise that wants capacity routing internally without sending traffic through mandalay.dev.
4. **Different chain.** Someone who wants this on Arbitrum, Optimism, or mainnet Ethereum.
5. **Custom pricing.** Different margin, different free tier, different payment token.

Every fork still uses Backproto contracts (or deploys their own instance), which validates the protocol regardless.

---

## Adding a new provider

Adding an LLM provider takes ~30 minutes:

1. **Create `lib/providers/{name}.ts`** — If the provider uses OpenAI-compatible API (Groq, Together, Fireworks, Mistral, DeepSeek), copy `openai.ts` and change the endpoint URL. If it has a custom format (like Anthropic), write a stream transformer (~80 lines).

2. **Register in `lib/providers.ts`** — Add the provider name to the `Provider` union type, add a config function that reads the API key from env.

3. **Add to `lib/stream.ts`** — One new import + one case in the if/else.

4. **Add sink in `lib/routing.ts`** — One new entry in `PROVIDER_SINKS` with the on-chain address.

5. **Run setup script** — Registers the new sink in the BackpressurePool on-chain.

6. **Set env vars** — API key + sink address.

Providers that speak OpenAI format (most of them now) require zero transformation code — just a different base URL.

---

## Business-in-a-box: one-click deploy

### For Vercel

```bash
# Fork the repo, then:
vercel deploy --prod
# Set env vars in Vercel dashboard:
# OPENAI_API_KEY, ANTHROPIC_API_KEY, OPERATOR_PRIVATE_KEY, CHAIN_ID, RPC_URL
```

The app is already a standard Next.js project. Vercel deploys it with zero config. API routes become serverless functions automatically.

### For Railway / Render / Fly

Same story — Next.js is universally supported. Set env vars, deploy.

### For AWS (self-hosted)

```bash
npm run build
# Deploy .next/ to EC2, ECS, or Lambda via SST/OpenNext
```

### What a fork operator needs to do

1. **Deploy the app** (Vercel one-click or equivalent)
2. **Set env vars** (LLM API keys + operator wallet)
3. **Run `npm run setup`** (registers sinks + creates pool on-chain — one time)
4. **Point their domain** at the deployment
5. **Fund the operator wallet** with a small amount of ETH on Base
6. **Start marketing** — their gateway is live

Total time from fork to live: **under an hour.**

---

## Competitive positioning

| Feature | Mandalay | OpenRouter | LiteLLM | Portkey |
|---------|----------|------------|---------|---------|
| Open source | Yes (MIT) | No | Yes | Partial |
| Self-hostable | Yes | No | Yes | Yes |
| On-chain routing | Yes | No | No | No |
| Capacity-aware | Yes (BackpressurePool) | No (price-based) | No | No |
| Completion receipts | Yes (on-chain) | No | No | No |
| Payment streaming | Yes (Superfluid) | No (prepaid credits) | No | No |
| Forkable business | Yes | No | Code only | No |
| Provider addition | ~30 min | N/A | Config file | Config file |

**Mandalay's moat is not the code. It's the on-chain economics.** Anyone can build a multi-provider proxy. Nobody else has verifiable capacity routing with streaming payments and completion receipts.

---

## Go-to-market for mandalay.dev

### Phase 1: Proof of concept (weeks 1–4)
- Launch on Base Sepolia (testnet economics, real LLM calls)
- Get 10–20 developers using it for side projects
- Blog about routing decisions and capacity data
- Ship to Hacker News, /r/LocalLLaMA, AI Twitter

### Phase 2: Production (weeks 5–8)
- Deploy Backproto contracts to Base mainnet
- Switch from testnet to real USDC payment streams
- Add Gemini + Groq as providers (demand-driven)
- Launch "Fork your own gateway" tutorial

### Phase 3: Growth (weeks 9–16)
- One-click deploy button (Vercel + Railway)
- Analytics dashboard expansion (latency percentiles, cost breakdown per provider)
- Enterprise pilot: 1–2 companies running white-label forks
- Apply to Base ecosystem grants

### Phase 4: Platform (months 5–12)
- Provider marketplace (providers register themselves as sinks)
- Quality scoring (route based on output quality, not just capacity)
- Multi-chain deployment
- Agent-native features (tool calling routing, multi-step orchestration)

---

## Key metrics to track

| Metric | Why it matters |
|--------|---------------|
| API keys created | Top of funnel |
| Keys → wallet linked (%) | Conversion rate |
| Requests per key per week | Engagement / stickiness |
| Provider selection distribution | Is routing actually balanced? |
| Completion receipts vs. requests | On-chain integration health |
| Fallback rate (primary → secondary) | Provider reliability signal |
| Revenue per request | Unit economics |
| Time to first request (new key) | Developer experience |

---

## Summary

Mandalay is three things:

1. **A product** — developers use it to get multi-provider LLM routing with zero configuration.
2. **A proof** — it demonstrates that Backproto's capacity routing and streaming payments work in production.
3. **A template** — anyone can fork it, deploy it, and run their own capacity-routed LLM business in under an hour.

The code is the easy part. The economics are the hard part. Backproto solves the hard part. Mandalay shows it working.
