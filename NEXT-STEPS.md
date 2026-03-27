# Next steps: ship to mainnet

## Where things stand

The codebase has 35 contracts (319 tests), a streaming LLM gateway with four providers (OpenAI, Anthropic, Groq, Gemini), an SDK with 23 action modules, and a full documentation site. Everything compiles and passes. What's left is operational: deploy, verify, publish, and push the word out.

### What's done (code)

- `contracts/script/DeployMainnet.s.sol` — deploys 12 contracts (core 8 + demurrage 2 + relay 2) to Base mainnet using real USDC
- Gateway hardened: Upstash KV key storage (JSON fallback for local dev), Redis-backed rate limiting, Groq as third provider, token estimation, structured JSON logging
- SDK relay actions exported, reference integration script at `sdk/scripts/relay-register.ts`
- Grant applications updated with current numbers (35 contracts, 319 tests, 23 modules)
- NVM advanced systems: 7 economic systems (credit, futures, spawning, reputation, bridging, protocol negotiation, genome), 13 new event kinds (31910-31922), all with typed interfaces and builder functions
- 82 NVM tests passing across 10 test files (unit tests against mock Nostr events)
- Credit graph and reputation publisher wired into AgentRelay and RoutingService
- Evolution dashboard at `/evolution` (force-directed phylogeny visualization)
- 16 blog posts, full docs site, products page, getting-started guides

### What's left (operations)

Everything below requires manual steps: wallet funding, Vercel deploys, form submissions, content publishing. Ordered by dependency chain.

---

## 0. Verify public content (pre-commit gate)

Before committing, confirm that all public-facing pages are consistent with the source of truth in `nvm/src/events/kinds.ts`:

- Event kind numbers match across README, blog, docs, NVM dashboard, and plan documents
- Base NVM table (31900–31905) labels are correct: capacity, completion receipt, quality score, job assignment, pipeline spec, pipeline state
- Advanced systems table (31910–31922) assigns each kind to the correct system
- Status markers distinguish "live" (gateway), "implemented" (NVM + advanced systems), and "stubbed" (network-level operations like bridge forwarding, futures settlement)
- No claims that imply production deployment of NVM relay or advanced systems

Run `npx tsc --noEmit` in nvm, pura, and gateway. Run `npx vitest run` in nvm (82 tests). All must pass.

## 1. Commit and tag

Push all unstaged changes as a single commit. Tag `v0.1.0-pre-mainnet`.

## 2. Deploy contracts to Base mainnet

Fund deployer wallet with ~0.05 ETH on Base. Then:

```bash
cd contracts
forge script script/DeployMainnet.s.sol \
  --rpc-url base_mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

After deployment:
- Copy addresses to `contracts/deployments/base-mainnet.json`
- Update `sdk/src/addresses.ts` chain 8453 entries (currently all zeros)
- Rebuild SDK, then rebuild consuming apps

## 3. Deploy gateway to Vercel

Generate a fresh operator wallet (separate from deployer). Fund with ~0.01 ETH on Base.

Register sinks and create pool:

```bash
cd gateway
CHAIN_ID=8453 \
RPC_URL=https://mainnet.base.org \
OPERATOR_PRIVATE_KEY=0x... \
OPENAI_SINK_ADDRESS=<EOA> \
ANTHROPIC_SINK_ADDRESS=<EOA> \
GROQ_SINK_ADDRESS=<EOA> \
npx tsx scripts/setup.ts
```

Create Vercel project linked to `gateway/`. Set env vars: `CHAIN_ID=8453`, `RPC_URL`, `OPERATOR_PRIVATE_KEY`, all three provider API keys, all three sink addresses, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Domain: `api.pura.xyz`.

Set provider spend caps ($100/mo per provider).

Verify: `curl https://api.pura.xyz/api/health` should return `{"status":"ok","chain":"8453"}`.

## 4. Deploy pura.xyz to Vercel

Create Vercel project linked to `pura/`. Set `NEXT_PUBLIC_GATEWAY_URL=https://api.pura.xyz`. Domain: `pura.xyz`.

Compile lite paper PDF (`cd docs/paper/lite && pdflatex main.tex && pdflatex main.tex`), host at `pura/public/bpe-lite.pdf`.

## 5. End-to-end proof

This is the "anyone can interact" moment.

```bash
# Generate key
curl -X POST https://api.pura.xyz/api/keys \
  -H "Content-Type: application/json" \
  -d '{"label":"first-mainnet-key"}'

# Send completion
curl https://api.pura.xyz/v1/chat/completions \
  -H "Authorization: Bearer pura_..." \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is backpressure routing?"}],"stream":true}'
```

