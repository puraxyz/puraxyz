import type { Briefing } from "./types";

export const briefings: Briefing[] = [
  // ── Value proposition ─────────────────────────────────────────
  {
    id: "what-is-backproto",
    title: "What Backproto is",
    audiences: ["general", "investor", "builder", "grant-reviewer"],
    scenarios: ["elevator-pitch", "5-min-pitch", "grant-app"],
    headline:
      "Backproto routes payments to AI agents based on who actually has spare capacity, using a proven algorithm from network theory.",
    elevator:
      "AI agents are starting to pay each other in real time via streaming payments. But there is no flow control. When an agent gets overloaded, the payment stream keeps flowing in with no reroute, no throttle, no feedback signal. Backproto applies backpressure routing (Tassiulas-Ephremides, 1992) to monetary flows: agents declare spare capacity backed by a staked deposit, the protocol tracks actual completions, and a smart contract pool distributes incoming payments proportional to verified capacity. Busy agents get less. Available agents get more. Automatically.",
    detail:
      "The protocol runs on Superfluid GDA pools on Base L2. A BackpressurePool contract wraps a Superfluid Distribution Pool where member units (payment shares) are dynamically adjusted by a capacity oracle. Agents register as sinks in a CapacityRegistry, post capacity signals smoothed with EWMA (alpha=0.3), and back their claims with stake. A CompletionTracker records dual-signed completion receipts per epoch (300 seconds). Agents below 50% completion rate for 3 consecutive epochs get 10% of their stake slashed. When all sinks are saturated, overflow goes to an EscrowBuffer that drains FIFO when capacity opens up. The system achieves 95.7% allocation efficiency in simulation (vs 93.5% for round-robin), recovers from 20% node-kill shocks within 50 steps, and keeps buffer stall rates under 9%.",
    sources: [
      "plan/00-DECISIONS.md",
      "plan/03-PROTOCOL-SPEC.md",
      "gtm/blog-post.md",
    ],
  },
  {
    id: "one-liner",
    title: "The one-liner",
    audiences: ["general", "investor", "builder"],
    scenarios: ["elevator-pitch"],
    headline:
      "Send more money to the agents who have the most spare capacity. Automatically.",
    elevator:
      "Backproto applies backpressure routing from network theory to monetary flows. Think TCP congestion control, but for AI agent payments. When downstream agents hit capacity, payment reroutes to agents with available headroom, buffers surge, and slashes liars. No coordinator required.",
    detail:
      "The core mechanism: a Superfluid GDA pool where member units are proportional to verified spare capacity. The capacity oracle reads EWMA-smoothed signals from a CapacityRegistry, updates pool unit weights, and the Superfluid protocol handles per-second streaming distribution. The math behind it (Lyapunov drift analysis) proves this achieves throughput-optimal allocation for any stabilizable demand vector.",
    sources: ["gtm/blog-post.md", "gtm/twitter-thread.md"],
  },
  {
    id: "three-project-stack",
    title: "The three-project stack",
    audiences: ["general", "investor", "builder", "grant-reviewer"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "Buildlog records what agents do. VR verifies outcomes. Backproto pays based on verified capacity.",
    elevator:
      "Backproto is the payment routing layer in a three-project stack. Buildlog (buildlog.ai) captures execution trails — what agents did, in what order. VR (vr.dev) verifies that agent output actually changed system state. Backproto routes payments to agents with verified spare capacity. Together: agents that do the work get paid, agents that fake it get slashed, overloaded agents get rerouted around.",
    detail:
      "Each layer operates independently but composes naturally. Buildlog provides the raw execution logs. VR's verification feeds into Backproto's CompletionTracker as proof of actual task completion. Backproto's capacity signals then drive payment allocation. The stack maps directly to Catalini's (2026) framework: Buildlog is the audit trail, VR implements the verification function V(m), and Backproto handles capacity-aware settlement.",
    sources: [
      "gtm/blog-post.md",
      "plan/01-NOVELTY-ASSESSMENT.md",
      "gtm/swarm-catalini.md",
    ],
  },

  // ── How it works ──────────────────────────────────────────────
  {
    id: "five-operations",
    title: "Five operations",
    audiences: ["builder", "engineer", "grant-reviewer"],
    scenarios: ["5-min-pitch", "technical-defense", "grant-app"],
    headline:
      "Declare capacity, track completions, price by congestion, distribute by capacity, buffer overflow.",
    elevator:
      "Five operations make the protocol work: (1) Agents declare spare capacity, backed by a staked deposit. (2) The protocol tracks actual completions and auto-slashes underperformers. (3) Busy agents become more expensive via EIP-1559-style pricing. (4) A smart contract pool distributes incoming payment proportional to verified capacity. (5) Overflow payments sit in escrow until capacity frees up.",
    detail:
      "Operation 1: CapacityRegistry + StakeManager. Sinks register with a task type, post capacity via commit-reveal, min stake S_min required. Operation 2: CompletionTracker. Dual-signed receipts per task, 300-second epochs, auto-slash at <50% rate for 3 epochs. Operation 3: PricingCurve. EIP-1559-style dynamic fee — base fee rises with queue length, falls with surplus capacity (v0.2 enforcement). Operation 4: BackpressurePool. Superfluid GDA where units = C_smooth(i) / sum(C_smooth). Operation 5: EscrowBuffer. FIFO overflow when all sinks saturated, configurable B_max, drains when headroom opens.",
    sources: [
      "plan/03-PROTOCOL-SPEC.md",
      "plan/04-CONTRACTS-BLUEPRINT.md",
      "gtm/blog-post.md",
    ],
  },
  {
    id: "contract-architecture",
    title: "22 contracts across 5 domains",
    audiences: ["engineer", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "8 core BPE contracts, plus domain extensions for demurrage, Nostr relays, Lightning routing, and cross-domain platform.",
    elevator:
      "The contract suite is organized in 5 domains. Core BPE (8 contracts): CapacityRegistry, StakeManager, BackpressurePool, EscrowBuffer, Pipeline, PricingCurve, CompletionTracker, OffchainAggregator. Demurrage (2): DemurrageToken, VelocityMetrics. Nostr (2): RelayCapacityRegistry, RelayPaymentPool. Lightning (3): LightningCapacityOracle, LightningRoutingPool, CrossProtocolRouter. Platform (2): UniversalCapacityAdapter, ReputationLedger. Plus 5 v2 composition contracts: EconomyFactory, QualityScoring, UrgencyToken, VelocityToken, NestedPoolManager.",
    detail:
      "All contracts deployed and verified on Base Sepolia. Solc 0.8.26, Cancun EVM. Built on Superfluid GDA (not CFA) for one-to-many distribution with dynamic unit weights. No upgradeable proxies — immutable contracts for simpler security model. 213 passing tests across 21 test suites. Self-audit plus Aderyn static analysis with 0 exploitable findings. Dependencies: forge-std, Superfluid ethereum-contracts, OpenZeppelin v5 (ERC20, Ownable, ECDSA).",
    sources: [
      "plan/04-CONTRACTS-BLUEPRINT.md",
      "plan/10-CONTRACTS-V2-BLUEPRINT.md",
      "contracts/AUDIT-SELF.md",
      "contracts/AUDIT-ADERYN.md",
    ],
  },
  {
    id: "superfluid-gda",
    title: "Why Superfluid GDA",
    audiences: ["engineer", "builder", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "A BackpressurePool is a Superfluid Distribution Pool where member units are dynamically adjusted by a capacity oracle.",
    elevator:
      "We did not build a new token standard. A Superfluid GDA pool already handles per-second streaming payments, proportional distribution via pool units, and dynamic unit adjustment by pool admin. The only new component is the capacity oracle that maps verified capacity signals to pool unit weights. This gives us real-time payment streaming with zero new token infrastructure.",
    detail:
      "GDA (General Distribution Agreement) is the specific Superfluid primitive we use. Unlike CFA (Constant Flow Agreement) which is point-to-point, GDA supports one-to-many distribution where each member gets shares proportional to their units. The admin (our BackpressurePool contract) can update units at any time, and the Superfluid protocol adjusts payment streams in real time. This is why Base was chosen: Superfluid is deployed there, low gas costs support frequent capacity signal updates, and Coinbase's x402 agent payment standard creates ecosystem adjacency.",
    sources: [
      "plan/00-DECISIONS.md",
      "OWNERS-MANUAL.md",
    ],
  },

  // ── Why now ───────────────────────────────────────────────────
  {
    id: "catalini-timing",
    title: "Catalini convergence",
    audiences: ["investor", "grant-reviewer", "general"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "MIT economists published a model in Feb 2026 predicting the exact infrastructure Backproto already implements.",
    elevator:
      "Catalini, Gans, and Ma published 'Some Simple Economics of AGI' (arXiv:2602.20946v2) in February 2026. Their core argument: verification cost, not production cost, is the binding constraint on task automation. They introduce a measurability parameter 'm' and predict that on-chain verification mechanisms with stablecoin settlement will be the infrastructure for agent economies. Backproto's CompletionTracker is a concrete implementation of their verification function V(m). The Superfluid GDA on Base is the settlement layer they describe.",
    detail:
      "Specific mapping: Catalini's measurability parameter 'm' maps to CompletionTracker's dual-signed receipt system with per-epoch completion rates. Their prediction of high-m vs low-m task separation maps to our task type registry with separate pools per task type. Their stablecoin settlement layer maps to Superfluid GDA streaming on Base L2 at sub-cent marginal cost. Their verification cost as price driver maps to our verificationBudgetBps parameter per pool (informational in v0.1, enforced in v0.2). This is convergent evidence from MIT economics arriving at the same architectural conclusion we already built.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
      "gtm/swarm-catalini.md",
    ],
  },
  {
    id: "a16z-thesis",
    title: "a16z thesis alignment",
    audiences: ["investor", "grant-reviewer"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "a16z described blockchain as 'the financial API for autonomous software' in March 2026. That is literally what Backproto is.",
    elevator:
      "Dixon and Lazzarin (a16z, March 18 2026) described blockchain as the financial API for autonomous software. This is why Backproto builds on Superfluid + Base rather than REST + Stripe. The routing signal and the payment are the same mechanism. When you route payment to an agent, you are simultaneously signaling demand. The protocol makes sure that demand gets served by an agent that actually has capacity.",
    detail:
      "The a16z thesis and the Catalini paper arrive at the same conclusion from different angles. Catalini from the economics of verification, a16z from the architecture of machine-to-machine finance. Both predict on-chain settlement for autonomous agents. Backproto is positioned at their intersection: on-chain verification (CompletionTracker) plus on-chain settlement (Superfluid GDA) plus capacity-aware routing (backpressure algorithm). Two independent authoritative sources validating the same thesis within 30 days of each other.",
    sources: [
      "gtm/swarm-catalini.md",
      "plan/01-NOVELTY-ASSESSMENT.md",
    ],
  },
  {
    id: "agent-payment-gap",
    title: "The flow control gap",
    audiences: ["general", "investor", "builder"],
    scenarios: ["elevator-pitch", "5-min-pitch"],
    headline:
      "Google AP2, Coinbase x402, OpenAI-Stripe ACP, Visa TAP all handle authorization. None handle flow control.",
    elevator:
      "As of March 2026, every agent payment protocol focuses on authorization and trust: can this agent pay? Is this payment valid? None of them address what happens when the agent you are paying is at capacity. There is no reroute, no throttle, no upstream feedback signal. Backproto fills this gap. It is a payment routing protocol with built-in flow control, not another authorization layer.",
    detail:
      "Google AP2 handles agent-to-agent payment authorization. Coinbase x402 adds HTTP-native micropayments for API access. OpenAI-Stripe ACP manages billing and metering. Visa TAP handles card network integration. All of these assume the recipient can handle the payment and the work. None provide a mechanism for what happens when they cannot. Backproto's contribution is orthogonal to these: it sits between the authorization layer and the work layer, routing payment toward available capacity.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
      "gtm/blog-post.md",
    ],
  },

  // ── Traction & proof ──────────────────────────────────────────
  {
    id: "whats-built",
    title: "What is built and shipped",
    audiences: ["investor", "grant-reviewer", "builder"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "22 contracts on Base Sepolia, 213 tests, TypeScript SDK, 5 reference apps, research paper with formal proofs.",
    elevator:
      "This is not a whitepaper project. 22 Solidity contracts are deployed and verified on Base Sepolia. 213 tests pass across 21 test suites. A TypeScript SDK with 18 action modules wraps every contract function. Five reference products demonstrate the mechanism across different domains: Mandalay (LLM gateway), DarkSource (agent reputation), Relay.Gold (Nostr relay economics), Lightning.Gold (Lightning routing), and bit.recipes (pipeline builder, in progress). A 14-section research paper includes formal Lyapunov drift proofs. MIT licensed.",
    detail:
      "Contract audit: self-audit plus Aderyn static analysis scanner with 0 exploitable findings. Simulation: 5 experiments in Python (NumPy, Matplotlib) covering convergence, shock recovery, Sybil attack cost, EWMA parameter sweep, and gas benchmarks. Results: 95.7% allocation efficiency, recovery from 20% node-kill within 50 steps, buffer stall rate 9% (vs 73% without escrow). SDK modules: sink, source, pool, stake, buffer, pricing, completion, aggregator, demurrage, relay, lightning, platform, plus 6 v2 modules. All code is open source under MIT license.",
    sources: [
      "OWNERS-MANUAL.md",
      "contracts/README.md",
      "sdk/README.md",
      "gtm/ROADMAP.md",
    ],
  },
  {
    id: "simulation-results",
    title: "Simulation numbers",
    audiences: ["engineer", "grant-reviewer", "investor"],
    scenarios: ["technical-defense", "grant-app", "5-min-pitch"],
    headline:
      "95.7% allocation efficiency, shock recovery in 50 steps, 9% buffer stall rate.",
    elevator:
      "We ran 5 simulation experiments over 1,000-step horizons with 50 sinks and 10 sources. Backpressure routing achieved 95.7% allocation efficiency versus 93.5% for round-robin and 79.7% for random allocation. The system recovered from 20% sudden node failures within 50 steps. Buffer stall rates stayed at 9% (compared to 73% without the escrow buffer). EWMA alpha=0.3 was empirically optimal, with the 0.2-0.3 range performing best across all metrics.",
    detail:
      "Experiment 1 (convergence): BPE converges to capacity-proportional allocation within 20 steps under stable conditions. Experiment 2 (shock): when 10 of 50 sinks die simultaneously, remaining sinks absorb the load and efficiency recovers within 50 steps. Experiment 3 (Sybil): splitting stake across k sinks yields strictly lower total capacity due to sqrt cap + minimum stake per sink. Break-even does not exist for any k > 1 when S_min > 0. Experiment 4 (EWMA sweep): alpha=0.1 is stable but slow to adapt; alpha=0.7+ oscillates; 0.2-0.3 is the sweet spot. Experiment 5 (gas): off-chain EIP-712 attestation batching saves 83.5% gas versus commit-reveal.",
    sources: [
      "simulation/bpe_sim.py",
      "plan/05-SIMULATION-DESIGN.md",
      "GAS-BENCHMARKS.md",
    ],
  },
  {
    id: "reference-products",
    title: "Five reference products",
    audiences: ["investor", "builder", "grant-reviewer"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "Mandalay, DarkSource, Relay.Gold, Lightning.Gold, and bit.recipes each demonstrate backpressure in a different domain.",
    elevator:
      "Mandalay (mandalay.dev) is a capacity-routed LLM API gateway. You send chat requests, Mandalay checks on-chain capacity weights and routes to the provider with headroom. DarkSource (darksource.ai) lets you browse AI agents registered on-chain, view their capacity metrics, completions, and reputation scores. Relay.Gold (relay.gold) shows real-time Nostr relay capacity, with operators earning payment proportional to verified spare capacity. Lightning.Gold (lightning.gold) explores capacity-weighted multi-hop Lightning routing. bit.recipes is a visual pipeline builder for deploying Backproto economies (in progress).",
    detail:
      "Each product uses the same SDK pattern: getAddresses(chainId) to load contract ABIs, then module-namespaced reads like pool.getMemberUnits(), completion.getCompletionRate(), relay.getRelayOperator(). All are Next.js 16 + React 19 + Viem, deployed on Vercel. Revenue model for Mandalay: 40-60% margin on provider API cost vs. payment stream fees. The products serve two purposes: proof that the mechanism works across domains, and developer onboarding (builders can fork any reference app to build on Backproto).",
    sources: [
      "gateway/README.md",
      "agent-explorer/README.md",
      "relay-dash/README.md",
      "lightning-dash/README.md",
      "plan/11-BITRECIPES.md",
    ],
  },

  // ── Technical depth ───────────────────────────────────────────
  {
    id: "novelty-claim",
    title: "What is genuinely novel",
    audiences: ["engineer", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "The domain transfer: applying network backpressure routing to monetary flows. Nobody has done this before.",
    elevator:
      "Backpressure routing (1992+), congestion pricing (Kelly 1998), and streaming payments (Superfluid 2020+) all exist independently. No prior work unifies them. The novel contribution is treating receiver-side capacity constraints as first-class economic primitives in payment routing. Secondary novelty: the demurrage-backpressure distinction (stock-based velocity vs flow-based allocation as orthogonal mechanisms) and the agent pipeline observation (multi-agent pipelines exhibit backpressure dynamics where slow downstream agents should throttle upstream payments).",
    detail:
      "We are honest about what is not novel: the backpressure algorithm itself (Tassiulas 1992), throughput optimality proofs (Lyapunov drift), network congestion pricing (Kelly 1998), streaming payments (Superfluid, Sablier), and token economy modeling (Zhang-Zargham 2020). The contribution sits at the intersection: adapting these proven techniques to monetary flows where packets cannot be dropped. The escrow buffer, the sqrt capacity cap for Sybil resistance, and the completion-based verification layer are the engineering solutions to the domain transfer problem.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
      "plan/06-BIBLIOGRAPHY.md",
    ],
  },
  {
    id: "sybil-resistance",
    title: "Sybil resistance mechanism",
    audiences: ["engineer", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "Concave sqrt capacity cap plus minimum per-sink stake makes splitting unprofitable for any k > 1.",
    elevator:
      "A single agent with stake S gets capacity cap = sqrt(S/u). If they split into k sinks, each gets sqrt(S/(k*u)), total = k * sqrt(S/(k*u)) = sqrt(S*k/u). But each sink also requires minimum stake S_min, so effective stake per sink is (S - k*S_min)/k. For any k > 1, total capacity strictly decreases because the S_min overhead eats into the per-sink stake. The break-even point does not exist when S_min > 0: fragmentation is always unprofitable.",
    detail:
      "This was a critical fix. The initial design used only sqrt cap, which actually rewards splitting: k * sqrt(S/k) > sqrt(S) for k > 1. Adding the minimum per-sink stake S_min creates a hard economic disincentive. The cost of k sinks = k * S_min in overhead. We proved in simulation that for any realistic S_min value (even 1% of typical stake), splitting into 2+ sinks is strictly dominated by the single-sink strategy. This is documented in plan/08-GAPS-AND-MITIGATIONS.md as G8.",
    sources: [
      "plan/00-DECISIONS.md",
      "plan/08-GAPS-AND-MITIGATIONS.md",
      "simulation/bpe_sim.py",
    ],
  },
  {
    id: "gas-optimization",
    title: "83.5% gas savings via off-chain batching",
    audiences: ["engineer", "builder", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "EIP-712 attestation aggregation reduces rebalance cost from ~58k gas to ~9.6k gas for 50 sinks.",
    elevator:
      "On-chain commit-reveal for capacity signals costs ~48k gas for commit + ~10k gas for reveal per sink. With 50 sinks rebalancing every epoch, that is 2.9M gas. The OffchainAggregator collects EIP-712-signed capacity updates off-chain, batch-submits them in a single transaction, and runs one rebalance. Total: ~9.6k gas for 50 sinks. 83.5% reduction.",
    detail:
      "The OffchainAggregator contract verifies a batch of EIP-712 typed data signatures in a single transaction. Each sink signs their capacity update off-chain (no gas cost), the oracle aggregates signatures, and submits them with one rebalance call to BackpressurePool.rebalance(). The tradeoff: this requires a trusted aggregator (centralization risk). Acceptable for v0.1; the path to decentralization is multi-oracle with threshold signatures (v0.2). Benchmarked in GAS-BENCHMARKS.md.",
    sources: [
      "GAS-BENCHMARKS.md",
      "contracts/src/core/OffchainAggregator.sol",
    ],
  },

  // ── For investors specifically ─────────────────────────────────
  {
    id: "market-size",
    title: "Market context",
    audiences: ["investor"],
    scenarios: ["5-min-pitch"],
    headline:
      "Every AI agent that pays another AI agent needs flow control. That market did not exist 12 months ago.",
    elevator:
      "Agent-to-agent payment is a new category. Google, Coinbase, OpenAI, Stripe, and Visa all launched agent payment protocols in 2025-2026. They handle authorization (can this agent pay?). None handle flow control (what happens when the agent you are paying is full?). As agent economies scale, the flow control gap grows proportionally. Backproto is the only protocol addressing it.",
    detail:
      "The agent payment market is nascent but growing fast. Google AP2, Coinbase x402, OpenAI-Stripe ACP, and Visa TAP all launched within 12 months. Each focuses on the trust and authorization layer. The flow control problem only emerges at scale: when multiple agents compete for the same service, and that service has finite capacity. Backproto is positioned as the routing layer that sits between the payment authorization layer and the work execution layer.",
    sources: [
      "plan/01-NOVELTY-ASSESSMENT.md",
      "gtm/swarm-catalini.md",
    ],
  },
  {
    id: "revenue-model",
    title: "Revenue model",
    audiences: ["investor", "grant-reviewer"],
    scenarios: ["5-min-pitch", "grant-app"],
    headline:
      "Protocol fees on pool rebalances plus 40-60% margin on the Mandalay LLM gateway.",
    elevator:
      "Two revenue sources. First, the protocol can charge a small fee on each pool rebalance event (configurable per pool, currently 0% on testnet). Second, Mandalay — the reference LLM gateway — generates revenue on the spread between provider API costs and payment stream fees. At current pricing, that margin is 40-60%. The gateway is both a product and a proof of mechanism.",
    detail:
      "The protocol fee is governance-controlled and deferred to post-mainnet DAO setup. The Mandalay margin comes from capacity-aware routing: by sending requests to providers with spare capacity, we get better latency and reliability, which justifies a premium over direct API access. Additional revenue surfaces in v0.2: PricingCurve dynamic fees (EIP-1559 style), where the protocol captures a portion of congestion pricing.",
    sources: [
      "gateway/README.md",
      "plan/03-PROTOCOL-SPEC.md",
    ],
  },

  // ── For builders specifically ──────────────────────────────────
  {
    id: "sdk-quick-start",
    title: "SDK quick start",
    audiences: ["builder", "engineer"],
    scenarios: ["5-min-pitch", "technical-defense"],
    headline:
      "18 action modules. Import getAddresses, pick a module, call a function. Type-safe with Viem.",
    elevator:
      "The TypeScript SDK wraps every contract function with a consistent API: getAddresses(chainId) loads all ABIs and addresses, then you call module-namespaced functions like pool.getMemberUnits(publicClient, addrs, taskTypeId, address). Modules: sink, source, pool, stake, buffer, pricing, completion, aggregator, demurrage, relay, lightning, platform, plus 6 v2 modules. All return bigint (Viem native type). Every reference app uses the same pattern, so you can fork one and start building.",
    detail:
      "Installation: npm install @backproto/sdk (or use the monorepo sync-sdk script). Chain setup: create a Viem publicClient for Base Sepolia, get chainId. Then getAddresses(chainId) returns every contract ABI and address. Example: to check how much capacity a sink has, call sink.getCapacity(publicClient, addrs, taskTypeId, sinkAddress). To register as a sink: sink.register(walletClient, addrs, taskTypeId, capacityAmount). The SDK handles ABI encoding, function selection, and type conversion.",
    sources: [
      "sdk/README.md",
      "sdk/src/",
    ],
  },
  {
    id: "fork-and-build",
    title: "Fork a reference app",
    audiences: ["builder"],
    scenarios: ["5-min-pitch"],
    headline:
      "Clone Mandalay, Relay.Gold, or DarkSource. Swap the task type. Deploy your own backpressure economy.",
    elevator:
      "Every reference app follows the same pattern: Next.js 16, React 19, Viem, CSS Modules, polling /api/state every 30 seconds. The /api/state route reads contract state via SDK, falls back to deterministic seed data when chain is unreachable. Fork the repo, change the task type constant, configure your sink addresses, and you have a working backpressure-routed product. Deploy to Vercel in under 5 minutes.",
    detail:
      "The bit.recipes project (in progress) will make this even simpler: a YAML-based declarative spec for Backproto pipelines where you define sources, sinks, routing policy, and settlement config, then deploy everything to Base in a single transaction via EconomyFactory. Until that ships, the reference apps are your fastest path to building on Backproto.",
    sources: [
      "gateway/README.md",
      "plan/11-BITRECIPES.md",
    ],
  },

  // ── For grant applications ─────────────────────────────────────
  {
    id: "base-ecosystem-fit",
    title: "Base ecosystem fit",
    audiences: ["grant-reviewer"],
    scenarios: ["grant-app"],
    headline:
      "Built on Superfluid GDA on Base. Uses x402 ecosystem adjacency. All contracts verified on Basescan.",
    elevator:
      "Backproto is native to Base. All 22 contracts are deployed and verified on Base Sepolia. We use Superfluid's GDA primitive for streaming distribution. Coinbase's x402 agent payment standard creates natural ecosystem adjacency — x402 handles authorization, Backproto handles flow control. The low gas costs on Base support frequent capacity signal updates (every 300 seconds per sink).",
    detail:
      "Base was chosen for four reasons: (1) Superfluid is deployed there, (2) x402 ecosystem adjacency, (3) strong agent economy developer community, (4) gas costs low enough for frequent on-chain capacity updates. Mainnet deployment planned post-testnet validation and grant funding. Grant funds would cover third-party audit, mainnet deployment gas, and SDK developer documentation.",
    sources: [
      "plan/00-DECISIONS.md",
      "contracts/deployments/",
    ],
  },
  {
    id: "superfluid-ecosystem-fit",
    title: "Superfluid ecosystem fit",
    audiences: ["grant-reviewer"],
    scenarios: ["grant-app"],
    headline:
      "BackpressurePool is the first dynamic-weight use case for Superfluid GDA pools.",
    elevator:
      "Most Superfluid GDA pools use static weights — set once, distribute forever. Backproto introduces dynamic weight rebalancing based on real-time capacity signals. The BackpressurePool contract calls updateMemberUnits on every rebalance, adjusting payment distribution in real time. This is a new use case for GDA that demonstrates the primitive's flexibility beyond static distributions.",
    detail:
      "We interact with Superfluid at three levels: (1) GDA pool creation via SuperfluidGDA.createPool(). (2) Dynamic unit updates via pool.updateMemberUnits() triggered by capacity oracle. (3) Flow rate management via CFA for source-to-pool connections. The OffchainAggregator batches rebalance calls for gas efficiency. This pattern could serve as a reference implementation for other projects wanting dynamic GDA distribution.",
    sources: [
      "plan/00-DECISIONS.md",
      "contracts/src/core/BackpressurePool.sol",
    ],
  },

  // ── Design decisions (for defending choices) ───────────────────
  {
    id: "why-not-centralized",
    title: "Why decentralized routing",
    audiences: ["engineer", "investor"],
    scenarios: ["technical-defense"],
    headline:
      "The backpressure algorithm is inherently local. Each node only needs neighbor queue depth, not global state.",
    elevator:
      "The original design had a centralized Router entity directing payment flows. We dropped it. Tassiulas's backpressure algorithm is inherently decentralized: each node makes routing decisions using only local queue information and neighbor queue backlogs. No global coordinator needed. In v0.1, this manifests as a single BackpressurePool + capacity oracle. In v0.2, multi-hop routing between pools will make the decentralization more explicit.",
    detail:
      "Centralization risk was the main concern. A centralized router is a single point of failure and a trust bottleneck. The max-weight scheduling policy only requires comparing local queue differentials weighted by link capacity — information each node can observe directly. The tradeoff: v0.1 uses a single capacity oracle (centralization risk, mitigated by commit-reveal). The decentralization path: single oracle -> multi-oracle -> on-chain EWMA computation.",
    sources: [
      "plan/00-DECISIONS.md",
      "plan/08-GAPS-AND-MITIGATIONS.md",
    ],
  },
  {
    id: "why-immutable-contracts",
    title: "Why no upgradeable proxies",
    audiences: ["engineer", "grant-reviewer"],
    scenarios: ["technical-defense"],
    headline:
      "Immutable contracts. Simpler security model for a research-stage protocol.",
    elevator:
      "We chose immutable (non-upgradeable) contracts deliberately. At the research stage, the priority is proving the mechanism works, not building governance infrastructure for upgrades. Immutable contracts are simpler to audit, easier to reason about, and eliminate the entire class of proxy-related vulnerabilities. If the mechanism works on testnet, mainnet contracts can introduce upgradeability with proper governance.",
    detail:
      "The tradeoff is clear: if we find a bug, we redeploy rather than upgrade. For a testnet-stage protocol with 0 real value at risk, this is the right call. The contracts are also simpler to verify on Basescan — no proxy indirection. When mainnet deployment happens, the decision will be revisited based on whether governance infrastructure (DAO, timelock) is in place.",
    sources: [
      "OWNERS-MANUAL.md",
      "plan/00-DECISIONS.md",
    ],
  },
  {
    id: "why-allocation-not-pricing",
    title: "v0.1 is allocation only",
    audiences: ["engineer", "grant-reviewer"],
    scenarios: ["technical-defense", "grant-app"],
    headline:
      "Pricing is deferred to v0.2. v0.1 proves capacity-proportional routing works before adding dynamic fees.",
    elevator:
      "We deliberately separated allocation from pricing. v0.1 routes payment proportional to verified capacity. That is the core backpressure mechanism, and it needs to work correctly before layering on congestion pricing. The PricingCurve contract exists but is informational in v0.1 — it tracks what the price would be under EIP-1559-style dynamics. v0.2 will enforce dynamic fees where busy agents become more expensive, pushing demand to available capacity.",
    detail:
      "This follows the standard approach in mechanism design: prove the base mechanism works, then add pricing. The allocation layer (backpressure routing) has a Lyapunov drift proof for throughput optimality. The pricing layer (Kelly proportional fairness) has its own proof for efficiency. Composing them requires proving they do not interfere. Simpler to validate allocation alone first, then add pricing with its own validation.",
    sources: [
      "plan/00-DECISIONS.md",
      "plan/03-PROTOCOL-SPEC.md",
    ],
  },

  // ── Quick-grab stats ──────────────────────────────────────────
  {
    id: "key-numbers",
    title: "Key numbers to remember",
    audiences: ["general", "investor", "grant-reviewer"],
    scenarios: ["elevator-pitch", "5-min-pitch", "grant-app"],
    headline:
      "22 contracts. 213 tests. 95.7% efficiency. 83.5% gas savings. 5 reference apps. 14-section paper.",
    elevator:
      "The numbers that matter: 22 Solidity contracts deployed and verified on Base Sepolia. 213 passing tests across 21 suites. 95.7% allocation efficiency in simulation (vs 93.5% round-robin). 83.5% gas savings via off-chain attestation batching. 5 reference products across 4 domains. 14-section research paper with formal Lyapunov drift proofs. 60+ bibliography entries spanning 30 years of network theory. MIT licensed. Single maintainer.",
    detail:
      "Contract-specific numbers: 8 core BPE contracts, 2 demurrage, 2 Nostr, 3 Lightning, 2 platform, 5 v2 composition. SDK: 18 action modules. Simulation: 1000-step horizons, 50 sinks, 10 sources, 5 experiments. EWMA optimal alpha: 0.3. Epoch length: 300 seconds. Completion threshold for slashing: 50% over 3 consecutive epochs. Slash penalty: 10% of stake. Verification: Aderyn static analysis with 0 exploitable findings.",
    sources: [
      "OWNERS-MANUAL.md",
      "GAS-BENCHMARKS.md",
      "simulation/bpe_sim.py",
    ],
  },
  {
    id: "prior-art-count",
    title: "Academic grounding",
    audiences: ["grant-reviewer", "engineer"],
    scenarios: ["grant-app", "technical-defense"],
    headline:
      "Built on 30+ years of proven network theory. 60+ citations. The algorithm has been battle-tested in data networks since 1992.",
    elevator:
      "This is not a novel algorithm. Tassiulas and Ephremides published the backpressure routing algorithm in 1992. It has been refined across hundreds of papers over 30 years. Neely (2010) extended it with the V-parameter technique for utility-delay tradeoffs. Kelly (1998) proved proportional fairness pricing for network resource allocation. We apply these proven results to a new domain — monetary flows — rather than inventing new math.",
    detail:
      "The bibliography includes: Tassiulas-Ephremides (1992) for the base algorithm, Neely (2006, 2010) for Lyapunov optimization, Kelly (1998) for proportional fairness, Srikant (2004) for internet congestion control, Zhang-Zargham (2020) for token engineering, Cha et al. (2025) for blockspace pricing, Fisher (1933) and Gesell (1916) for monetary velocity theory. The paper maps exactly which result from which source applies to which mechanism in Backproto.",
    sources: [
      "plan/06-BIBLIOGRAPHY.md",
      "plan/01-NOVELTY-ASSESSMENT.md",
    ],
  },
];
