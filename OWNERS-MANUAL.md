# Pura: Owner's Manual

Everything you need to know to maintain, extend, and ship this project. Single-maintainer project. If you need to hand it off, start here.

---

## 1. Project map

```
pura-monorepo/
├── gateway/            LLM routing gateway (Next.js)
│   ├── app/api/        Chat, report, status, wallet endpoints
│   ├── lib/            Routing, providers, budget, settlement, metrics
│   └── lib/providers/  OpenAI, Anthropic, Groq, Gemini
├── contracts/          Solidity contracts (Foundry)
│   ├── src/            35 contracts across 8 domains
│   ├── test/           Test suite (319 tests)
│   ├── script/         Deploy.s.sol + DeployMainnet.s.sol
│   └── deployments/    Recorded addresses per network
├── sdk/                TypeScript SDK (@puraxyz/sdk)
│   ├── src/actions/    23 action modules
│   ├── src/abis/       Contract ABIs (JSON)
│   └── src/addresses.ts  Per-chain deployed addresses
├── pura/               Documentation site (pura.xyz) — Next.js
│   ├── app/            Pages, components, API routes
│   └── content/        MDX docs and blog posts
├── openclaw-skill/     OpenClaw skill packaging
│   ├── SKILL.md        Skill manifest
│   └── scripts/        Install and test scripts
├── shadow/             Shadow mode sidecar (@pura/shadow)
│   └── src/            Collector, simulator, middleware
├── simulation/         Python BPE + Boltzmann simulation
├── docs/paper/         Research paper (LaTeX)
│   └── thermo/         Paper 2: thermodynamic extensions
├── plan/               Historical design documents (00–13)
├── gtm/                Go-to-market materials
├── bitrecipes/         Visual pipeline builder (bit.recipes)
├── website/            [DEPRECATED] MkDocs source
├── site/               [DEPRECATED] MkDocs build output
└── scripts/            [DEPRECATED] MkDocs build helpers
```

---

## 2. Architecture

The system has two layers: the gateway (the product) and the on-chain contracts (the economics).

```
┌──────────────────────────────────────────────────┐
│                   Gateway                         │
│  Complexity scoring → Provider routing → Stream   │
│  Budget enforcement (Upstash Redis)               │
│  Lightning settlement (LNbits)                    │
│  4 providers: OpenAI, Anthropic, Groq, Gemini     │
└───────────────────────┬──────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────┐
│              On-chain layer (Base)                 │
│  CapacityRegistry · BackpressurePool (GDA)        │
│  CompletionTracker · StakeManager · PricingCurve  │
│  EscrowBuffer · OffchainAggregator · Pipeline     │
└───────────────────────┬──────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │     Research modules         │
         │  Demurrage · Nostr relays    │
         │  Lightning routing · V2      │
         │  Thermodynamic · DVM · Sett. │
         └─────────────────────────────┘
```

The gateway scores each request for complexity (cheap/mid/premium), routes to the best-fit provider, streams the response, deducts cost from the user's Lightning-funded balance, and records the completion on-chain.

---

## 3. Gateway

### Setup

