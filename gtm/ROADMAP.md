# GTM execution plan

Current state and next steps. Updated March 2026.

---

## What exists today

- 32 Solidity contracts on Base Sepolia (8 core + 5 v2 + 3 thermodynamic + 16 research/adapter), verified on Basescan
- 319 passing tests across all test suites
- TypeScript SDK with 24 action modules
- LLM inference gateway at api.pura.xyz with 4 providers (OpenAI, Anthropic, Groq, Gemini)
- Automatic task complexity scoring: routes cheap tasks to Groq/Gemini, complex tasks to OpenAI/Anthropic
- Per-request cost headers (X-Pura-Model, X-Pura-Cost, X-Pura-Tier, X-Pura-Budget-Remaining)
- Daily budget enforcement with 402 Payment Required on exhaustion
- Lightning settlement via LNbits (prepaid sat wallet, async deduction, no inference blocking)
- 5,000 free requests per key before payment wall
- OpenClaw skill for agent distribution (auth, budget alerts, cost reports, wallet management)
- Cost report endpoint (GET /api/report) with per-model spend breakdowns
- Provider status endpoint (GET /api/status) with time-bucketed latency/availability
- Next.js site (pura.xyz) with docs, blog, paper, interactive playground, status page, gateway page
- Research paper with formal Lyapunov proofs
- Agent-based simulation validating throughput optimality
- Self-audit + Aderyn static analysis complete (0 exploitable findings)
- 11 blog posts covering gateway, protocol theory, relay economics, Lightning, OpenClaw, verification
- Three reference dashboards: relay-dash, lightning-dash, agent-explorer
- NVM advanced systems: credit graph, capacity futures, self-spawning agents, reputation substrate, cross-relay bridging, protocol negotiation, skill genomes (7 systems, 13 new event kinds 31910-31922)
- Evolution dashboard at /evolution (force-directed phylogeny visualization)
- 82 passing NVM tests across 10 test files

The product is the gateway. The protocol and contracts are the mechanism underneath.

---

## Lessons learned (March 2026)

- HN Show HN posted with protocol-math-first angle — no traction. The retry leads with the gateway product.
- Discord community posting triggered an immediate 24h timeout. Discord channels dropped permanently.
- Twitter/Bluesky/Nostr accounts have <30 followers — standalone posts get zero organic reach. Engagement-first until follower base grows.
- LinkedIn (~3000 followers) is the only channel with real distribution. Primary posting channel.
- Protocol framing ("backpressure routing for AI agent payments") does not convert. Product framing ("LLM gateway that saves you money") does.

---

## Phase 0: shipped

| Action | Status |
|--------|--------|
| Gateway with 4 providers, complexity scoring, budget enforcement | Done |
| Lightning settlement via LNbits | Done |
| OpenClaw skill | Done |
| Cost report + status endpoints | Done |
| Homepage rewrite: gateway-first hero, OpenClaw/Lightning CTAs | Done |
| Gateway landing page at /gateway | Done |
| Status page at /status | Done |
| Getting-started docs for gateway, OpenClaw, full protocol | Done |
| Blog post: "We built 32 contracts. The first product is an LLM gateway." | Done |
| All content AISLOP-compliant | Done |

## Phase 1: LinkedIn + content (days 1-7)

LinkedIn is the primary distribution channel (~3000 followers). All other channels are secondary.

| Action | Asset |
|--------|-------|
| Post LinkedIn 1 — the gateway product | `gtm/community-posts.md` |
| Post LinkedIn 2 — cost savings data | `gtm/community-posts.md` |
| Post LinkedIn 3 — building in public | `gtm/community-posts.md` |
| Post LinkedIn 4 — OpenClaw + Lightning | `gtm/community-posts.md` |
| Publish blog post (website + Mirror/Paragraph cross-post) | `pura/content/blog/power-grid-agents.mdx` |
| Deploy feedback form on Tally | `gtm/feedback-form.md` |

Space LinkedIn posts 2-3 days apart. URLs in first comment only. Do not post on weekends.

## Phase 2: Twitter/Bluesky/Nostr engagement (days 1-14, parallel)

With <30 followers, original posts get no reach. Strategy is engagement-first.

| Action | Notes |
|--------|-------|
| Identify 20-30 accounts posting about LLM routing, AI infra, agent frameworks | — |
| Reply with substantive takes daily | Actual insight, not self-promotion |
| Quote-tweet relevant threads with gateway angle | Shows up in THEIR followers' feeds |
| Post 1 original tweet/day as building-in-public breadcrumbs | For profile credibility |
| Cross-post identical content to Bluesky and Nostr | Zero marginal effort |
| Post Twitter thread when follower count breaks ~100 | `gtm/twitter-thread.md` |

## Phase 3: Reddit (days 7-14, staggered)

Reddit replaces Discord. Space posts 5-7 days apart.

| Action | Notes |
|--------|-------|
| Comment on existing posts in target subs first | Build comment history |
| Post to r/LocalLLaMA — "I built an LLM gateway that picks the cheapest model for each task" | Feedback request, not announcement |
| Post to r/LangChain — OpenClaw skill integration angle | — |
| Post to r/ethereum or r/ethdev — on-chain capacity routing mechanism | Different audience |

## Phase 4: direct outreach (days 1-14, parallel — highest ROI)

