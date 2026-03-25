# Changelog

## 0.3.0 — June 2026

DVM adapters, settlement rails, shadow mode sidecar, monitor dashboard, benchmark UI, and protocol documentation

### DVM adapter contracts

- ISettlementAdapter: abstract interface for pluggable settlement rails
- DVMCapacityAdapter: NIP-90 kind capacity (kinds 5000–5999) with EWMA smoothing
- DVMCompletionVerifier: dual-signed EIP-712 result verification → CompletionTracker
- DVMPricingCurve: kind-specific weight overlays on the base PricingCurve
- SuperfluidSettlementAdapter: GDA streaming payments with linear accrual
- LightningSettlementAdapter: HTLC sha256 preimage escrow, 86400s timeout
- DirectSettlementAdapter: ERC-20 transfers from per-job escrow mapping
- 70 new tests across 7 adapter test suites (319 total, was 249)

### SDK standard objects

- 5 JSON Schema files (draft-07): job-intent, capacity-attestation, verification-receipt, price-signal, settlement-receipt
- TypeScript types: JobIntent, CapacityAttestationWithMetrics, VerificationReceipt, PriceSignal, SettlementReceipt, SettlementRail
- 13 schema tests (6 JSON validation + 7 type assignability)

### Shadow mode sidecar (@pura/shadow)

- Collector: circular buffer with sliding window per-sink metrics
- Simulator: Boltzmann soft-max allocation, EWMA smoothing, congestion pricing engine (port of bpe_sim.py)
- createShadow() factory: middleware mode (Express/Hono) and manual record mode
- HTTP metrics server on port 3099 (/metrics, /simulate, /health)
- 19 tests, tsup build (8.46KB dist)

### Monitor dashboard

- /monitor: overview hub with top-line stats, per-sink table, BPE shadow comparison
- /monitor/capacity: EWMA-smoothed capacity per sink with utilization bars
- /monitor/congestion: congestion pricing formula, multiplier, price signals
- /monitor/audit: protocol event log with color-coded events
- 2 API proxy routes for shadow sidecar connection

### Benchmark UI

- pura/lib/benchmark.ts: full TypeScript port of bpe_sim.py with seeded PRNG (xoshiro128**), 4 strategies (random, roundRobin, centralizedLB, bpe)
- /simulate/benchmark: interactive benchmark with Canvas charts, 6 configurable sliders, 4 time-series metrics, summary table

### New pages

- /deploy/dvm: DVM deployment flow with 6 NIP-90 kind buttons, endpoint config
- /pricing: 3 tiers (Shadow/Free, Operator/$29, Protocol/Custom), payment pool mechanics
- /about: protocol stats table and links
- Homepage rewritten for conversion (RoutingViz animation, stats bar, comparison table)
- Nav and footer updated with monitor, simulate, pricing links

### NIP spec

- Kind 1090 congestion feedback section added to NIP-XX-thermodynamic-dvm.md
- Reference implementation section expanded with all new contracts, adapters, SDK schemas, @pura/shadow

### Documentation

- pura/content/docs/shadow-mode.mdx: integration guide for @pura/shadow
- pura/content/docs/five-objects.mdx: standard object lifecycle walkthrough
- pura/content/docs/four-planes.mdx: capacity, verification, pricing, settlement architecture

## 0.2.0 — June 2026

Rebrand to Pura protocol, thermodynamic layer, content migration.

### Thermodynamic layer

- TemperatureOracle: system temperature τ from attestation variance, Boltzmann routing weights
- VirialMonitor: virial ratio V = 2·throughput/(staked+escrowed), adaptive demurrage δ
- SystemStateEmitter: aggregates τ, V, escrow pressure P into per-epoch snapshots with phase derivation (Steady/Bull/Shock/Recovery/Collapse)
- Existing contracts wired: BackpressurePool uses Boltzmann rebalancing, DemurrageToken reads δ from VirialMonitor, Pipeline circuit breakers reference τ thresholds
- 249 passing tests across 25 test suites (was 213/21)

### Rebrand

- All references updated from Backproto → Pura across ~100+ files
- EIP-712 domain names updated in 6 Solidity contracts
- SDK, dashboards, paper, GTM material all updated

### Paper

- New section 8c: thermodynamic extensions (temperature, Boltzmann routing, virial ratio, adaptive demurrage, osmotic escrow, circuit breakers, Lyapunov connection)
- Abstract, implementation, extensions, conclusion updated with thermodynamic content
- 16 sections total (was 14)

### Content migration

- 37 MDX files (blog, docs, paper) migrated from web/ to pura/
- Full MDX stack: KaTeX math, syntax highlighting, Mermaid diagrams
- 61 routes total: blog/10, docs/14, paper/13, explainer, playground, deploy, 16 API routes

### Dashboard

- Live thermodynamic state card on homepage: τ, V, P, δ, phase
- New API route `/api/thermo/state` reads from on-chain contracts with seed fallback
- GTM material updated with thermodynamic framing and correct counts

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

- Next.js site at pura.xyz
- Explainer, paper (14 sections), docs, blog
- Live router dashboard at router.pura.com

### Research

- Formal model: capacity-constrained monetary flow network
- Throughput optimality proof via Lyapunov drift analysis
- Python simulation: 95.7% allocation efficiency vs 93.5% round-robin
- Agent-based simulation with 50-sink topology

### Infrastructure

- GitHub Actions CI: forge test, SDK type-check, web build
- Foundry deployment scripts with verification
- EconomyFactory: deploy a full economy in one transaction (4 templates)
