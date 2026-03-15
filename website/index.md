# Spilt

**Capacity-Constrained Monetary Flow Control for Agent Economies**

---

## What is BPE?

Backpressure Economics (BPE) is a novel cryptoeconomic mechanism that adapts the Tassiulas–Ephremides backpressure routing algorithm from communication networks to monetary flows in multi-agent economies.

Streaming payment protocols enable continuous monetary flows between AI agents, yet none provide **flow control**: when a downstream agent reaches capacity, payments accumulate with no mechanism to reroute, buffer, or throttle — unlike data networks where packets can be dropped or queued.

BPE solves this by treating **receiver-side capacity constraints as first-class payment routing primitives**.

## Key Contributions

<div class="grid cards" markdown>

- :material-math-integral-box: **Formal Model**

    ---

    A capacity-constrained monetary flow network where agents declare processing capacity through commit-reveal signals, with EWMA-smoothed flow weights.

    [:octicons-arrow-right-24: Read the model](paper/model.md)

- :material-chart-line: **Throughput Optimality**

    ---

    Proof via Lyapunov drift analysis that BPE achieves throughput-optimal allocation — every stabilisable demand vector is served with bounded overflow buffers.

    [:octicons-arrow-right-24: See the proof](paper/throughput.md)

- :material-file-code: **Protocol Design**

    ---

    Five Solidity smart contracts on Superfluid's GDA, with permissionless pool creation, Sybil resistance, and multi-stage pipeline composition.

    [:octicons-arrow-right-24: Protocol details](paper/protocol.md)

- :material-flask: **Evaluation**

    ---

    Simulations show 95.7% allocation efficiency vs 93.5% for round-robin, shock recovery within 50 steps, and buffer stall rates under 9%.

    [:octicons-arrow-right-24: Results](paper/evaluation.md)

</div>

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Agent SDK Layer                                             │
│  ├─ CapacityComputer: runtime metric → capacity signal       │
│  ├─ TaskQueueManager: local queue with overflow handling     │
│  └─ StreamLifecycle: subscribe/unsubscribe/claim/withdraw    │
├─────────────────────────────────────────────────────────────┤
│  Backpressure Logic Layer (Off-chain + On-chain oracle)      │
│  ├─ CapacityOracle: aggregates signals, applies EWMA         │
│  ├─ RebalanceEngine: computes unit weights from capacity     │
│  └─ VerificationService: PoCW checks, slash triggers         │
├─────────────────────────────────────────────────────────────┤
│  Settlement Layer (On-chain / Base L2)                       │
│  ├─ BackpressurePool.sol: extends Superfluid GDA Pool        │
│  ├─ CapacityRegistry.sol: on-chain capacity signal state     │
│  ├─ StakeManager.sol: staking, capacity caps, slashing       │
│  └─ EscrowBuffer.sol: overflow buffer when all sinks full    │
├─────────────────────────────────────────────────────────────┤
│  Streaming Primitive Layer                                   │
│  └─ Superfluid Protocol (CFA + GDA on Base)                 │
└─────────────────────────────────────────────────────────────┘
```

## Explore

- [**Paper**](paper/index.md) — Full academic paper with formal model, proofs, and evaluation
- [**Plan**](plan/README.md) — Design decisions, protocol spec, contracts blueprint, and roadmap
- [**Implementation**](implementation/contracts.md) — Smart contracts, SDK, and simulation code