DMs work regardless of follower count. Highest-conversion channel.

| Action | Asset |
|--------|-------|
| Identify 10 people to DM (agent framework builders, OpenClaw devs, LLM-heavy operators) | `gtm/outreach-dm.md` |
| Send 3-5 personalized DMs per day (Twitter + LinkedIn) | Templates in `gtm/outreach-dm.md` |
| LinkedIn connection requests with note | Leverages 3k network |
| Pinata/OpenClaw in-person outreach (Omaha connection) | `gtm/outreach-dm.md` |
| Offer live pairing sessions ("try the gateway in 2 minutes") | pura.xyz/gateway as call script |
| Track funnel: DMs sent, replies, calls booked, API keys created, cost reports generated | Spreadsheet |
| Follow up once after 5 days on unanswered DMs | — |

Target: people running agents that make LLM calls. The pitch: "Your agents are probably overpaying for simple tasks. Here's a gateway that routes cheap tasks to Groq and complex ones to Anthropic. Free for 5,000 requests."

Success signal: 1+ external agent running through the gateway overnight with a cost report showing savings.

## Phase 5: grants (days 1-14, parallel)

| Action | Asset |
|--------|-------|
| Submit Base Builder Grant | `gtm/grant-base.md` |
| Submit Superfluid Ecosystem Grant | `gtm/grant-superfluid.md` |
| Submit OpenClaw Grant | `gtm/grant-openclaw.md` |

Lead every grant touchpoint with the gateway demo and a real cost report. Show the E2E proof: agent ran overnight, gateway routed across 4 providers, cost report shows per-model breakdown, Lightning settled.

## Phase 6: HN retry + paper (days 14-28)

| Action | Asset |
|--------|-------|
| Repost to HN with product-first framing | `gtm/community-posts.md` |
| Split paper: Paper 1 (core BPE), Paper 2 (thermodynamic extensions) | `docs/paper/` |
| Submit Paper 1 to arXiv (cs.GT primary, cs.DC secondary) | — |
| Announce paper on LinkedIn + X/Bluesky | — |
| Identify conference CFP (AFT 2026, IEEE S&B, token engineering) | — |

## Phase 7: harden from feedback (days 14-30)

| Action | Asset |
|--------|-------|
| Triage pilot feedback: blockers first, then UX friction | — |
| Publish SDK to npm | `sdk/` |
| Add providers based on demand (Mistral, Cohere, local models) | `gateway/lib/providers/` |
| On-chain settlement rail (Superfluid streaming) as second SettlementProvider | `gateway/lib/settlement.ts` |

## Phase 8: NVM advanced systems content (days 14-30)

| Action | Asset |
|--------|-------|
| Publish blog post: "Seven systems that turn an agent relay into an economy" | `pura/content/blog/nvm-advanced-systems.mdx` |
| LinkedIn post: agent credit, spawning, evolution viz | `gtm/community-posts.md` |
| Twitter thread: the 7 systems + evolution dashboard demo | `gtm/twitter-thread.md` |
| Post to r/LocalLLaMA or r/autonomous_agents — self-spawning agents angle | Feedback request |
| Grant update to Base/Superfluid with advanced systems progress | — |
| Demo video: evolution dashboard with live spawn events | pura.xyz/evolution |

Lead with the evolution visualization — it's the most visually striking output. Credit lines and spawning are the two systems most likely to resonate with agent framework builders.

---

## Channels dropped

| Channel | Reason | Revisit? |
|---------|--------|----------|
| Discord (LangChain, Superfluid, Base) | Account timed out on first post | No |
| HN (protocol-math angle) | Posted March 2026, no traction | Yes — product-first retry |

## Explicitly deferred

- Mainnet deployment: until 3+ gateway users and grant funding confirmed
- Third-party security audit: until grant funding lands
- Python SDK: until builders specifically ask for it
- Nostr relay and Lightning domain pilots: until gateway has traction
- NIP-XX standardization: until relay operators are engaged
- Stripe/card payments: Lightning-only for now, revisit at 10+ paid users
- Revenue infrastructure: until 10+ active users

---

## Decisions made

- Voice: first person singular for DMs, third person for public content
- Primary target: developers running LLM-heavy agents (OpenClaw, LangChain, CrewAI)
- Lead with the gateway product, not the protocol math
- Lightning-only settlement, no Stripe. Free tier (5,000 requests) covers adoption friction.
- Non-AI domains (relay economics, Lightning routing): research modules, ship after gateway traction
- All content complies with AISLOP.md

## Quick reference

| Asset | Location |
|-------|----------|
| Gateway blog post | `pura/content/blog/power-grid-agents.mdx` |
| Advanced systems blog post | `pura/content/blog/nvm-advanced-systems.mdx` |
| Twitter thread | `gtm/twitter-thread.md` |
| Community posts | `gtm/community-posts.md` |
| Outreach DMs | `gtm/outreach-dm.md` |
| Feedback form | `gtm/feedback-form.md` |
| Base grant | `gtm/grant-base.md` |
| Superfluid grant | `gtm/grant-superfluid.md` |
| OpenClaw grant | `gtm/grant-openclaw.md` |
| AISLOP rules | `gtm/AISLOP.md` |
| This plan | `gtm/ROADMAP.md` |
