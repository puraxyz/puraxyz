import type { Objection } from "./types";

export const objections: Objection[] = [
  {
    id: "why-blockchain",
    challenge: "Why does this need a blockchain? Can't you just use a load balancer?",
    response:
      "A load balancer routes requests, not payments. The routing signal and the payment need to be the same mechanism — when you send money to an agent, that is simultaneously a demand signal. If routing and payment are separate systems, they drift out of sync. On-chain settlement via Superfluid GDA means the payment itself is the routing primitive. The capacity signal, the payment distribution, and the verification receipts all live on the same ledger. No reconciliation needed. Plus: slashing for underperformance requires a staking mechanism, which requires a shared ledger with economic finality.",
    evidence:
      "Dixon and Lazzarin (a16z, March 2026) independently arrived at the same conclusion: blockchain is the financial API for autonomous software. The argument is not 'decentralization for its own sake' — it is that payment and routing co-located on one ledger eliminates reconciliation failure modes.",
    sources: [
      "plan/00-DECISIONS.md",
      "gtm/swarm-catalini.md",
    ],
  },
  {
    id: "novel-math",
    challenge: "Is the math actually novel? You're applying a 1992 algorithm.",
    response:
      "The algorithm is not novel. The domain transfer is. Nobody has applied Tassiulas-Ephremides backpressure routing to monetary flows. The engineering contribution is solving the problems that arise in the domain transfer: you cannot drop money like packets (solution: escrow buffer), you need Sybil resistance for capacity claims (solution: concave cap + minimum stake), and you need verification that claimed capacity is real (solution: CompletionTracker with auto-slashing). We are honest about what is and is not novel — see the novelty assessment doc.",
    evidence:
      "The novelty assessment (plan/01-NOVELTY-ASSESSMENT.md) explicitly lists what is not novel: the algorithm, the proofs, streaming payments, token modeling. What is novel: the domain transfer, the escrow buffer design, the Sybil-resistant capacity cap, and the demurrage-backpressure distinction as orthogonal mechanisms.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
    ],
  },
  {
    id: "oracle-centralization",
    challenge: "The capacity oracle is centralized. How is this decentralized?",
    response:
      "It is centralized in v0.1. We are honest about that. The oracle is the main centralization risk, and it is documented as gap G9 in the protocol spec. The mitigation path: v0.1 uses a single oracle with commit-reveal for MEV protection. v0.2 moves to multi-oracle with threshold signatures. The backpressure algorithm itself is inherently decentralized (each node only needs local queue information), so the centralization is in the input layer, not the routing logic.",
    evidence:
      "Documented in plan/08-GAPS-AND-MITIGATIONS.md as G9: 'Acceptable for v0.1. Path: single oracle → multi-oracle → on-chain EWMA.' The OffchainAggregator can fall back to individual commit-reveal if the aggregator goes down.",
    sources: [
      "plan/08-GAPS-AND-MITIGATIONS.md",
    ],
  },
  {
    id: "agent-lying",
    challenge: "What happens when an agent lies about its capacity?",
    response:
      "It loses money. If an agent claims high capacity but fails to complete tasks, the CompletionTracker detects it within 3 epochs (about 15 minutes). Completion rate below 50% for 3 consecutive epochs triggers automatic 10% stake slashing. If slashing drops their stake below the minimum (S_min), they are deregistered from the pool entirely. The staking requirement means overclaiming capacity is a money-losing strategy.",
    evidence:
      "CompletionTracker is tested in the contract test suite (part of the 213 passing tests). The slashing mechanism was specifically designed to be conservative — 50% threshold across 3 epochs gives agents time to recover from temporary issues while catching persistent liars.",
    sources: [
      "contracts/src/core/CompletionTracker.sol",
      "plan/03-PROTOCOL-SPEC.md",
    ],
  },
  {
    id: "cold-start",
    challenge: "How do you bootstrap this? No agents will register if there are no payments, and no payments flow if there are no agents.",
    response:
      "Stake-based bootstrap. In v0.1, agents register by staking tokens and declaring capacity. Their capacity cap is limited by their stake (sqrt formula) until they build a track record of completions. The reference products (Mandalay, Relay.Gold, etc.) serve as the initial demand side — they generate real payment streams to real agents. The bit.recipes project will lower the barrier further: deploy a complete backpressure economy from a YAML spec in a single transaction.",
    evidence:
      "The Mandalay gateway already routes real LLM completion requests through the protocol. It generates actual payment streams that flow through the BackpressurePool to provider sinks. This is not hypothetical demand — it is a working product with a revenue model.",
    sources: [
      "plan/08-GAPS-AND-MITIGATIONS.md",
      "gateway/README.md",
    ],
  },
  {
    id: "one-person",
    challenge: "This is built by one person. Can it be trusted?",
    response:
      "The code is MIT licensed and open source. The contract audit uses Aderyn static analysis (0 exploitable findings) plus a documented self-audit. The math is not new — it relies on 30+ years of proven network theory (Tassiulas 1992, Neely 2010, Kelly 1998). The contracts are immutable (no upgradeable proxies), deployed on testnet, and verified on Basescan. Anyone can read every line of code and every test. Mainnet deployment is explicitly deferred until third-party audit and grant funding.",
    evidence:
      "213 passing tests across 21 suites. Self-audit (contracts/AUDIT-SELF.md) and Aderyn report (contracts/AUDIT-ADERYN.md) are public. The decision to defer mainnet until third-party audit is documented in the roadmap.",
    sources: [
      "contracts/AUDIT-SELF.md",
      "contracts/AUDIT-ADERYN.md",
      "gtm/ROADMAP.md",
    ],
  },
  {
    id: "why-not-existing",
    challenge: "Why not use an existing payment routing protocol?",
    response:
      "None exist for this specific problem. Google AP2, Coinbase x402, OpenAI-Stripe ACP, and Visa TAP all handle payment authorization — can this agent pay? Is this payment valid? None of them handle what happens when the agent you are paying is at capacity. There is no reroute mechanism, no upstream throttle signal, no capacity-weighted distribution. Backproto is orthogonal to these protocols: it sits between the authorization layer and the work execution layer.",
    evidence:
      "The novelty assessment documents the gap: 'Agent payment ecosystem (March 2026): Google AP2, Coinbase x402, OpenAI-Stripe ACP, Visa TAP all focus on authorization/trust. None address flow control.'",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
    ],
  },
  {
    id: "scale-concerns",
    challenge: "Does this scale? On-chain capacity updates every 300 seconds seems slow and expensive.",
    response:
      "300 seconds is the right granularity for economic routing. AI agent tasks take seconds to minutes. You do not need millisecond capacity updates for payment routing — you need epoch-level accuracy. On gas: the OffchainAggregator batches all capacity updates into a single transaction via EIP-712 signatures, reducing cost by 83.5% (from ~58k gas per sink to ~9.6k gas for 50 sinks). On Base L2, that is a fraction of a cent per epoch. If faster updates are needed, the epoch length is a governance parameter.",
    evidence:
      "Gas benchmarks documented in GAS-BENCHMARKS.md. Base L2 gas costs: ~0.001 gwei per gas unit. At 9.6k gas per rebalance, that is effectively free. 300-second epochs mean 288 rebalances per day — well within L2 capacity.",
    sources: [
      "GAS-BENCHMARKS.md",
      "plan/08-GAPS-AND-MITIGATIONS.md",
    ],
  },
  {
    id: "testnet-only",
    challenge: "It's only on testnet. When mainnet?",
    response:
      "Mainnet is gated on two things: 3+ external testnet users and grant funding for a third-party audit. This is deliberate. Deploying real money through a protocol that has not been independently audited would be irresponsible. The contracts are immutable (no proxies), so a post-deploy bug means redeployment, not upgrade. We want at least 3 independent builders running on testnet before committing real capital to mainnet deployment and audit costs.",
    evidence:
      "Mainnet criteria documented in gtm/ROADMAP.md: '3+ testnet users + grant funding → mainnet deploy.' Third-party audit, mainnet gas, and SDK documentation are the named grant fund uses.",
    sources: [
      "gtm/ROADMAP.md",
    ],
  },
  {
    id: "overcomplicated",
    challenge: "This seems overcomplicated for what it does.",
    response:
      "The core mechanism is simple: a Superfluid pool where member weights change based on capacity signals. One contract reads capacity, one contract distributes payment. The complexity comes from making it production-ready: Sybil resistance (StakeManager + concave cap), verification (CompletionTracker), gas optimization (OffchainAggregator), overflow handling (EscrowBuffer), and multi-stage pipelines (Pipeline). Each piece addresses a specific failure mode. The 22 contracts include 5 domain extensions (Nostr, Lightning, demurrage, platform, composition) that are optional modules, not core requirements. The core is 8 contracts.",
    evidence:
      "The 8 core contracts handle registration, staking, capacity reading, payment distribution, overflow, pricing, verification, and gas optimization. Everything else is an extension. You can deploy just the core for a functional backpressure economy.",
    sources: [
      "plan/04-CONTRACTS-BLUEPRINT.md",
      "OWNERS-MANUAL.md",
    ],
  },
  {
    id: "competition",
    challenge: "What if Superfluid or Coinbase builds this?",
    response:
      "We would welcome it. The protocol is MIT licensed specifically so that if Superfluid, Coinbase, or anyone else wants to build capacity-weighted routing, they can use our code and research. The goal is to prove the mechanism works, not to own the market. That said, Superfluid builds payment infrastructure, not routing algorithms. Coinbase builds payment rails, not congestion control. Neither team has network theory expertise as their core competency. Backproto fills a gap in their stack — it is more likely to become a module they integrate than a product they build from scratch.",
    evidence:
      "The project is positioned for ecosystem integration, not competition. Grant applications to both Base Builder and Superfluid Ecosystem frame it as adding value to their platforms.",
    sources: [
      "gtm/grant-base.md",
      "gtm/grant-superfluid.md",
    ],
  },
  {
    id: "demand-exists",
    challenge: "Does anyone actually need this? Are AI agents really paying each other?",
    response:
      "They are starting to. Google, Coinbase, OpenAI, Stripe, and Visa all launched agent payment protocols between 2025 and 2026. The flow control problem only surfaces at scale — when multiple agents compete for the same service with finite capacity. Today it is early, but the infrastructure is being built now, before the bottleneck hits. The Mandalay gateway already routes real LLM requests through a backpressure pool and generates actual payment streams.",
    evidence:
      "Google AP2, Coinbase x402, OpenAI-Stripe ACP, Visa TAP all launched within 12 months. Each handles authorization. Flow control is the gap. Mandalay demonstrates real demand with real API calls routed through real on-chain capacity weights.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
      "gateway/README.md",
    ],
  },
];