```bash
cd gateway
npm install
cp .env.example .env   # Add provider API keys + Upstash + LNbits credentials
npm run dev             # localhost:3000
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `GROQ_API_KEY` | Groq provider |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini provider |
| `UPSTASH_REDIS_REST_URL` | Key storage + rate limiting + budget tracking |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth |
| `LNBITS_URL` | LNbits instance for Lightning settlement |
| `LNBITS_ADMIN_KEY` | LNbits admin key |

### Key modules

| File | What it does |
|------|-------------|
| `lib/routing.ts` | Complexity scoring + provider selection |
| `lib/providers.ts` | Provider config (models, costs, capabilities) |
| `lib/providers/*.ts` | Per-provider streaming implementations |
| `lib/budget.ts` | Per-key daily budget enforcement via Redis |
| `lib/settlement.ts` | SettlementProvider interface |
| `lib/lightning.ts` | LNbits implementation of settlement |
| `lib/metrics.ts` | Time-bucketed provider latency/success counters |
| `lib/auth.ts` | API key validation, free tier (5,000 requests) |
| `lib/stream.ts` | SSE streaming for all providers |

### Endpoints

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/chat` | POST | Main inference endpoint (OpenAI-compatible) |
| `/api/report` | GET | 24h cost report by provider |
| `/api/status` | GET | Provider latency + success rate |
| `/api/wallet/fund` | POST | Generate Lightning invoice (LNURL) |
| `/api/wallet/balance` | GET | Current balance + estimated remaining requests |

### Adding a provider

1. Create `gateway/lib/providers/newprovider.ts` implementing the streaming interface
2. Add provider config to `gateway/lib/providers.ts` (model, cost per 1K tokens, capabilities)
3. Add to routing tiers in `gateway/lib/routing.ts`
4. Add streaming case in `gateway/lib/stream.ts`

---

## 4. Contracts

### Build and test

```bash
cd contracts
forge build          # Compile all 35 contracts
forge test           # Run 319 tests
forge test -vvv      # Verbose traces on failure
forge test --mt testGas  # Gas benchmarks only
```

### Dependencies (git submodules)

| Library | Path | Purpose |
|---------|------|---------|
| forge-std | lib/forge-std | Foundry test framework |
| ethereum-contracts | lib/ethereum-contracts | Superfluid GDA, Super Tokens |
| openzeppelin-contracts | lib/openzeppelin-contracts | ERC20, Ownable, ECDSA (v5) |

### Compiler and EVM

- Solc: 0.8.26
- EVM target: Cancun
- Remappings: see `foundry.toml`

### Contract domains

**Core BPE (8 contracts):**

| Contract | Purpose |
|----------|---------|
| CapacityRegistry | EWMA-smoothed capacity declarations per operator |
| BackpressurePool | Superfluid GDA pool, units = spare capacity |
| StakeManager | Stake-gated registration, slashing on underperformance |
| EscrowBuffer | Holds overflow when all recipients at capacity |
| Pipeline | Multi-stage backpressure chains |
| PricingCurve | EIP-1559-style dynamic pricing per queue depth |
| CompletionTracker | Verifies dual-signed completion receipts |
| OffchainAggregator | Batches EIP-712 attestations (83.5% gas savings) |

**V2 extensions (5 contracts):** Factory-deployed nested economies, quality scoring, urgency and velocity tokens.

**Thermodynamic (3 contracts):** TemperatureOracle, VirialMonitor, SystemStateEmitter.

**Demurrage (2):** DemurrageToken, VelocityMetrics.

**Nostr (2):** RelayCapacityRegistry, RelayPaymentPool.

**Lightning (3):** LightningCapacityOracle, LightningRoutingPool, CrossProtocolRouter.

**DVM adapters (3):** DVMCapacityAdapter, DVMCompletionVerifier, DVMPricingCurve.

**Settlement adapters (3):** SuperfluidSettlement, LightningSettlement, DirectSettlement.

**Platform (2):** UniversalCapacityAdapter, ReputationLedger.

### Deploying

```bash
# Set environment
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export PRIVATE_KEY="0x..."
export BASESCAN_API_KEY="..."

# Deploy all contracts
cd contracts
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# For mainnet
forge script script/DeployMainnet.s.sol --rpc-url base_mainnet --broadcast --verify

# Record addresses into:
#   contracts/deployments/base-sepolia.json (or base-mainnet.json)
#   sdk/src/addresses.ts
```

### Current deployment (Base Sepolia)

Core 10 contracts + 9 research modules: deployed and verified on Basescan. Remaining (thermodynamic, DVM, settlement adapters): compiled and tested, not yet deployed.

See `contracts/deployments/base-sepolia.json` for all addresses.

---

## 5. SDK

### Setup

```bash
cd sdk
npm install
npm run build    # tsc → dist/
npm run test     # vitest
npm run lint     # tsc --noEmit
```

### Structure

```
sdk/src/
├── index.ts          Re-exports everything
├── addresses.ts      Per-chain contract addresses
├── contracts.ts      Typed contract instances (viem)
├── signing.ts        EIP-712 attestation signing helpers
├── helpers.ts        Shared utilities
├── abis/             Contract ABI JSON files + barrel export
├── actions/          23 action modules
│   ├── sink.ts       Register/update as a capacity sink
│   ├── source.ts     Start/stop payment streams
│   ├── pool.ts       Pool creation and rebalancing
│   ├── stake.ts      Stake/unstake tokens
│   ├── buffer.ts     Escrow deposit/withdraw
│   ├── pricing.ts    Read dynamic prices
│   ├── completion.ts Submit completion receipts
│   ├── aggregator.ts Batch attestation submission
│   ├── demurrage.ts  DemurrageToken operations
│   ├── relay.ts      Nostr relay registration/payments
│   ├── lightning.ts  Lightning oracle/routing
│   ├── platform.ts   Universal adapter, reputation
│   ├── openclaw.ts   OpenClaw integration
│   ├── economy.ts    Economy lifecycle
│   ├── nestedPool.ts Nested pool operations
│   ├── quality.ts    Quality scoring
│   ├── urgencyToken.ts  Urgency token ops
│   └── velocityToken.ts Velocity token ops
└── examples/
    └── full-flow.ts  End-to-end example
```

### Publishing

```bash
cd sdk
npm version patch
npm run build
npm publish --access public
```

Package name: `@puraxyz/sdk`. Not yet published to npm.

### Adding a new contract

1. Add ABI JSON to `sdk/src/abis/`
2. Export from `sdk/src/abis/index.ts`
3. Add address to `ChainAddresses` type in `sdk/src/addresses.ts`
4. Add contract getter to `sdk/src/contracts.ts`
5. Create action module in `sdk/src/actions/`
6. Export from `sdk/src/index.ts`

---

## 6. Site (pura.xyz)

### Setup

```bash
cd pura
npm install
npm run dev      # localhost:3000
npm run build    # Production build
```

### Structure

```
pura/
├── app/
│   ├── layout.tsx         Root layout, metadata, fonts
│   ├── page.tsx           Landing page (gateway-first hero)
│   ├── components/        Nav, Footer, DemoTerminal
│   ├── gateway/           Gateway landing page
│   ├── status/            Provider status dashboard
│   ├── explainer/         How it works (use-case paths)
│   ├── about/             About page
│   ├── deploy/            Operator deployment guide
│   ├── simulate/          Interactive BPE benchmark
│   ├── monitor/           Shadow mode monitor
│   ├── paper/             Research paper links
│   ├── docs/[slug]/       MDX doc pages
│   └── blog/[slug]/       MDX blog pages
├── content/
│   ├── docs/              Getting started, contracts, SDK, products
│   └── blog/              Blog posts
├── scripts/               Setup scripts
└── public/                Static assets, icons
```

### Adding content

- Doc page: create `pura/content/docs/your-page.mdx` with YAML frontmatter. Auto-available at `/docs/your-page`.
- Blog post: create `pura/content/blog/your-post.mdx`. Auto-available at `/blog/your-post`.
- Add nav link in `Nav.tsx` if it should appear in navigation.

### MDX features

KaTeX math, Shiki code highlighting, GitHub-flavored markdown, Mermaid diagrams, auto-linked headings.

### Deployment

Deployed to Vercel. Auto-deploys on push to main. Vercel Analytics enabled.

---

## 7. OpenClaw skill

```
openclaw-skill/
├── SKILL.md          Skill manifest (capabilities, config schema, usage)
└── scripts/
    ├── install.sh    Provisions API key, validates connectivity
    └── test.sh       Verifies routing across all four providers
```

Install: `openclaw install pura-gateway`

---

## 8. Shadow sidecar

```bash
cd shadow
npm install
npm run build
npm run start    # HTTP metrics server on port 3099
```

Runs alongside the gateway. Collects per-sink metrics (latency, throughput, error rate) in a circular buffer. Simulates Boltzmann allocation and congestion pricing without affecting real traffic.

---

## 9. Simulation

```bash
pip install numpy matplotlib
python simulation/bpe_sim.py          # BPE convergence, shock, Sybil experiments
python simulation/boltzmann_sim.py    # Boltzmann routing comparisons
```

Output goes to `docs/paper/figures/`.

---

## 10. Research paper

```bash
cd docs/paper
pdflatex main.tex && bibtex main && pdflatex main.tex && pdflatex main.tex
```

Paper 1 (BPE core): `docs/paper/main.tex`
Paper 2 (thermodynamic extensions): `docs/paper/thermo/`

---

## 11. Plan documents

Historical design documents in `plan/`. Read-only records. They capture the design process, not the current state.

---

## 12. GTM materials

Go-to-market content in `gtm/`. Primary targets: AI agent builders and OpenClaw skill developers.

| File | Content |
|------|---------|
| ROADMAP.md | Phased GTM plan (gateway-first) |
| blog-post.md | Long-form narrative |
| twitter-thread.md | 8-tweet thread + standalone posts |
| community-posts.md | HN, Reddit, Lightning, Nostr, OpenClaw posts |
| outreach-dm.md | Per-audience DM templates |
| grant-base.md | Base Builder Grant draft |
| grant-superfluid.md | Superfluid Grant draft |
| grant-openclaw.md | OpenClaw Grant draft |
| feedback-form.md | Testnet feedback questions |

---

## 13. Environment and secrets

### Gateway

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `GROQ_API_KEY` | Groq provider |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini provider |
| `UPSTASH_REDIS_REST_URL` | Key store + rate limiting + budgets |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth |
| `LNBITS_URL` | Lightning settlement |
| `LNBITS_ADMIN_KEY` | LNbits admin key |

### Contracts

| Variable | Purpose |
|----------|---------|
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia JSON-RPC |
| `PRIVATE_KEY` | Deployer wallet |
| `BASESCAN_API_KEY` | Contract verification |

Store in `.env` files (gitignored) or export in shell.

---

## 14. Common workflows

### "I want to add a new LLM provider"

1. Create `gateway/lib/providers/newprovider.ts`
2. Add config to `gateway/lib/providers.ts`
3. Add to routing tiers in `gateway/lib/routing.ts`
4. Add streaming case in `gateway/lib/stream.ts`
5. Test: `cd gateway && npm run dev`, then curl a request

### "I want to add a new contract"

1. Write contract in `contracts/src/`
2. Write tests in `contracts/test/`
3. Add to deploy script
4. `forge build && forge test`
5. Follow SDK steps in section 5
6. Update `pura/content/docs/contracts.mdx`

### "I want to redeploy everything"

1. Set env vars
2. `cd contracts && forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify`
3. Copy addresses to `contracts/deployments/` and `sdk/src/addresses.ts`
4. Rebuild SDK: `cd sdk && npm run build`

### "I want to update the site"

1. Edit MDX in `pura/content/`
2. `cd pura && npm run dev` to preview
3. Push to main. Vercel auto-deploys.

### "I want to run all tests"

```bash
cd contracts && forge test           # 319 Solidity tests
cd ../sdk && npm test                # SDK tests (vitest)
cd ../gateway && npm run build       # Verify gateway compiles
cd ../pura && npx next build         # Verify site builds
python simulation/bpe_sim.py        # Run simulation
```

---

## 15. Key design decisions

- Base L2 for low gas and Superfluid GDA support
- Superfluid GDA (not CFA) for one-to-many distribution with programmable weights
- EIP-712 off-chain attestations for 83.5% gas savings
- EWMA capacity smoothing to prevent gaming via sudden spikes
- No upgradeable proxies — all contracts immutable
- viem (not ethers.js) for type-safe contract interactions
- Lightning (not Stripe) for per-request settlement without subscriptions
- Upstash Redis for serverless-compatible key storage and rate limiting
- OpenClaw for distribution instead of building a custom marketplace

---

## 16. Deprecated files

| Path | Replacement |
|------|-------------|
| website/ | pura/content/ |
| site/ | `npm run build` in pura/ |
| web/ | pura/ |
| scripts/build-site.sh | `npm run build` in pura/ |
| mkdocs.yml | pura/next.config.ts |

Can be removed or moved to `archive/`.
