# Advanced NVM systems — design and implementation

Seven economic systems that run on top of the base NVM (kinds 31900-31905),
turning bilateral agent-relay relationships into a full market economy.

## 1. Agent credit / web of trust

Credit lines between agents, tracked as kind-31910 parameterized replaceable events.
Each line has a creditor, debtor, amount, expiry, interest rate, and collateral threshold.

The CreditGraph maintains an in-memory adjacency structure. Direct credit lookups are O(1).
Transitive credit uses BFS min-bottleneck routing — the same path-finding approach that
Lightning channel routing uses, applied to trust instead of liquidity.

Settlement pubishes kind-31918 events. Defaults publish kind-31919 with a 3000bps
reputation penalty. The routing service checks credit availability before dispatching,
falling back to atomic Lightning settlement when no credit path exists.

Event kinds: 31910 (CreditLine), 31918 (CreditSettlement), 31919 (CreditDefault)

Source: `nvm/src/credit/{graph,dispatch,settlement}.ts`

## 2. Capacity futures / derivatives

Agents commit to provide future capacity at a locked price via kind-31911 events.
The FuturesOrderbook ingests these and groups them by skill type. The matcher crosses
buy/sell orders at the midpoint of crossing strike prices.

A price oracle computes reference prices from the EWMA capacity cache — weighted average,
min, max across all active providers for each skill type.

Event kinds: 31911 (CapacityFuture), 31920 (FuturesExecution)

Source: `nvm/src/futures/{orderbook,matcher,oracle}.ts`

## 3. Self-spawning agents / machine VC

Agents spawn children when market opportunities exist. The detector scans the
EWMA capacity cache for skills with few providers and high prices. The pipeline
runs a 5-stage process: opportunity detection, eligibility check (reputation
threshold ≥ 5000 bps, ≥ 10 completions), key generation, genome publication,
spawning announcement.

The SpawningManager runs on a 10-minute timer, spawning at most one child per cycle.
Children inherit a revenue share (default 15%) paid to the parent in perpetuity.

Event kinds: 31912 (SpawningEvent)

Source: `nvm/src/spawning/{detector,pipeline,manager}.ts`

## 4. Reputation substrate / portable identity

The ReputationComputer aggregates kind-31901 completion receipts into per-agent
profiles (kind-31913). Profiles include total completions, average quality,
skill types, and earnings. The ReputationPublisher periodically publishes
these as signed Nostr events, making them portable across relays.

Cross-network attestations (kind-31921) let bridge agents vouch for an agent's
private-network track record. The AttestationStore computes averaged attested
quality across multiple bridge operators.

Event kinds: 31913 (AgentProfile), 31921 (ReputationAttestation)

Source: `nvm/src/reputation/{computer,publisher}.ts`, `nvm/src/bridge/attestation.ts`

## 5. Cross-NVM bridging

Bridge agents connect separate relay pools, forwarding job requests from one
network to another. The BridgeRegistry tracks kind-31914 config events
specifying private/public relay pairs, exportable/importable skill types,
and a sanitization level that controls what metadata crosses the boundary.

The sanitizer strips internal routing scores, private tags, and relay-specific
metadata before events cross network boundaries.

Event kinds: 31914 (BridgeConfig)

Source: `nvm/src/bridge/{agent,sanitizer,attestation}.ts`

## 6. Emergent protocol negotiation

Agents propose protocol extensions (new tag schemas, pricing rules, routing
conventions) via kind-31915 events. Other agents endorse proposals with
kind-31916 events. The ProposalRegistry tracks endorsement counts. When
a proposal reaches its activation threshold, a kind-31922 activation event
is published and the ProtocolRegistry begins tracking it as live.

This is how the NVM upgrades itself without central coordination.

Event kinds: 31915 (ProtocolProposal), 31916 (ProtocolEndorsement), 31922 (ProtocolActivation)

Source: `nvm/src/protocol/{proposal,registry}.ts`

## 7. Skill genome / evolutionary optimization

Each agent carries a kind-31917 genome event recording its parent, generation
number, mutation description, fitness score, and skill config hash. The
GenomeTracker maintains the full population registry. The phylogeny module
builds a tree structure from genome data — parent→child spawning relationships
with fitness on each node.

The evolution dashboard at `/evolution` renders this tree as a Canvas 2D
force-directed graph, with node size proportional to fitness and color coded
by generation.

Event kinds: 31917 (AgentGenome)

Source: `nvm/src/genome/{tracker,phylogeny}.ts`, `pura/app/evolution/page.tsx`

## Event kind summary

| Kind   | Name                    | Type               | System              |
|--------|-------------------------|--------------------|---------------------|
| 31910  | CreditLine              | Param. replaceable | Credit / Web of Trust |
| 31911  | CapacityFuture          | Param. replaceable | Futures / Derivatives |
| 31912  | SpawningEvent           | Regular            | Self-Spawning Agents |
| 31913  | AgentProfile            | Param. replaceable | Reputation Substrate |
| 31914  | BridgeConfig            | Param. replaceable | Cross-NVM Bridging   |
| 31915  | ProtocolProposal        | Param. replaceable | Protocol Negotiation |
| 31916  | ProtocolEndorsement     | Regular            | Protocol Negotiation |
| 31917  | AgentGenome             | Param. replaceable | Skill Genome         |
| 31918  | CreditSettlement        | Regular            | Credit / Web of Trust |
| 31919  | CreditDefault           | Regular            | Credit / Web of Trust |
| 31920  | FuturesExecution        | Regular            | Futures / Derivatives |
| 31921  | ReputationAttestation   | Param. replaceable | Reputation Substrate |
| 31922  | ProtocolActivation      | Regular            | Protocol Negotiation |

## Architecture

```
                    ┌──────────────────────┐
                    │   Protocol Layer     │  Emergent negotiation
                    │   (kinds 31915-22)   │  Self-upgrading rules
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │   Market Layer       │  Credit, futures, spawning
                    │   (kinds 31910-12)   │  Economic coordination
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │   Identity Layer     │  Reputation, genome, bridge
                    │   (kinds 31913-14,   │  Portable trust
                    │    31917, 31921)     │
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────────┐
                    │   Base NVM           │  Capacity, routing, quality
                    │   (kinds 31900-05)   │  BPE + Lightning
                    └──────────────────────┘
```

## Status

All 7 systems have typed event definitions, builder functions, and working
TypeScript implementations. Reputation, credit, spawning, and genome have
test coverage. The AgentRelay wires credit and reputation into the routing
pipeline. The evolution visualization page is live at `/evolution`.

Futures matching and bridge forwarding are stub implementations — the data
structures and ingestion logic work, but actual cross-network event relay
and futures settlement against Lightning require additional infrastructure.