Check response headers (`X-Pura-Provider`, `X-Pura-Request-Id`). Query `/api/state` for pool data. Look up operator wallet on Basescan for completion epoch transactions.

Screen-record the whole flow. Cut to under 2 minutes.

## 6. Publish SDK + paper

```bash
cd sdk && npm publish --access public
# publishes @puraxyz/sdk@0.1.0
```

Post lite paper PDF on pura.xyz. Consider arXiv submission.

## 7. GTM execution (days 4-21)

All materials exist in `gtm/`.

**Grants** (days 4-7): Submit to Base Builders, Superfluid Ecosystem, OpenClaw. Each grant doc is in `gtm/grant-*.md` — adapt to platform format, include mainnet tx links.

**LinkedIn** (days 4-7): 4 posts — problem statement, product announcement, building in public, three-project vision. Link blog post from `gtm/blog-post.md`.

**Twitter/Bluesky/Nostr** (days 4-14): 8-tweet core thread from `gtm/twitter-thread.md`, standalone tweets, reply-first engagement.

**Reddit** (days 7-14): Comments first in r/ethereum, r/defi, r/MachineLearning, r/LocalLLaMA. Then staggered posts from `gtm/community-posts.md`.

**Direct outreach** (days 7-14): 3-5 DMs/day using `gtm/outreach-dm.md` templates. Focus on AI agent builders, Base ecosystem, Superfluid builders, relay operators.

**Catalini window** (days 4-18, time-sensitive): Follow `gtm/swarm-catalini.md` playbook — verification-bottleneck framing on LinkedIn, connection request, 7-tweet mapping thread.

**Show HN** (day ~14): "Show HN: Open-source LLM gateway with on-chain capacity routing (live on Base)". Tuesday/Wednesday, 9-10am ET.

**Feedback form** (day 4): Deploy 9-question form from `gtm/feedback-form.md` on Tally. Link from pura.xyz footer.

## 8. Nostr relay integration (days 14-28)

The relay contracts deploy in step 2. This step proves BPE generalizes beyond LLMs.

Reference script at `sdk/scripts/relay-register.ts` shows: register relay → join pool → verify capacity. Run it against a live Nostr relay (strfry or nostream) to submit periodic capacity attestations.

Write a blog post: how BPE generalizes from LLMs to relays. Post in Nostr developer channels.

## 9. Ongoing hardening

- **Monitoring**: Forward Vercel logs to Axiom (free tier). Set up Checkly on `api.pura.xyz/api/health`. Alert on gateway down, provider error rate > 10%, operator balance < 0.005 ETH.
- **Formal audit**: Commission Cyfrin or Code4rena for the 12 mainnet contracts before opening to external stakers. Budget $15-30k, timeline 2-4 weeks.

## 9a. NVM integration tests (parallel with step 8)

Unit tests (82 across 10 files) verify logic against mock Nostr events. Integration tests verify the same logic against a real relay.

**Tier 1 — base NVM round-trip:**
Spin up a `strfry` relay in Docker (`nvm/docker-compose.yml`). Connect `AgentRelay`, publish kind-31900 capacity from 3 test agents, submit a job request, verify kind-31903 assignment and kind-31901 receipt appear on the relay.

**Tier 2 — credit + reputation:**
Publish kind-31910 credit lines between test agents. Route a job, verify credit dispatch was used (not atomic). Wait for reputation cycle, verify kind-31913 profile published.

**Tier 3 — spawning + genome:**
Feed synthetic capacity data with skill gaps into `SpawningManager`. Verify kind-31912 and kind-31917 events appear on relay. Verify `GenomeTracker` ingests them.

Infrastructure: Docker compose with strfry, test keypair fixtures, `nvm/test/integration/` directory. Optional Playwright tests for the evolution dashboard.

---

## Critical path

```
commit → deploy contracts → deploy gateway → e2e proof
                           ↘ deploy pura.xyz ↗
                             publish SDK
                             GTM (start day 4)
                             relay integration (start day 14)
                             hardening (ongoing)
```

Gateway and pura.xyz deploy in parallel. GTM starts as soon as the e2e proof works. Relay integration and hardening are independent tracks.

## Scope boundaries

Included: everything needed to make a live, usable system on Base mainnet that anyone can interact with, plus GTM to get people to do so.

