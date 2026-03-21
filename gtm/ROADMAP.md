# GTM execution plan

Current state and next steps. Updated March 2026.

---

## What exists today

- 22 Solidity contracts on Base Sepolia (8 core + 14 research modules), verified on Basescan
- 213 passing tests across 21 test suites
- TypeScript SDK with 18 action modules
- Next.js website with docs, blog, paper, interactive playground, and live router dashboard
- Mandalay reference gateway: single endpoint, multi-provider capacity-aware routing
- EconomyFactory: deploy a full economy in one transaction (4 templates)
- Research paper with formal Lyapunov proofs
- Agent-based simulation validating throughput optimality
- Self-audit + Aderyn static analysis complete (0 exploitable findings)
- GTM content: blog post, Twitter thread, LinkedIn posts, community posts, DM templates, feedback form, 3 grant applications
- Design system extracted (tokens, components, agent prompt) for unified branding across Backproto, Buildlog, VR
- Three reference products: AID Station (aidstation.app, Nostr relay dash), Spilt (spilt.dev, Lightning routing dash), DarkSource (darksource.ai, agent reputation explorer)
- vr.dev absorbed into monorepo: Python SDK (38 verifiers, 19 domains), website, evidence chain. SDK bridge (`verify.ts`) connects vr.dev evidence hashes to CompletionTracker receipts and OpenClaw reputation. MerkleRootAnchor contract deployed for shared evidence anchoring.
- Three additional blog posts: relay economics, Lightning capacity signals, OpenClaw reputation
- Getting-started guide for OpenClaw agent operators
- Community posts and DM templates for Nostr, Lightning, and OpenClaw audiences

Backproto now covers four domains: AI agent routing (Mandalay), Nostr relay economics (AID Station), Lightning routing (Spilt), and agent reputation (DarkSource). The Nostr and Lightning integrations are no longer deferred research modules.

---

## Lessons learned (March 2026)

- HN Show HN posted with protocol-math-first angle — no traction. Too academic. Retry scheduled for early April with product-first framing (Mandalay, not Tassiulas-Ephremides).
- Discord community posting triggered an immediate 24h timeout. Discord channels are dropped from the plan entirely.
- Twitter/Bluesky/Nostr accounts have <30 followers — standalone posts get zero organic reach. Strategy shifted to engagement-first (reply game) until follower base grows.
- LinkedIn (~3000 followers) is the only channel with real distribution. Prioritized as primary posting channel.

---

## Phase 0: pre-launch

| Action | Status |
|--------|--------|
| CI pipeline (forge test, SDK type-check, web build) | Done |
| AISLOP compliance pass on all content | Done |
| Homepage restructure: AI-agent-forward hero, interactive playground, stack section | Done |
| Playground page at /playground | Done |
| All GTM files rewritten, AISLOP-compliant | Done |
| CHANGELOG.md created | Done |
| Mandalay gateway shipped with animated flow diagram, FAQ, API key gen | Done |

## Catalini / a16z window (days 1-14, urgent)

Catalini et al. published "Some Simple Economics of AGI" (arXiv:2602.20946v2) in February 2026. a16z crypto podcast ("AI just gave you superpowers — now what?") aired March 18, 2026. Both converge on verification cost as the binding constraint for agent economies and blockchain/stablecoins as the settlement layer. Backproto's mechanism design directly implements what both describe.

Content window is 2-4 weeks from March 21. Full ops plan in `gtm/swarm-catalini.md`.

| Action | Asset | Status |
|--------|-------|--------|
| Publish verification-bottleneck blog post | `web/content/blog/verification-bottleneck.mdx` | |
| LinkedIn post (Catalini mapping) | `gtm/swarm-catalini.md` | |
| Twitter thread (7 tweets) | `gtm/swarm-catalini.md` | |
| LinkedIn connection request to Catalini | `gtm/swarm-catalini.md` | |
| Reply to Catalini-related threads | `gtm/swarm-catalini.md` | |
| Update grant narratives with Catalini framing | `gtm/swarm-catalini.md` | |

## Phase 1: LinkedIn + content (days 1-7)

LinkedIn is the primary distribution channel (~3000 followers). All other channels are secondary.

| Action | Asset | Status |
|--------|-------|--------|
| Post LinkedIn 1 — reliability problem | `gtm/community-posts.md` | |
| Post LinkedIn 2 — Mandalay product | `gtm/community-posts.md` | |
| Post LinkedIn 3 — building in public | `gtm/community-posts.md` | |
| Post LinkedIn 4 — the stack | `gtm/community-posts.md` | |
| Publish blog post (website + Mirror/Paragraph cross-post) | `gtm/blog-post.md` | |
| Deploy feedback form on Tally | `gtm/feedback-form.md` | |
| Confirm Mandalay gateway is live at mandalay.dev | `gateway/` | |

Space LinkedIn posts 2-3 days apart. URLs in first comment only. Do not post on weekends.

## Phase 2: Twitter/Bluesky/Nostr engagement (days 1-14, parallel)

With <30 followers, original posts get no reach. Strategy is engagement-first.

| Action | Notes |
|--------|-------|
| Identify 20-30 accounts posting about multi-agent systems, LLM routing, AI infra, streaming payments | — |
| Reply with substantive takes in relevant conversations daily | Not "check out my project" — actual insight |
| Quote-tweet relevant threads with own angle | Shows up in THEIR followers' feeds |
| Post 1 original tweet/day as building-in-public breadcrumbs | For profile credibility, not reach |
| Cross-post identical content to Bluesky and Nostr | Zero marginal effort |
| Post Twitter thread when follower count breaks ~100 | `gtm/twitter-thread.md` |

## Phase 3: Reddit (days 7-14, staggered)

