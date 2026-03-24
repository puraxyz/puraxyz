# Superfluid Ecosystem Grant — Application

## Project name

Pura

## One-liner

LLM routing gateway with Superfluid GDA-backed capacity pools and per-request Lightning settlement.

## How does it use Superfluid?

Pura uses Superfluid GDA as the distribution primitive for its on-chain capacity layer. The gateway routes LLM inference across providers; the on-chain contracts handle who gets paid and how much. GDA pools distribute revenue proportional to verified spare capacity.

Specific Superfluid integration points:

1. BackpressurePool: wraps a GDA pool. On each capacity update, it recalculates member units proportional to `sqrt(staked) * completionRate * (maxCapacity - currentLoad)`. Units update atomically with capacity verification.

2. EscrowBuffer: when all pool members hit capacity and there is no viable route, incoming streams redirect to an escrow Super Token buffer. When capacity frees up, escrowed funds drain back through the GDA pool.

3. Multi-pool composition: research modules (Nostr relay economics, Lightning routing) each run their own GDA pool. The Pipeline contract coordinates cross-pool flows.

4. Off-chain attestation aggregation: capacity attestations are collected off-chain and verified on-chain in batches. 83.5% gas reduction vs per-attestation updates.

## What problem does it solve?

GDA pools distribute funds based on static or manually-set member units. Pura makes those units responsive to real-time capacity signals, turning GDA into congestion-aware payment infrastructure.

The primary consumer is the Pura LLM gateway. The gateway routes inference requests across four providers (OpenAI, Anthropic, Groq, Gemini) and uses the GDA-backed capacity layer to determine payment distribution. Providers that handle more requests with spare capacity get a larger share.

## What is deployed?

35 Solidity contracts on Base Sepolia (12 core verified on Basescan). 319 passing tests. TypeScript SDK with 23 action modules.

The gateway is live at api.pura.xyz. It scores task complexity across three tiers, routes to the cheapest capable provider, and settles per-request on Lightning. Free tier is 5,000 requests.

Core GDA-integrated contracts:
- BackpressurePool: GDA wrapper with dynamic unit rebalancing
- EscrowBuffer: overflow buffer for saturated pools
- CapacityRegistry: multi-dimensional capacity declarations per provider
- CompletionTracker: dual-signed completion receipts that drive unit recalculation
- OffchainAggregator: BLS-aggregated capacity attestations

## Results

- 95.7% allocation efficiency (simulation, 50 agents, 100 time steps)
- 83.5% gas reduction via off-chain attestation batching
- 3x throughput improvement over static allocation in burst scenarios
- Gateway routes ~80% of simple requests to cheapest provider automatically

## Team

Solo builder. Building full-time.

## Grant request

Funding for:
1. Mainnet deployment and initial pool seeding with Super Tokens
2. GDA stress testing under rapid unit rebalancing (characterize practical limits)
3. External audit of BackpressurePool and EscrowBuffer contracts
4. Integration guide showing the dynamic GDA pattern for other Superfluid projects

## Open questions for the Superfluid team

1. Practical limits on GDA unit update frequency? Pura may rebalance every block under high contention.
2. Known issues when multiple GDA pools share the same Super Token?
3. Interest in co-developing a "dynamic GDA" pattern that other projects could reuse?

## Links

- Website: https://pura.xyz
- GitHub: https://github.com/puraxyz/puraxyz
- Gateway docs: https://pura.xyz/docs/getting-started-gateway
- Paper: https://pura.xyz/paper
- Superfluid integration: contracts/src/BackpressurePool.sol, contracts/src/EscrowBuffer.sol
