# Backproto: Backpressure Economics for Decentralized Networks

**Universal capacity-constrained flow control across AI agents, Nostr relays, Lightning routing, and streaming payments**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636.svg)](https://soliditylang.org/)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF.svg)](https://sepolia.basescan.org/)
[![Tests](https://img.shields.io/badge/Tests-213%20passing-brightgreen.svg)](#)

---

Backproto adapts the [Tassiulas–Ephremides backpressure routing algorithm](https://doi.org/10.1109/9.182479) from communication networks to monetary and data flows in decentralized systems. When downstream participants reach capacity, payments and messages must reroute, buffer, or throttle. Backproto makes receiver-side capacity constraints a first-class protocol primitive.

The core protocol handles capacity-weighted payment routing for AI agents. Additional research modules extend to other domains:

| Domain | What it solves |
|--------|---------------|
| **Core BPE** | Capacity-weighted streaming payment routing for AI agents via Superfluid GDA |
| **Demurrage** | Time-decaying super tokens + velocity metrics to incentivize circulation |
| **Nostr Relays** | Relay capacity signaling, anti-spam pricing, BPE-weighted payment pools |
| **Lightning** | EWMA-smoothed channel capacity oracles, cross-protocol routing |
| **V2 Composition** | Factory-deployed nested economies, quality scoring, urgency and velocity tokens |

Plus a **platform layer** (universal capacity adapter, cross-domain reputation ledger, and protocol router) that composes these domains into one system.

## Architecture

```
                        ┌─────────────────────────────────┐
                        │       Platform Layer             │
                        │  UniversalCapacityAdapter        │
                        │  ReputationLedger                │
                        │  CrossProtocolRouter             │
                        └──────┬───────┬──────┬───────────┘
                               │       │      │
             ┌─────────────────┤       │      ├──────────────────┐
             ▼                 ▼       ▼      ▼                  ▼
  ┌───────────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌────────────────┐
  │   Core BPE        │ │  Demurrage   │ │   Nostr Relays   │ │   Lightning    │
  │  CapacityRegistry │ │  Demurrage-  │ │  RelayCapacity-  │ │  LightningCap- │
  │  StakeManager     │ │   Token      │ │   Registry       │ │   acityOracle  │
  │  BackpressurePool │ │  Velocity-   │ │  RelayPayment-   │ │  LightningRout-│
  │  EscrowBuffer     │ │   Metrics    │ │   Pool           │ │   ingPool      │
  │  Pipeline         │ └──────────────┘ └──────────────────┘ └────────────────┘
  │  PricingCurve     │
  │  CompletionTracker│
  │  OffchainAggr.    │
  └───────────────────┘
```

## Results

- **Throughput-optimal** allocation via Lyapunov drift analysis: every stabilisable demand vector is served
- **95.7%** allocation efficiency vs 93.5% for round-robin (simulation)
- **83.5%** gas reduction via off-chain attestation aggregation
- **Sybil-resistant** concave capacity cap: cap(S) = √(S/u)
- **Incentive-compatible**: truthful reporting is a Bayesian-Nash equilibrium
- **Cross-domain reputation**: portable scores with 3× negative weight, up to 50% stake discount

## Repository Structure

```
contracts/              Solidity smart contracts (Foundry)
  src/                  22 contracts (core + research modules)
    lightning/          LightningCapacityOracle, LightningRoutingPool, CrossProtocolRouter
    nostr/              RelayCapacityRegistry, RelayPaymentPool
    interfaces/         14 interfaces
  test/                 213 passing tests
  script/               Full-stack deployment script
  deployments/          Deployed addresses (Base Sepolia)

sdk/                    TypeScript SDK (@backproto/sdk)
  src/actions/          18 action modules (sink, source, pool, stake, buffer,
                        pricing, completion, aggregator, demurrage, relay,
                        lightning, platform, openclaw, economy, nestedPool,
                        quality, urgencyToken, velocityToken)
  src/examples/         Full-flow demo + testnet validation

docs/
  paper/                Research paper (LaTeX, 14 sections)
  nips/                 NIP-XX: Backpressure Relay Economics spec

simulation/             Python simulation (5 experiments, figure generation)
plan/                   Design documents 00–08 (historical) + protocol spec
web/                    Next.js website (backproto.io)
gtm/                    Go-to-market material
```

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (forge, cast, anvil)
- [Node.js](https://nodejs.org/) ≥ 18 + npm
- Python 3.10+ (for simulation)

### Contracts

```bash
cd contracts
forge install
forge build
forge test            # 213 tests passing
```

### SDK

```bash
cd sdk
npm install
npm run build         # compile TypeScript
npm run lint          # type-check
```

### Website

```bash
cd web
npm install
npm run dev           # local preview at localhost:3000
```

### Simulation

```bash
pip install numpy matplotlib
python simulation/bpe_sim.py
```

## Contracts: 22 Deployed on Base Sepolia

### Core BPE

| Contract | Address |
|----------|---------|
| BPEToken | [`0x129Cb89ED216637925871951cA6FFc5F01F7c9a2`](https://sepolia.basescan.org/address/0x129Cb89ED216637925871951cA6FFc5F01F7c9a2) |
| TestUSDC | [`0x11bbA4095f8a4b2C8DD9f2d61C8ae5B16d013f08`](https://sepolia.basescan.org/address/0x11bbA4095f8a4b2C8DD9f2d61C8ae5B16d013f08) |
| StakeManager | [`0x4936822CB9e316ee951Af2204916878acCDD564E`](https://sepolia.basescan.org/address/0x4936822CB9e316ee951Af2204916878acCDD564E) |
| CapacityRegistry | [`0x4ED9386110051eC66b96e5d2e627048D57df5B64`](https://sepolia.basescan.org/address/0x4ED9386110051eC66b96e5d2e627048D57df5B64) |
| BackpressurePool | [`0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a`](https://sepolia.basescan.org/address/0x8a1F99e32d6d3D79d8AaF275000D6cbb57A8AF6a) |
| EscrowBuffer | [`0x31288aB9b12298Ff0C022ffD9F90797bB238d90a`](https://sepolia.basescan.org/address/0x31288aB9b12298Ff0C022ffD9F90797bB238d90a) |
| Pipeline | [`0x1eebaB27BD472b5956D8335CDB69b940F079e6dE`](https://sepolia.basescan.org/address/0x1eebaB27BD472b5956D8335CDB69b940F079e6dE) |
| PricingCurve | [`0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866`](https://sepolia.basescan.org/address/0x37D65E1C233a13bDf6E48Bd4BD9B4103888dA866) |
| CompletionTracker | [`0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4`](https://sepolia.basescan.org/address/0x7Dd6d47AC3b0BbF3D99bd61D1f1B1F85350A90c4) |
| OffchainAggregator | [`0x98c621051b5909f41d3d9A32b3b7DbB02615a179`](https://sepolia.basescan.org/address/0x98c621051b5909f41d3d9A32b3b7DbB02615a179) |

### Demurrage, Nostr, Lightning, Platform

| Contract | Domain | Address |
|----------|--------|---------|
| DemurrageToken | Demurrage | [`0x20C03C01Bd68d44DB89e3BA531009Cf0AA9074De`](https://sepolia.basescan.org/address/0x20C03C01Bd68d44DB89e3BA531009Cf0AA9074De) |
| VelocityMetrics | Demurrage | [`0x1b7eBD1FB40dbDd624543807350b1Ffb19F96dfE`](https://sepolia.basescan.org/address/0x1b7eBD1FB40dbDd624543807350b1Ffb19F96dfE) |
| RelayCapacityRegistry | Nostr | [`0x205457d92b5d92AD0F98cDC5FF37C61F5697565D`](https://sepolia.basescan.org/address/0x205457d92b5d92AD0F98cDC5FF37C61F5697565D) |
| RelayPaymentPool | Nostr | [`0x04815dA053F9d90875Ea61BAFcE7D4daD35E2fF5`](https://sepolia.basescan.org/address/0x04815dA053F9d90875Ea61BAFcE7D4daD35E2fF5) |
| LightningCapacityOracle | Lightning | [`0x31fEE06423FDA16733e25dBd8145AC0E56E4da42`](https://sepolia.basescan.org/address/0x31fEE06423FDA16733e25dBd8145AC0E56E4da42) |
| LightningRoutingPool | Lightning | [`0x1CD5CE34a130e7953E56ae1949BeaC8B733e0247`](https://sepolia.basescan.org/address/0x1CD5CE34a130e7953E56ae1949BeaC8B733e0247) |
| CrossProtocolRouter | Lightning | [`0x89df6EF70ef288f61003E392D3E5ddC8D9bD6e2d`](https://sepolia.basescan.org/address/0x89df6EF70ef288f61003E392D3E5ddC8D9bD6e2d) |
| UniversalCapacityAdapter | Platform | [`0x66368dbFdf4de036efB4D37bC73B490903062421`](https://sepolia.basescan.org/address/0x66368dbFdf4de036efB4D37bC73B490903062421) |
| ReputationLedger | Platform | [`0xdbCD358acEe7671D1ce7311CF9aC2a5B1C266B55`](https://sepolia.basescan.org/address/0xdbCD358acEe7671D1ce7311CF9aC2a5B1C266B55) |

## Paper

The research paper is in [`docs/paper/`](docs/paper/) (LaTeX). Sections:

1. **Formal Model**: capacity-constrained monetary flow network with EWMA smoothing
2. **Throughput Optimality**: Lyapunov drift proof with explicit overflow buffer bounds
3. **Dynamic Pricing**: EIP-1559-style queue-length pricing with equilibrium analysis
4. **Off-Chain Attestation**: batched EIP-712 capacity signals (83.5% gas savings)
5. **Security Analysis**: Sybil resistance, MEV resistance, Bayesian-Nash incentive compatibility
6. **Capacity Verification**: statistical completion tracking with auto-slash

```bash
cd docs/paper && pdflatex main && bibtex main && pdflatex main && pdflatex main
```

## Community

Backproto is early infrastructure looking for feedback from builders across AI agents, Nostr, Lightning, and DeFi.

- **Website**: [backproto.io](https://backproto.io)
- **GitHub**: [github.com/backproto/backproto](https://github.com/backproto/backproto)
- **Twitter/X**: Follow for updates (link TBD)

If you're building decentralized systems that need capacity-aware economic coordination, [open an issue](https://github.com/backproto/backproto/issues) or reach out directly.

## License

[MIT](LICENSE)
