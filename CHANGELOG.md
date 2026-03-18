# Changelog

## 0.1.0 — March 2026

First public release on Base Sepolia testnet.

### Contracts

- 22 Solidity contracts deployed and verified on Base Sepolia
- Core: CapacityRegistry, BackpressurePool, StakeManager, EscrowBuffer, Pipeline, PricingCurve, CompletionTracker, OffchainAggregator
- Research modules: DemurrageToken, VelocityMetrics, RelayCapacityRegistry, RelayPaymentPool, LightningCapacityOracle, LightningRoutingPool, CrossProtocolRouter, UniversalCapacityAdapter, ReputationLedger
- V2 composition: EconomyFactory, QualityScoring, UrgencyToken, VelocityToken, NestedPoolManager
- 213 passing tests across 21 test suites
- Self-audit + Aderyn static analysis: 0 exploitable findings
- Off-chain attestation aggregation via EIP-712 (83.5% gas reduction per rebalance)

### SDK

- TypeScript SDK with 18 action modules
- Full-flow example and testnet validation script
- ABI auto-generation from compiled contracts

### Website

- Next.js site at backproto.io
- Explainer, paper (14 sections), docs, blog
- Live router dashboard at router.backproto.com

### Research

- Formal model: capacity-constrained monetary flow network
- Throughput optimality proof via Lyapunov drift analysis
- Python simulation: 95.7% allocation efficiency vs 93.5% round-robin
- Agent-based simulation with 50-sink topology

### Infrastructure

- GitHub Actions CI: forge test, SDK type-check, web build
- Foundry deployment scripts with verification
- EconomyFactory: deploy a full economy in one transaction (4 templates)
