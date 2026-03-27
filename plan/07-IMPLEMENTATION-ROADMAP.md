# Implementation Roadmap

## Phase Overview

```
Phase 1: Core Protocol (Steps 1-4)  ──►  Phase 3: Agent SDK (Steps 7-8)
       │                                        │
       ├── Phase 2: Capacity Oracle (Steps 5-6) │
       │                                        ▼
       └────────────────────────────────► Phase 4: Pipeline (Steps 9-10)
                                                │
                                                ▼
                                          Phase 5: Paper (Steps 11-12)
```

## Phase 1: Core Protocol (On-chain)

### Step 1: Project Setup
- Foundry project, Superfluid SDK deps, OpenZeppelin, Base Sepolia config
### Step 2: CapacityRegistry
- Task type registration, sink registration, commit-reveal, EWMA, capacity cap
### Step 3: BackpressurePool
- Superfluid GDA pool factory, rebalance(), needsRebalance()
### Step 4: StakeManager + EscrowBuffer
- Stake/unstake/slash, buffer deposit/drain/B_max

## Phase 2: Capacity Oracle (Off-chain)
### Step 5: Oracle service (TypeScript/Node.js)
### Step 6: Verification service

## Phase 3: Agent SDK
### Step 7: Sink SDK (agent-side capacity computation)
### Step 8: Source SDK (task streaming)

## Phase 4: Pipeline
### Step 9: Pipeline.sol (multi-pool composition)
### Step 10: End-to-end demo on Base Sepolia

## Phase 5: Paper & Simulation
### Step 11: Agent-based simulation (Python)
### Step 12: Paper writing (LaTeX)

## Phase 6: Advanced NVM systems (Steps 13-19)

Seven economic systems on top of the base NVM relay. Full spec in `plan/14-ADVANCED-NVM-SYSTEMS.md`.

### Step 13: Event types + builders (kinds 31910-31922)
### Step 14: Agent credit graph + settlement
### Step 15: Reputation computer + publisher
### Step 16: Self-spawning agents (detector, pipeline, manager)
### Step 17: Skill genome tracker + phylogeny
### Step 18: Capacity futures (orderbook, matcher, oracle)
### Step 19: Cross-NVM bridge + emergent protocol negotiation

Status: Steps 13-17 are implemented with test coverage. Steps 18-19 are stubs.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.26+, Foundry |
| Superfluid | @superfluid-finance/ethereum-contracts |
| Oracle | TypeScript, Node.js, ethers.js v6 |
| Agent SDK | TypeScript (primary), Python (secondary) |
| Simulation | Python 3.11+, NumPy, Matplotlib |
| Chain | Base Sepolia (testnet), Base (mainnet) |
