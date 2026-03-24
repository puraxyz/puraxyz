# Superfluid Ecosystem Grant — Application

## Project name

Pura

## One-liner

Dynamic GDA pool rebalancing for capacity-weighted AI agent payment routing.

## How does it use Superfluid?

Pura uses Superfluid General Distribution Agreement (GDA) as the core streaming primitive. The specific contribution is dynamic unit rebalancing: GDA member units are updated in real time based on verified spare capacity, turning static distribution pools into adaptive allocation engines.

Specific Superfluid integration points:

1. BackpressurePool: Wraps a GDA pool. On each capacity update, it recalculates member units proportional to `sqrt(staked) × completionRate × (maxCapacity - currentLoad)`. Units update atomically with capacity verification.

2. EscrowBuffer: When all pool members hit capacity and there is no viable reroute, incoming streams redirect to an escrow Super Token buffer. When capacity frees up, escrowed funds drain back through the GDA pool.

3. Multi-pool composition: Research modules (demurrage, Nostr relay economics, Lightning routing) each run their own GDA pool. The Pipeline contract coordinates cross-pool flows.

4. Off-chain attestation aggregation: Capacity attestations are collected off-chain and verified on-chain in batches. This reduces the frequency of GDA unit updates while preserving accuracy. 83.5% gas reduction vs per-attestation updates.

## What problem does it solve?

GDA pools today distribute funds based on static or manually-set member units. Pura makes those units responsive to real-world capacity signals, enabling GDA to serve as congestion-aware payment infrastructure.

The primary use case is AI agent economies. When multiple agents provide similar services, payments should flow to agents that have verified spare capacity. Overloaded agents should receive less. This is throughput-optimal by construction (Lyapunov drift analysis).

## What is deployed?

32 Solidity contracts (12 on Base mainnet, 20 testnet-only research modules). 319 passing tests. TypeScript SDK with 23 action modules. Live gateway at gateway.pura.xyz with streaming completions routed through on-chain capacity pools.

Core contracts:
- CapacityRegistry: Agents register with multi-dimensional capacity vectors
- BackpressurePool: GDA wrapper with dynamic unit rebalancing
- CompletionTracker: Dual-signed completion receipts for capacity verification
- StakeManager: Concave sqrt staking (Sybil-resistant)
- PricingCurve: EIP-1559-style dynamic pricing per capacity dimension
- EscrowBuffer: Overflow buffer for saturated pools
- OffchainAggregator: BLS-aggregated off-chain attestations
- Pipeline: Cross-pool composition and routing

Research modules extend the core GDA pattern to four additional domains.

## Results

- 95.7% allocation efficiency (simulation, 50 agents, 100 time steps)
- 83.5% gas reduction via off-chain attestation batching
- 3× throughput improvement over static allocation in burst scenarios

## Part of a stack

Pura is one layer in a three-project stack:

- Buildlog (buildlog.ai): Agent workflow capture
- VR (vr.dev): Outcome verification
- Pura (pura.xyz): Payment routing via Superfluid GDA

Buildlog and VR generate the capacity and completion signals that drive Pura's GDA unit calculations.

## Team

Solo builder. Building all three projects.

## Grant request

Funding for:
1. Mainnet deployment and initial pool seeding with Super Tokens
2. GDA stress testing under rapid unit rebalancing (need to characterize limits)
3. Multi-pool architecture patterns (shared Super Token across pools)
4. External audit of BackpressurePool and EscrowBuffer contracts
5. Integration guide for other Superfluid ecosystem projects

## Open questions for the Superfluid team

1. What are the practical limits on GDA unit update frequency? Pura may rebalance on every block under high contention.
2. Are there known gotchas when multiple GDA pools share the same Super Token?
3. Is there interest in co-developing a "dynamic GDA" pattern that other projects could reuse?

## Links

- Website: https://pura.xyz
- GitHub: https://github.com/puraxyz/puraxyz
- Paper: https://pura.xyz/paper
- Explainer: https://pura.xyz/explainer
- Superfluid integration: contracts/src/BackpressurePool.sol, contracts/src/EscrowBuffer.sol
