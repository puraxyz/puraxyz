import type { Concept } from "./types";

export const concepts: Concept[] = [
  {
    id: "backpressure-routing",
    title: "Backpressure routing",
    headline:
      "Send more work (and money) to whoever has the most room. Pull back from whoever is full.",
    elevator:
      "In a network with multiple servers that can do a job, backpressure routing picks the one with the most spare capacity for each new request. If server A is at 80% and server B is at 30%, B gets the next job. If B fills up, the balance shifts. The algorithm was invented in 1992 for data networks (routers deciding which link to send packets down) and has mathematical proofs that it maximizes throughput. Backproto applies the same idea to payment streams: money flows proportionally toward agents with verified spare capacity.",
    detail:
      "The formal version: at each time step, the scheduler picks the (job, server) pair that maximizes queue differential times link capacity. In Backproto's monetary analog: at each epoch, the BackpressurePool contract updates member units so that each sink's share of the payment stream equals its fraction of the total smoothed capacity. If sink i has smoothed capacity C_smooth(i), its pool units are set to C_smooth(i) / sum(C_smooth(j)) for all j. The Superfluid GDA protocol then distributes incoming payment proportionally. This max-weight policy achieves throughput optimality — every demand vector inside the capacity region gets served. The proof uses Lyapunov drift analysis (see below).",
    sources: [
      "plan/03-PROTOCOL-SPEC.md",
      "plan/01-NOVELTY-ASSESSMENT.md",
    ],
  },
  {
    id: "lyapunov-drift",
    title: "Lyapunov drift (the throughput proof)",
    headline:
      "A mathematical technique that proves queues stay bounded and the system is stable. Think of it as proving water never overflows the pipes.",
    elevator:
      "Lyapunov drift analysis is how you prove a system is stable without simulating every possible scenario. You define a 'potential energy' function of the system state (in our case, the total queue backlog squared). Then you show that at each time step, the expected change in this energy (the 'drift') is negative — meaning the system trends toward emptying its queues. If drift is negative, queues stay bounded, which means every request eventually gets served. Backproto uses this to prove that backpressure routing achieves the maximum possible throughput.",
    detail:
      "Define a Lyapunov function V(Q(t)) = (1/2) * sum of Q_i(t) squared, where Q_i is the virtual queue backlog at sink i. The drift = E[V(Q(t+1)) - V(Q(t)) | Q(t)]. The proof shows that under the max-weight scheduling policy (which backpressure routing implements), the drift is bounded above by a constant B minus a term proportional to the queue lengths. This means drift is negative when queues are large, so they get pushed back down. The result: any demand vector strictly inside the capacity region is stabilized (queues stay bounded, everything gets processed). Neely (2010) extended this with the V-parameter technique, which lets you trade queue length for utility — pay a bounded delay cost to optimize a utility function simultaneously.",
    sources: [
      "docs/paper/",
      "plan/03-PROTOCOL-SPEC.md",
    ],
  },
  {
    id: "ewma-smoothing",
    title: "EWMA smoothing",
    headline:
      "Average out the noise in capacity signals so the system does not overreact to momentary spikes.",
    elevator:
      "Raw capacity signals are noisy. An agent might report 100 tasks/sec one moment and 20 the next, just because of a CPU cache miss or network jitter. If the protocol rebalanced payment on every jitter, you would get oscillation — all money rushing to agent A, then all to agent B, back and forth. EWMA (Exponentially Weighted Moving Average) smooths the signal: C_smooth(t) = 0.3 * C_raw(t) + 0.7 * C_smooth(t-1). Recent readings matter more than old ones, but no single reading can cause a massive swing.",
    detail:
      "Alpha (α) controls the tradeoff between responsiveness and stability. High alpha (0.7-0.9) follows raw signals closely but oscillates under noise. Low alpha (0.1) is stable but takes many epochs to react to real capacity changes (like an agent going down). We swept alpha from 0.05 to 0.95 in simulation and found 0.2-0.3 is optimal — fast enough to adapt within 3-5 epochs, stable enough to avoid rebalance storms. The specific value α=0.3 means convergence time is roughly O(1/α) = 3 epochs (about 15 minutes at 300-second epochs). This is analogous to TCP's AIMD mechanism (Jacobson 1988), which solved the same problem for packet networks.",
    sources: [
      "plan/00-DECISIONS.md",
      "simulation/bpe_sim.py",
    ],
  },
  {
    id: "concave-capacity-cap",
    title: "Concave capacity cap (Sybil resistance)",
    headline:
      "The more you stake, the more capacity you can claim — but with diminishing returns, so splitting into fake identities never pays off.",
    elevator:
      "Each agent stakes tokens to register as a sink. Their maximum claimable capacity is sqrt(S/u) — the square root of their stake divided by a unit cost. Square root means doubling your stake only increases your cap by about 41%, not 100%. If you try to split your stake across 2 fake identities, each gets sqrt(S/2u), and the total is 2 * sqrt(S/2u) = sqrt(2) * sqrt(S/u) — looks like a 41% gain. But each identity also requires a minimum stake S_min, which eats into available capital. Once you account for S_min, splitting is always unprofitable.",
    detail:
      "The full formula for k-way splitting: total_capacity(k) = k * sqrt((S - k*S_min) / (k*u)). Take the derivative with respect to k and set to zero: the optimal k is always 1 when S_min > 0. The intuition: the sqrt function gives you diminishing returns on stake, and the minimum per-sink cost S_min creates a fixed overhead per identity. These two forces together make fragmentation strictly dominated by the single-identity strategy. This was a critical fix — the original design used only sqrt cap without S_min, which actually rewards splitting (k * sqrt(S/k) > sqrt(S) for k > 1). Documented as gap G8 in the protocol spec.",
    sources: [
      "plan/08-GAPS-AND-MITIGATIONS.md",
      "plan/00-DECISIONS.md",
    ],
  },
  {
    id: "completion-verification",
    title: "Completion verification",
    headline:
      "The protocol tracks whether agents actually do the work they are paid for, and slashes them if they do not.",
    elevator:
      "The CompletionTracker contract records dual-signed completion receipts — both the requester and the agent sign off that a task was completed. Every 300 seconds (one epoch), the contract tallies each agent's completion rate: completions recorded divided by payment streams started. If an agent drops below 50% completion rate for 3 consecutive epochs, 10% of their stake is automatically slashed. This makes overclaiming capacity expensive: you can say you have room for 100 tasks, but if you only complete 40 of them, you lose money.",
    detail:
      "The verification mechanism is deliberately simple for v0.1: binary completion receipts per task, not quality scoring. Quality scoring (v0.2) will use the QualityScoring contract with 0-100 ratings. The 50% threshold and 10% slash rate are governance parameters — conservative defaults that avoid slashing agents with temporary issues while catching persistent underperformers. The dual-signature requirement prevents unilateral false claims from either side. If stake drops below S_min after slashing, the agent is automatically deregistered from the pool.",
    sources: [
      "contracts/src/core/CompletionTracker.sol",
      "plan/03-PROTOCOL-SPEC.md",
    ],
  },
  {
    id: "eip712-batching",
    title: "EIP-712 attestation batching",
    headline:
      "Instead of each agent posting capacity on-chain separately, they sign messages off-chain and an aggregator submits them all in one transaction.",
    elevator:
      "On-chain commit-reveal for 50 agents means 100 transactions per epoch (50 commits + 50 reveals) at ~58k gas each. That is 2.9M gas per epoch. The OffchainAggregator collects EIP-712 typed data signatures from each agent off-chain — no gas cost for signing. Then it submits all 50 capacity updates in a single batch transaction and calls rebalance once. Total cost: about 9.6k gas. That is an 83.5% reduction.",
    detail:
      "EIP-712 defines a standard for hashing and signing typed structured data. Each agent signs a message like {sinkAddress, taskType, capacity, epoch, nonce} with their private key. The OffchainAggregator contract recovers the signer from each signature using ECDSA, verifies it matches the registered sink address, and applies all capacity updates in one pass. The tradeoff: the aggregator is a centralized bottleneck. If it goes down, fallback to individual commit-reveal. The decentralization path is multi-operator threshold signatures (v0.2), where M-of-N aggregators must agree before a batch is submitted.",
    sources: [
      "GAS-BENCHMARKS.md",
      "contracts/src/core/OffchainAggregator.sol",
    ],
  },
  {
    id: "gda-pools",
    title: "Superfluid GDA pools",
    headline:
      "A smart contract that splits an incoming payment stream across multiple recipients, proportional to their share of 'units'.",
    elevator:
      "GDA (General Distribution Agreement) is a Superfluid primitive. You create a pool, add members, and assign each member a number of units. When someone streams payment into the pool, each member receives a fraction equal to their units divided by total units. If Alice has 60 units and Bob has 40, Alice gets 60% and Bob gets 40% of every incoming payment, calculated per second. Backproto's BackpressurePool wraps a GDA pool and dynamically updates units based on capacity signals — so the payment split changes in real time as agents' capacity changes.",
    detail:
      "GDA differs from CFA (Constant Flow Agreement). CFA is point-to-point: sender streams to one receiver at a fixed rate. GDA is one-to-many: sender streams to a pool, the pool distributes to members by unit weight. The pool admin (BackpressurePool contract) can call updateMemberUnits at any time, and the Superfluid protocol adjusts all downstream payment flows atomically. No need to stop/restart individual streams. This is the key primitive that makes capacity-weighted payment routing possible without building new payment infrastructure from scratch.",
    sources: [
      "plan/00-DECISIONS.md",
      "contracts/src/core/BackpressurePool.sol",
    ],
  },
];
