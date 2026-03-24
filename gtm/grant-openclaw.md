# OpenClaw Grant — Application

## Project name

Pura

## One-liner

Backpressure routing applied to AI agent payment flows, with formal throughput guarantees.

## Summary

Pura adapts backpressure routing (Tassiulas-Ephremides, 1992) to streaming payment networks. The core insight: payment flows between AI agents have the same congestion problems as data packets in networks, and the same family of algorithms that solved network congestion can solve payment congestion.

Agents register multi-dimensional capacity. Completions are verified via dual-signed receipts. A Superfluid GDA pool distributes payments proportional to verified spare capacity. Dynamic pricing (EIP-1559-style) adjusts costs per capacity dimension. Overflow goes to escrow.

The result is throughput-optimal payment routing under any stabilizable demand vector. Formal proof via Lyapunov drift analysis.

## Technical contribution

1. Capacity-weighted routing: Extends Tassiulas-Ephremides from packet scheduling to monetary flows. The key adaptation: "queue differential" becomes "spare capacity differential" and "packet routing" becomes "payment stream allocation."

2. Sybil-resistant staking: Concave sqrt cap on capacity-per-stake makes splitting into multiple identities strictly worse than a single registration. An agent splitting stake S into k identities gets k×sqrt(S/k) = sqrt(k)×sqrt(S), which is less than sqrt(S) only when... actually, it is more. The cap function is designed so that effective capacity per unit stake decreases: total effective capacity from splitting is sqrt(k)×sqrt(S) vs sqrt(S). Since sqrt(k) > 1 for k > 1, the staking curve alone does not prevent Sybil attacks — the completion verification layer does. An agent cannot fabricate dual-signed completion receipts without actually completing work.

3. Off-chain attestation aggregation: BLS signature aggregation reduces on-chain verification from O(n) to O(1) per batch. 83.5% gas reduction in benchmarks.

4. Dynamic pricing: Per-dimension EIP-1559-style pricing. Base fee adjusts toward a target utilization ratio. Congested capacity dimensions become expensive.

5. Cross-domain composition: The Pipeline contract routes flows across heterogeneous GDA pools (AI agents, Nostr relays, Lightning channels, demurrage tokens). Each domain has its own capacity semantics but shares the backpressure routing primitive.

## What is deployed?

32 contracts (12 on Base mainnet, 20 testnet-only research modules). 319 passing tests across all contracts. TypeScript SDK with 23 action modules. Live gateway at gateway.pura.xyz.

Simulation results (50 agents, 100 time steps):
- 95.7% allocation efficiency vs 93.5% round-robin
- 3× throughput under burst demand
- Stable operation under adversarial capacity reporting (completion verification catches false claims within 2 epochs)

## Part of a stack

Pura is one component in a three-project stack:

- Buildlog (buildlog.ai): Captures agent execution trails — what was run, what changed, what was the outcome
- VR (vr.dev): Verifies that agent-claimed outcomes reflect actual system state changes
- Pura (pura.xyz): Routes payments to agents with verified spare capacity

Buildlog generates execution traces. VR validates outcomes against those traces. Pura uses both signals to weight payment distribution. Each project works independently but the stack closes a full observe-verify-pay loop.

## Research paper

Full paper with formal proofs available at https://pura.xyz/paper.

Sections: background on backpressure routing theory, protocol design, smart contract architecture, simulation methodology and results, security analysis, related work comparison.

## What the grant would fund

1. Mainnet deployment and first external pilot integration
2. Extended simulation: adversarial scenarios, larger agent populations, cross-domain routing
3. External security audit of core contracts
4. Research paper submission to a venue (targeting IEEE/ACM workshop or similar)
5. Integration documentation and developer onboarding tooling

## Team

Solo builder. Background in software engineering. Building Pura, Buildlog, and VR.

## Links

- Website: https://pura.xyz
- GitHub (MIT): https://github.com/puraxyz/puraxyz
- Paper: https://pura.xyz/paper
- Explainer: https://pura.xyz/explainer
- Simulation: simulation/bpe_sim.py
