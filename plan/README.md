# Backpressure Economics (BPE) - Project Plan Directory

This directory contains all planning documents, blueprints, and specifications for the Backpressure Economics project. These documents are designed to be self-contained - an implementing agent should be able to build from these alone.

## Project Overview

**Backpressure Economics** is a novel cryptoeconomic mechanism that applies network backpressure routing (Tassiulas-Ephremides 1992) to monetary flows in AI agent economies. The core innovation: treating receiver-side capacity constraints as first-class payment routing primitives for continuous payment streams.

## Deliverables

1. **Academic Paper** - Formal theoretical contribution grounded in network optimization mathematics
2. **Protocol Specification** - Technical specification for the BPE Protocol, built on Superfluid Distribution Pools on Base (EVM L2)
3. **Reference Implementation** - Smart contracts + off-chain services + agent SDK
4. **Simulation** - Agent-based model for paper results

## Document Index

| File | Purpose |
|------|---------|
| [00-DECISIONS.md](00-DECISIONS.md) | All resolved design decisions and rationale |
| [01-NOVELTY-ASSESSMENT.md](01-NOVELTY-ASSESSMENT.md) | Pressure test of novelty, feasibility, prior art positioning |
| [02-PAPER-OUTLINE.md](02-PAPER-OUTLINE.md) | Full academic paper outline with section-by-section guidance |
| [03-PROTOCOL-SPEC.md](03-PROTOCOL-SPEC.md) | Complete technical protocol specification |
| [04-CONTRACTS-BLUEPRINT.md](04-CONTRACTS-BLUEPRINT.md) | Smart contract architecture, interfaces, and implementation guide |
| [05-SIMULATION-DESIGN.md](05-SIMULATION-DESIGN.md) | Agent-based simulation design for paper results |
| [06-BIBLIOGRAPHY.md](06-BIBLIOGRAPHY.md) | Complete annotated bibliography with role of each reference |
| [07-IMPLEMENTATION-ROADMAP.md](07-IMPLEMENTATION-ROADMAP.md) | Phased implementation plan with dependencies and verification |
| [08-GAPS-AND-MITIGATIONS.md](08-GAPS-AND-MITIGATIONS.md) | Known gaps, risks, and their mitigations |
| [10-CONTRACTS-V2-BLUEPRINT.md](10-CONTRACTS-V2-BLUEPRINT.md) | V2 contracts: recursive composition, quality, token mechanics |
| [11-BITRECIPES.md](11-BITRECIPES.md) | BitRecipes product plan |
| [12-VR-ABSORB.md](12-VR-ABSORB.md) | Absorbing vr.dev into the monorepo: rationale, integration surfaces, build sequence |

## Key Context

- **Date**: March 2026
- **Target L2**: Base (Coinbase ecosystem, Superfluid supported)
- **Primary application**: AI agent pipeline economics
- **Theoretical foundation**: Tassiulas-Ephremides backpressure routing (1992) + Kelly proportional fairness pricing (1998)
- **Implementation substrate**: Superfluid Distribution Pools (GDA)
- **Original research doc**: `../research/RESEARCH-1.md`
