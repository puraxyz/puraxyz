# Spilt — Backpressure Economics (BPE)

**Capacity-Constrained Monetary Flow Control for Agent Economies**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636.svg)](https://soliditylang.org/)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF.svg)](https://sepolia.basescan.org/)

---

BPE adapts the [Tassiulas–Ephremides backpressure routing algorithm](https://doi.org/10.1109/9.182479) from communication networks to monetary flows in multi-agent economies. Streaming payment protocols enable continuous flows between AI agents, yet none provide **flow control** — when a downstream agent reaches capacity, payments accumulate with no mechanism to reroute, buffer, or throttle. BPE solves this by treating receiver-side capacity constraints as first-class payment routing primitives.

## Architecture

```
CapacityRegistry <─── StakeManager
  (EWMA, commit-reveal)     (stake, √cap)
        │
        ▼
  BackpressurePool ──→ Superfluid GDA Pool
  (rebalance)            (streaming distribution)
        │
        ├──→ EscrowBuffer     (overflow hold)
        └──→ Pipeline          (multi-stage chains)

  PricingCurve          (EIP-1559-style dynamic fees)
  CompletionTracker     (statistical capacity verification)
  OffchainAggregator    (batched EIP-712 attestations)
```

## Key Results

- **Throughput-optimal** allocation via Lyapunov drift analysis — every stabilisable demand vector is served
- **95.7%** allocation efficiency vs 93.5% for round-robin (simulation)
- **83.5%** gas reduction via off-chain attestation aggregation
- **Sybil-resistant** concave capacity cap: $\text{cap}(S) = \sqrt{S/u}$
- **Incentive-compatible** — truthful reporting is a Bayesian-Nash equilibrium

## Repository Structure

```
contracts/          Solidity smart contracts (Foundry)
  src/              8 contracts + 7 interfaces
  test/             Unit + fork tests (76 passing)
  script/           Deployment scripts
  deployments/      Deployed addresses (Base Sepolia)

sdk/                TypeScript SDK (@spilt/sdk)
  src/actions/      8 action modules (sink, source, pool, stake, ...)
  src/examples/     Full-flow demo + testnet validation script

docs/paper/         Research paper (LaTeX, 14 sections)
simulation/         Python simulation (5 experiments, figure generation)
plan/               Design documents and protocol specification
website/            MkDocs Material site source
```

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (forge, cast, anvil)
- [Node.js](https://nodejs.org/) ≥ 18 + npm
- Python 3.10+ (for simulation and website build)

### Contracts

```bash
cd contracts
cp .env.example .env          # fill in your values
forge install
forge build
forge test                    # 76 tests, all passing
```

### SDK

```bash
cd sdk
npm install
npm run build                 # compile TypeScript
npm run lint                  # type-check
```

### Simulation

```bash
pip install numpy matplotlib
python simulation/bpe_sim.py  # runs 5 experiments, outputs figures to docs/paper/figures/
```

### Website

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install mkdocs-material pypandoc_binary pymupdf
./scripts/build-site.sh       # build to site/
./scripts/build-site.sh --serve  # local preview at localhost:8000
```

## Deployed Contracts (Base Sepolia)

All contracts are verified on [Basescan](https://sepolia.basescan.org/).

| Contract | Address |
|----------|---------|
| BPEToken | [`0xf5cf3cd405ac3b48dde534d9793ce9118d4ca4a5`](https://sepolia.basescan.org/address/0xf5cf3cd405ac3b48dde534d9793ce9118d4ca4a5) |
| TestUSDC | [`0xb1152e5426e4cebd7a3f034fff7fae2711e8ff15`](https://sepolia.basescan.org/address/0xb1152e5426e4cebd7a3f034fff7fae2711e8ff15) |
| StakeManager | [`0xdc26b147030f635a2f8ac466d28a88b3b33ca6b3`](https://sepolia.basescan.org/address/0xdc26b147030f635a2f8ac466d28a88b3b33ca6b3) |
| CapacityRegistry | [`0x6f58f28c0a270c198c65cff5c5a7ba9d86088948`](https://sepolia.basescan.org/address/0x6f58f28c0a270c198c65cff5c5a7ba9d86088948) |
| BackpressurePool | [`0x8e999a246afea241cf3c1d400dd7786cf591fa88`](https://sepolia.basescan.org/address/0x8e999a246afea241cf3c1d400dd7786cf591fa88) |
| EscrowBuffer | [`0x8d2f5b40315cccf9b7aa10869c035f9c7a0a3160`](https://sepolia.basescan.org/address/0x8d2f5b40315cccf9b7aa10869c035f9c7a0a3160) |
| Pipeline | [`0xbc2c20d75ab5a03f592bcfdb7d8c40fdd3f7afa7`](https://sepolia.basescan.org/address/0xbc2c20d75ab5a03f592bcfdb7d8c40fdd3f7afa7) |
| PricingCurve | [`0x11522daf010c08d5d26a2b1369567279a27338e3`](https://sepolia.basescan.org/address/0x11522daf010c08d5d26a2b1369567279a27338e3) |
| CompletionTracker | [`0xff3dab79a53ffd11bae041e094ed0b6217acfc3c`](https://sepolia.basescan.org/address/0xff3dab79a53ffd11bae041e094ed0b6217acfc3c) |
| OffchainAggregator | [`0xa70993d6d4cb5e4cf5ee8ddcbfde875e55a937fa`](https://sepolia.basescan.org/address/0xa70993d6d4cb5e4cf5ee8ddcbfde875e55a937fa) |

## Paper

The research paper is in [`docs/paper/`](docs/paper/) (LaTeX). Key sections:

1. **Formal Model** — capacity-constrained monetary flow network with EWMA smoothing
2. **Throughput Optimality** — Lyapunov drift proof with explicit overflow buffer bounds
3. **Dynamic Pricing** — EIP-1559-style queue-length pricing with equilibrium analysis
4. **Off-Chain Attestation** — batched EIP-712 capacity signals (83.5% gas savings)
5. **Security Analysis** — Sybil resistance, MEV resistance, Bayesian-Nash incentive compatibility
6. **Capacity Verification** — statistical completion tracking with auto-slash

Build the PDF:
```bash
cd docs/paper && pdflatex main && bibtex main && pdflatex main && pdflatex main
```

## License

[MIT](LICENSE)
