# Pura: Owner's Manual

Everything you need to know to maintain, extend, and ship this project. This is a single-maintainer project. If you need to hand it off, this document is the starting point.

---

## 1. Project Map

```
pura/
├── contracts/          Solidity contracts (Foundry)
│   ├── src/            22 contracts across 5 domains
│   ├── test/           Test suite (125 tests)
│   ├── script/         Deploy.s.sol (full-stack deployment)
│   ├── deployments/    Recorded addresses per network
│   └── foundry.toml    Solc 0.8.26, Cancun EVM, remappings
├── sdk/                TypeScript SDK (@puraxyz/sdk)
│   ├── src/actions/    13 action modules
│   ├── src/abis/       17 contract ABIs (JSON)
│   └── src/addresses.ts  Per-chain deployed addresses
├── web/                Next.js 16 documentation site
│   ├── app/            Layout, pages, components
│   └── content/        MDX docs and blog posts
├── simulation/         Python backpressure simulation
├── docs/paper/         LaTeX research paper
├── plan/               Historical design documents (00–10)
├── gtm/                Go-to-market materials
├── website/            [DEPRECATED] MkDocs source, see web/
├── site/               [DEPRECATED] MkDocs build output
├── mkdocs.yml          [DEPRECATED] Old MkDocs config
└── scripts/            [DEPRECATED] MkDocs build helpers
```

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                  Platform Layer                  │
│   UniversalCapacityAdapter · ReputationLedger    │
└──────────────┬──────────────────────┬───────────┘
               │                      │
    ┌──────────┴──────────┐  ┌───────┴────────────┐
    │      Core BPE       │  │   Domain Extensions │
    │  CapacityRegistry   │  │                     │
    │  BackpressurePool   │  │  Demurrage:         │
    │  StakeManager       │  │    DemurrageToken   │
    │  EscrowBuffer       │  │    VelocityMetrics  │
    │  Pipeline           │  │                     │
    │  PricingCurve       │  │  Nostr:             │
    │  CompletionTracker  │  │    RelayCapacity-   │
    │  OffchainAggregator │  │      Registry       │
    └─────────────────────┘  │    RelayPaymentPool │
                             │                     │
                             │  Lightning:          │
                             │    LightningCapacity-│
                             │      Oracle          │
                             │    LightningRouting- │
                             │      Pool            │
                             │    CrossProtocol-    │
                             │      Router          │
                             └─────────────────────┘
```

**Key dependency:** All pools (BackpressurePool, RelayPaymentPool, LightningRoutingPool) use Superfluid GDA for streaming distribution. The protocol's core innovation is dynamic GDA unit rebalancing based on verified spare capacity.

---

## 3. Contracts

### Build & Test

```bash
cd contracts
forge build          # Compile all 22 contracts
forge test           # Run 125 tests (unit + fork)
forge test -vvv      # Verbose, show traces on failure
forge test --mt testGas  # Gas benchmarks only
```

### Dependencies (git submodules)

| Library | Path | Purpose |
|---------|------|---------|
| forge-std | lib/forge-std | Foundry test framework |
| ethereum-contracts | lib/ethereum-contracts | Superfluid GDA, Super Tokens |
| openzeppelin-contracts | lib/openzeppelin-contracts | ERC20, Ownable, ECDSA (v5) |

To install/update: `forge install`

### Compiler & EVM

- **Solc:** 0.8.26
- **EVM target:** Cancun
- **Remappings:** See `foundry.toml`

### Contract Domains

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

**Demurrage (2 contracts):**

| Contract | Purpose |
|----------|---------|
| DemurrageToken | Custom Super Token with time-decay balances |
| VelocityMetrics | On-chain velocity tracking for demurrage tokens |

**Nostr (2 contracts):**

| Contract | Purpose |
|----------|---------|
| RelayCapacityRegistry | Relay operators register events/sec, storage, bandwidth |
| RelayPaymentPool | GDA pool distributing subscription payments to relays |

**Lightning (3 contracts):**

| Contract | Purpose |
|----------|---------|
| LightningCapacityOracle | Bridges Lightning channel capacity data on-chain |
| LightningRoutingPool | GDA pool for routing incentives based on channel capacity |
| CrossProtocolRouter | Routes requests across BPE, Nostr, and Lightning pools |

**Platform (2 contracts):**

| Contract | Purpose |
|----------|---------|
| UniversalCapacityAdapter | Normalizes capacity metrics across all domain registries |
| ReputationLedger | Cross-domain reputation scores from completion history |

### Deploying

```bash
# Set environment
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export PRIVATE_KEY="0x..."
export BASESCAN_API_KEY="..."