Excluded: thermodynamic layer (v0.2), V2 composition contracts, Lightning contracts (separate phase).

Advanced NVM systems: implemented and tested locally, deployment deferred to relay integration phase (step 8). Blog, docs, and homepage describe these systems with explicit "implemented, not yet deployed" status markers.

---

## Advanced NVM systems (implemented)

Seven economic systems built on top of the base NVM relay. All have typed event definitions (kinds 31910-31922), builder functions, and working TypeScript implementations. See `plan/14-ADVANCED-NVM-SYSTEMS.md` for the full spec.

**Working code (tested):**
- Agent credit / web of trust — bilateral credit lines, BFS transitive routing, settlement/default tracking
- Reputation substrate — receipt aggregation into portable AgentProfiles, cross-network attestations
- Self-spawning agents — market opportunity detection, eligibility checks, 5-stage spawn pipeline
- Skill genome / evolutionary optimization — population tracking, phylogeny tree, ancestry chains

**Stubs (interfaces + ingestion, no execution):**
- Capacity futures — orderbook, buy/sell matching, price oracle
- Cross-NVM bridging — registry, sanitizer, attestation store
- Emergent protocol negotiation — proposal tracking, endorsement counting, activation

**Wired into relay:** Credit and reputation are integrated into the AgentRelay. The routing service checks credit availability before dispatching jobs. Reputation profiles are published periodically alongside quality scores.

**Visualization:** Evolution dashboard at `/evolution` renders agent phylogeny as a force-directed Canvas graph.

**Next:** Wire futures into the relay subscription loop. Build a real bridge agent that connects two relay instances. Convert protocol stubs into active governance. All of these require multi-relay test infrastructure that doesn't exist yet.

---

## 10. Pura-1 agent setup (human-only)

Everything below requires credentials, accounts, or manual interaction.

### OpenClaw install

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

During onboard, choose Anthropic claude-opus-4-6 as primary model.

### Telegram bot

Create a bot via @BotFather. Save the token. Add it to OpenClaw config:

```bash
# In ~/.openclaw/openclaw.json, set:
# channels.telegram.botToken = "<your-bot-token>"
```

### Agent workspace

```bash
# Point OpenClaw at the Pura monorepo
# In ~/.openclaw/openclaw.json, set:
# agents.defaults.workspace = "/path/to/synthesi"

# Copy the prepared directive and skill
cp openclaw-skill/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp -r openclaw-skill/ ~/.openclaw/workspace/skills/pura/

# Set up Git identity for the agent
cd ~/.openclaw/workspace
git config user.name "pura-1-agent"
git config user.email "pura-1@pura.xyz"
```

### Generate API key

```bash
# Generate a Pura gateway key for the agent
curl -s -X POST https://api.pura.xyz/api/keys \
  -H "Content-Type: application/json" \
  -d '{"label":"pura-1"}'

# Set the returned key in OpenClaw env
# PURA_API_KEY=pura_...
```

### Lightning wallet

Option A — LNbits:
```bash
# Create wallet at your LNbits instance
# Set in gateway env:
# LNBITS_URL=https://your-lnbits.com
# LNBITS_ADMIN_KEY=<admin-key>
```

Option B — LND:
```bash
# Set in gateway env:
# LND_REST_HOST=https://your-lnd:8080
# LND_MACAROON_HEX=<hex-encoded-admin-macaroon>
```

Fund the wallet with ~50,000 sats via `POST /api/wallet/fund`.

### ClawHub publishing

```bash
cd openclaw-skill
openclaw skills publish pura
# Or via clawhub CLI:
npm install -g clawhub
clawhub sync
```

Verify the skill appears on clawhub.com and is installable via `openclaw skills install pura`.

### OpenClaw cron

Configure periodic tasks in OpenClaw:

| Schedule | Task |
|----------|------|
| Every 15 min | Health check (test request through gateway) |
| Daily 7am | Send income statement to Telegram |
| Nightly | QA pass (review routing decisions, spot patterns) |
| Weekly Sunday evening | Write WEEKLY-REVIEW.md |

### Verify

```bash
# Telegram bot should respond
# Health check should pass
openclaw status
# Should show pura-1 agent running with skill registered
```

## 11. Run the 48-hour experiment

Follow `gtm/experiment-runbook.md`. Requires 5 funded API keys and the economy dashboard live at pura.xyz/economy.

After the experiment:
- Fill in placeholder data in `pura/content/blog/first-agent-economy.mdx`
- Post X thread narrating results
- DM steipete with the income statement screenshot
- Submit Show HN with live dashboard link