Reddit replaces Discord as community channel. Space posts 5-7 days apart.

| Action | Notes |
|--------|-------|
| Comment on existing posts in target subs first | Build comment history |
| Post to r/LocalLLaMA or r/LangChain — feedback request frame | Not an announcement |
| Post to r/ethereum or r/ethdev — mechanism design review | Different angle |
| Post to r/MachineLearning if first two get traction | — |

## Phase 4: direct outreach (days 1-14, parallel — highest ROI)

DMs work regardless of follower count. This is the highest-conversion channel.

| Action | Asset |
|--------|-------|
| Identify 10 people to DM (LangChain/CrewAI builders, Base builders, Superfluid users) | `gtm/outreach-dm.md` |
| Send 3-5 personalized DMs per day (Twitter + LinkedIn) | Templates in `gtm/outreach-dm.md` |
| LinkedIn connection requests with note — leverages 3k network | — |
| Pinata/OpenClaw in-person outreach (Omaha connection) | `gtm/outreach-dm.md` |
| Offer live pairing sessions ("deploy a BPE economy in 30 min") | `web/content/docs/getting-started.mdx` as call script |
| Track funnel: DMs sent, replies, calls booked, testnet deploys, feedback forms | Spreadsheet |
| Follow up once after 5 days on unanswered DMs | — |

Target: people who have discussed agent payment coordination, multi-agent orchestration costs, or fair-distribution problems publicly.

Success signal: 1+ external testnet deploy and 1+ completed feedback form.

## Phase 5: grants (days 1-14, parallel)

| Action | Asset |
|--------|-------|
| Submit Base Builder Grant | `gtm/grant-base.md` |
| Submit Superfluid Ecosystem Grant | `gtm/grant-superfluid.md` |
| Submit OpenClaw Grant | `gtm/grant-openclaw.md` |

Lead every grant touchpoint with the live Mandalay demo and playground link. Reference the three new products as proof of cross-domain applicability.

## Phase 5a: reference products (parallel with grants)

Three reference products shipped, each demonstrating the Backproto mechanism in a different domain.

| Product | Domain | URL | Folder |
|---------|--------|-----|--------|
| AID Station | Nostr relay capacity | aidstation.app | `relay-dash/` |
| Spilt | Lightning routing | spilt.dev | `lightning-dash/` |
| DarkSource | Agent reputation | darksource.ai | `agent-explorer/` |

Each product has: Next.js dashboard, API route reading on-chain state, setup script for demo data, README.

| Action | Status |
|--------|--------|
| relay-dash scaffold + dashboard + API | Done |
| lightning-dash scaffold + dashboard + route explorer | Done |
| agent-explorer scaffold + dashboard + API | Done |
| Setup scripts for demo data seeding | Done |
| Blog posts: relay-economics, lightning-capacity-signals, openclaw-reputation | Done |
| getting-started-openclaw.mdx | Done |
| Community posts: Nostr activated, Lightning activated, OpenClaw added | Done |
| DM templates: relay operator, Lightning node operator, agent framework dev | Done |
| Product-specific social posts (4 posts) | Done |

## Phase 6: HN retry + paper (days 14-28)

| Action | Asset |
|--------|-------|
| Repost to HN with product-first framing (early April) | `gtm/community-posts.md` (HN retry section) |
| Add theory-to-implementation section to paper | `docs/paper/main.tex` |
| Add Celer/Spider citations | `docs/paper/bpe.bib` |
| Submit to arXiv (cs.GT primary, cs.DC secondary) | — |
| Announce paper on LinkedIn + X/Bluesky | — |
| Identify conference CFP (AFT 2026, IEEE S&B, token engineering) | — |

## Phase 7: harden from feedback (days 14-30)

| Action | Asset |
|--------|-------|
| Triage pilot feedback: blockers first, then UX friction, then missing features | — |
| Publish SDK to npm | `sdk/` |
| Harden EconomyFactory onboarding from pairing session observations | `web/content/docs/economy-factory.mdx` |

---

## Channels dropped

| Channel | Reason | Revisit? |
|---------|--------|----------|
| Discord (LangChain, Superfluid, Base) | Account timed out immediately on first post | No — risk of permanent ban |
| HN (protocol-math angle) | Posted March 2026, no traction | Yes — retry early April with product-first framing |
| Nostr-dev Discord, Lightning-dev Discord | Research modules, deferred until AI agent traction | Later |

## Explicitly deferred

- Mainnet deployment: until 3+ testnet users and grant funding confirmed
- Third-party security audit: until grant funding lands
- Python SDK: until AI agent builders specifically ask for it
- Nostr relay and Lightning domain pilots: until AI agent domain has traction
- NIP-XX standardization: until relay operators are engaged
- v0.2 features (pricing mechanism, multi-hop routing): until v0.1 validated
- Revenue or billing infrastructure: until 10+ active users

---

## Decisions made

- Voice: first person singular for DMs, third person for public content
- Primary target: AI agent builders
- Non-AI domains: research modules, ship after AI agent traction
- All content complies with AISLOP.md
- Stack narrative: Buildlog captures, VR verifies, Backproto pays

## Quick reference

| Asset | Location |
|-------|----------|
| Blog post | `gtm/blog-post.md` |
| Twitter thread | `gtm/twitter-thread.md` |
| Community posts | `gtm/community-posts.md` |
| Outreach DMs | `gtm/outreach-dm.md` |
| Feedback form | `gtm/feedback-form.md` |
| Base grant | `gtm/grant-base.md` |
| Superfluid grant | `gtm/grant-superfluid.md` |
| OpenClaw grant | `gtm/grant-openclaw.md` |
| AISLOP rules | `gtm/AISLOP.md` |
| Design system | `designsystem/` |
| This plan | `gtm/ROADMAP.md` |