# Deploy all 22 contracts
cd contracts
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# Record addresses from broadcast output into:
#   contracts/deployments/base-sepolia.json
#   sdk/src/addresses.ts
```

The deploy script deploys in dependency order: tokens → StakeManager → CapacityRegistry → BackpressurePool → ... → platform contracts.

### Current Deployment (Base Sepolia)

Core 8 contracts: **deployed and verified** on Basescan.
New 9 contracts (Demurrage, Nostr, Lightning, Platform): **compiled and tested**, addresses are placeholder zeros in `sdk/src/addresses.ts`. Deploy with the updated `Deploy.s.sol`.

See `contracts/deployments/base-sepolia.json` for all addresses.

---

## 4. SDK

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
├── index.ts        Re-exports everything
├── addresses.ts    Per-chain contract addresses
├── contracts.ts    Typed contract instances (viem)
├── signing.ts      EIP-712 attestation signing helpers
├── helpers.ts      Shared utilities
├── abis/           17 ABI JSON files + barrel export
├── actions/
│   ├── sink.ts         Register/update as a capacity sink
│   ├── source.ts       Start/stop payment streams
│   ├── pool.ts         Pool creation and rebalancing
│   ├── stake.ts        Stake/unstake tokens
│   ├── buffer.ts       Escrow deposit/withdraw
│   ├── pricing.ts      Read dynamic prices
│   ├── completion.ts   Submit completion receipts
│   ├── aggregator.ts   Batch attestation submission
│   ├── demurrage.ts    DemurrageToken operations
│   ├── relay.ts        Nostr relay registration/payments
│   ├── lightning.ts    Lightning oracle/routing operations
│   └── platform.ts     Universal adapter, reputation
└── examples/
    └── full-flow.ts    End-to-end example
```

### Publishing

```bash
cd sdk
npm version patch    # or minor/major
npm run build
npm publish --access public
```

Package name: `@puraxyz/sdk`. Not yet published to npm. Publish when ready.

### Adding a New Contract

1. Add ABI JSON to `sdk/src/abis/`
2. Export it from `sdk/src/abis/index.ts`
3. Add address field to `ChainAddresses` type in `sdk/src/addresses.ts`
4. Add address to the chain-specific record in `sdk/src/addresses.ts`
5. Add contract getter to `sdk/src/contracts.ts`
6. Create action module in `sdk/src/actions/`
7. Export action module from `sdk/src/index.ts`

---

## 5. Website (Next.js)

### Setup

```bash
cd web
npm install
npm run dev      # localhost:3000
npm run build    # Production build
npm run start    # Serve production build
```

### Structure

```
web/
├── app/
│   ├── layout.tsx         Root layout, metadata, fonts
│   ├── page.tsx           Landing page
│   ├── components/
│   │   ├── Nav.tsx        Top navigation
│   │   └── Footer.tsx     Site footer
│   ├── docs/[slug]/       MDX doc pages
│   └── blog/[slug]/       MDX blog pages
└── content/
    ├── docs/
    │   ├── contracts.mdx
    │   ├── sdk.mdx
    │   ├── simulation.mdx
    │   └── nip-xx.mdx
    └── blog/
        └── plumbing-problem.mdx
```

### Adding a Doc Page

1. Create `web/content/docs/your-page.mdx` with YAML frontmatter (`title`, `description`)
2. It's automatically available at `/docs/your-page`
3. Add a link in `Nav.tsx` if it should appear in the navigation

### Adding a Blog Post

1. Create `web/content/blog/your-post.mdx` with YAML frontmatter
2. Available at `/blog/your-post`

### MDX Features

- **KaTeX math:** `$inline$` and `$$block$$` (via remark-math + rehype-katex)
- **Code highlighting:** Powered by Shiki via rehype-pretty-code
- **GitHub-flavored markdown:** Tables, strikethrough, etc. (via remark-gfm)
- **Mermaid diagrams:** Rendered client-side via mermaid library
- **Auto-linked headings:** rehype-slug + rehype-autolink-headings

### Deployment

Not yet deployed. Target: pura.xyz. Options:
- **Vercel** (recommended for Next.js): Connect GitHub repo, auto-deploy on push
- **Cloudflare Pages**: `next build && npx @cloudflare/next-on-pages`

---

## 6. Simulation

```bash
cd simulation
python bpe_sim.py
```

Requires: numpy, matplotlib. Generates charts for the research paper (Section 7): convergence, shock response, Sybil resistance, EWMA sweep. Output goes to `docs/paper/figures/`.

---

## 7. Research Paper