---

## 12. NVM (Nostr Virtual Machine) — future work

The `nvm/` package implements BPE routing over Nostr events with Lightning settlement. Below are items explicitly deferred from the initial implementation. Each one has a stub, a TODO comment, or an interface ready for it.

### Real Lightning wallet backends

`nvm/src/payments/lightning.ts` has a mock wallet. Real backends need implementing:

- **Alby**: OAuth token → NWC (Nostr Wallet Connect) flow. Most agents will use this.
- **LND**: gRPC/REST macaroon auth, invoice creation, payment monitoring.
- **CLN**: `lightning-cli` or commando plugin interface.
- **Cashu**: ecash mints for instant micro-settlements. Good for sub-100-sat jobs.

The `LightningWallet` interface is defined. Each backend is a factory function in `createWallet()`.

### Formal NIP proposal

The six NVM event kinds (31900-31905) work today as application-specific events. For broader adoption, write a NIP (Nostr Implementation Proposal) specifying:

- Tag schemas for each kind
- Dual-signature verification protocol (kind-31901)
- Expected relay behavior for parameterized replaceable events
- Interaction with NIP-90 (DVM) and NIP-57 (zaps)

Draft in `docs/nips/nip-nvm.md`. Submit to `nostr-protocol/nips` repo.

### Thermodynamic adoption layer

`plan/13-THERMODYNAMIC-ADOPTION.md` describes agent temperature, Gibbs free energy for task-agent matching, and entropy-driven exploration. The NVM's `adaptiveExplorationRate()` in `nvm/src/routing/scoring.ts` is the first step — it adjusts exploration based on quality score volatility. The full thermodynamic model would replace the flat exploration rate with temperature-aware Boltzmann selection across the entire routing decision.

### Dynamic DAGs (runtime pipeline modification)

Current pipelines (kind-31904) are static: you define the DAG, it runs. Dynamic DAGs would allow:

- Conditional branches (if node A score > threshold, skip node B)
- Loop nodes (retry with exponentially increasing budget)
- Runtime node insertion (agent discovers it needs a sub-task)

The `PipelineExecutor` in `nvm/src/orchestrator/executor.ts` would need a `modifyDAG()` hook and support for kind-31904 updates mid-execution.

### Agent guilds and specialization markets

Groups of agents that coordinate internally before competing externally. A guild has a shared reputation, shared capacity pool, and internal job routing. The relay sees the guild as a single agent; internally the guild has its own BPE instance.

Would need: kind-31906 (guild attestation), guild-level EWMA aggregation in `CapacityIndex`, and a guild membership protocol.

### Physical IoT integration

The research-6 proposal describes capacity attestations from physical devices (compute nodes, storage, bandwidth). The kind-31900 schema already supports this — `skillType` can be `compute-gpu-a100` or `storage-s3-compatible`. What's missing:

- Hardware attestation (proving you actually have the GPU, not just claiming it)
- Bandwidth measurement protocol
- Physical-world latency measurement vs. Nostr message propagation delay

### Gateway NVM consumer refactor

The HTTP gateway at `gateway/` currently routes via its own provider scoring. It could consume NVM events instead:

- Subscribe to kind-31900 attestations from LLM providers running as NVM agents
- Use the BPE router (`nvm/src/routing/router.ts`) for provider selection
- Publish kind-31901 receipts after each completion
- Settle via NIP-57 zaps instead of tracking USD spend

This makes the gateway a thin NVM client rather than a standalone routing engine. Both modes should coexist during transition.

### SDK Nostr transport

The SDK (`sdk/`) currently talks to Base contracts via ethers.js. Add a Nostr transport layer:

- `sdk/src/transports/nostr.ts` wrapping `NostrClient`
- Same action module interface, different backend
- Agent chooses transport at init: `createAgent({ transport: 'nostr' })` or `createAgent({ transport: 'base' })`

### Relay federation

Multiple Agent Relays sharing capacity indices. When relay A has no agents for a skill, it forwards to relay B. Needs:

- Relay discovery (kind-31907 relay attestation?)
- Inter-relay capacity gossip protocol
- Split routing fees between forwarding and executing relays

### Agent reputation portability

An agent's quality score (kind-31902) is currently relay-local. For scores to be portable across relays:

- Standardize the composite score formula across implementations
- Cryptographic proof of completion count (aggregate Schnorr sigs?)
- Sybil resistance for score bootstrapping (new agents with no history)