```bash
cd docs/paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

LaTeX source in `docs/paper/main.tex` with sections in `docs/paper/sections/`. Bibliography in `bpe.bib`. Figures generated by the simulation.

---

## 8. Plan Documents

Historical design documents in `plan/`. These are **read-only records**; don't update them. They capture the design process:

| File | Content |
|------|---------|
| 00-DECISIONS.md | Key architectural decisions log |
| 01-NOVELTY-ASSESSMENT.md | What's novel vs. prior art |
| 02-PAPER-OUTLINE.md | Research paper structure plan |
| 03-PROTOCOL-SPEC.md | Formal protocol specification |
| 04-CONTRACTS-BLUEPRINT.md | Original 8-contract design |
| 05-SIMULATION-DESIGN.md | Simulation methodology |
| 06-BIBLIOGRAPHY.md | Literature references |
| 07-IMPLEMENTATION-ROADMAP.md | Original build plan |
| 08-GAPS-AND-MITIGATIONS.md | Known risks and mitigations |
| 10-CONTRACTS-V2-BLUEPRINT.md | 9 new contracts design (Demurrage, Nostr, Lightning, Platform) |

---

## 9. GTM Materials

Go-to-market content in `gtm/`. Four target audiences:

1. **AI agent builders**: LangChain/CrewAI/AutoGen developers
2. **Nostr relay operators**: NIP-XX adoption
3. **Lightning node operators**: Channel capacity incentives
4. **DeFi/Superfluid builders**: GDA patterns, DemurrageToken

| File | Content |
|------|---------|
| ROADMAP.md | 5-phase GTM plan |
| blog-post.md | Long-form "plumbing problem" narrative |
| twitter-thread.md | 10-tweet thread covering all domains |
| community-posts.md | 7 posts for 4 audience communities |
| grant-base.md | Base Builder Grant application draft |
| grant-superfluid.md | Superfluid Ecosystem Grant draft |
| outreach-dm.md | Per-audience DM templates |
| feedback-form.md | Testnet feedback form questions |

---

## 10. Deprecated Files

These exist in the repo but are superseded by the Next.js site (`web/`):

| Path | Replacement |
|------|-------------|
| mkdocs.yml | web/next.config.ts |
| website/ | web/content/ |
| site/ | `npm run build` in web/ |
| scripts/build-site.sh | `npm run build` in web/ |

They can be removed or moved to an `archive/` folder.

---

## 11. Environment & Secrets

Required environment variables for contract operations:

| Variable | Purpose |
|----------|---------|
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia JSON-RPC endpoint |
| `PRIVATE_KEY` | Deployer wallet private key |
| `BASESCAN_API_KEY` | For contract verification on Basescan |

Store these in a `.env` file in `contracts/` (gitignored) or export in your shell.

---

## 12. Common Workflows

### "I want to add a new contract"

1. Write contract in `contracts/src/` (or a subdomain folder like `src/nostr/`)
2. Write tests in `contracts/test/`
3. Add to `Deploy.s.sol`
4. Run `forge build && forge test`
5. Follow "Adding a New Contract" in SDK section above
6. Update `web/content/docs/contracts.mdx`

### "I want to redeploy everything"

1. `cd contracts`
2. Set env vars (RPC, private key, Basescan key)
3. `forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify`
4. Copy new addresses to `contracts/deployments/base-sepolia.json`
5. Update `sdk/src/addresses.ts` with new addresses
6. Rebuild SDK: `cd ../sdk && npm run build`

### "I want to update the website"

1. Edit MDX files in `web/content/`
2. `cd web && npm run dev` to preview
3. Push to main branch; Vercel auto-deploys (once connected)

### "I want to publish the SDK"

1. Update version in `sdk/package.json`
2. `cd sdk && npm run build && npm publish --access public`

### "I want to run tests"

```bash
cd contracts && forge test          # Solidity tests
cd sdk && npm test                  # SDK tests (vitest)
cd web && npm run build             # Verify website builds
python simulation/bpe_sim.py       # Run simulation
```

### "I want to verify no old branding remains"

```bash
# Search for old branding (should only appear in plan/ historical docs, research/, and this check)
grep -ri "spilt" --include="*.md" --include="*.ts" --include="*.tsx" --include="*.sol" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=site --exclude-dir=out \
  . | grep -v "plan/" | grep -v "research/" | grep -v "OWNERS-MANUAL"
```

---

## 13. Key Design Decisions

- **Base L2:** Chosen for low gas fees, Superfluid GDA support, and ecosystem grants
- **Superfluid GDA (not CFA):** GDA allows one-to-many distribution with programmable unit weights, essential for capacity-proportional routing
- **EIP-712 off-chain attestations:** 83.5% gas reduction by batching capacity proofs off-chain and submitting aggregated roots
- **EWMA capacity smoothing:** Exponentially weighted moving average prevents gaming via sudden capacity spikes
- **No upgradeable proxies:** All contracts are immutable. Simpler security model for a research-stage protocol.
- **viem (not ethers.js):** TypeScript SDK uses viem for type-safe contract interactions and better tree-shaking

---

## 14. What's Next

From the GTM roadmap (`gtm/ROADMAP.md`):

1. **Fresh testnet deployment**: Redeploy all 22 contracts under `pura` identity
2. **Nostr relay pilot**: 3-5 relay operators testing NIP-XX economics
3. **Grant applications**: Base Builder Grant + Superfluid Ecosystem Grant
4. **Python SDK**: pip-installable package for AI/Python developers
5. **Mainnet**: Base mainnet deployment after security review
