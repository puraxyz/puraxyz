# 10 — Contracts V2 Blueprint

> Extends 04-CONTRACTS-BLUEPRINT.md with 9 new contracts across Demurrage, Nostr, Lightning, and Platform domains.

## Overview

The original BPE core (8 contracts) handles capacity-weighted payment routing for AI agents on Superfluid GDA. V2 extends the protocol to 4 domains:

| Domain | Contracts | Purpose |
|--------|-----------|---------|
| Core BPE | 8 (unchanged) | AI agent streaming payment routing |
| Demurrage | 2 | Time-decaying tokens + velocity metrics |
| Nostr | 2 | Relay capacity signaling + payment pools |
| Lightning | 3 | Channel capacity oracles + cross-protocol routing |
| Platform | 2 | Universal adapter + cross-domain reputation |

**Total: 17 contracts, 14 interfaces, 125 passing tests.**

---

## Domain 1: Demurrage

### DemurrageToken.sol

**Purpose:** ERC-20 Super Token with configurable time-decay (demurrage). Users wrap underlying tokens; balances decay at `decayRateBps` per epoch, incentivizing circulation.

**State:**
- `mapping(address => uint256) _nominalBalances` — non-decaying ledger
- `mapping(address => uint256) _lastRebaseEpoch` — last rebase per account
- `mapping(address => bool) _exempt` — addresses exempt from decay (e.g., pools, escrow)
- `uint256 currentEpoch`, `uint256 epochLength`, `uint256 decayRateBps`
- `uint256 totalDecayed` — cumulative decay for analytics

**Key functions:**
- `wrap(uint256 amount)` — deposit underlying, mint nominal balance
- `unwrap(uint256 amount)` — burn nominal, return underlying pro-rata with decay
- `rebase(address account)` — apply pending decay epochs
- `advanceEpoch()` — increment epoch, callable by anyone after `epochLength` seconds
- `realBalanceOf(address)` — returns balance after pending decay
- `setExempt(address, bool)` — owner toggles decay exemption

**Constructor:** `(address underlying, uint256 epochLength, uint256 decayRateBps)`

**Dependencies:** ERC20 (OZ), SafeERC20, Ownable

### VelocityMetrics.sol

**Purpose:** Epoch-based velocity and turnover rate tracking. Records transfer volumes per epoch and computes monetary velocity = volume / supply.

**State:**
- `mapping(uint256 => uint256) epochVolume` — total transfer volume per epoch
- `mapping(uint256 => uint256) epochSupply` — average supply snapshot per epoch
- `uint256 currentEpoch`, `uint256 epochDuration`

**Key functions:**
- `recordTransfer(uint256 amount)` — increment epoch volume (called by DemurrageToken or relayer)
- `advanceEpoch()` — snapshot supply, start new epoch
- `getVelocity(uint256 epoch)` — volume / supply for given epoch
- `getTurnoverRate(uint256 epoch)` — velocity normalized to epoch duration

**Constructor:** `(uint256 epochDuration)`

**Dependencies:** Ownable

---

## Domain 2: Nostr Relays

### RelayCapacityRegistry.sol

**Purpose:** NIP-compliant relay capacity signaling. Relay operators register with stake, submit EIP-712 signed attestations of capacity metrics (events/sec, storage, bandwidth). EWMA-smoothed for stability.

**State:**
- `mapping(address => RelayOperator) operators` — relay metadata + stake
- `mapping(address => RelayCapacity) capacities` — smoothed capacity signals
- Core registry reference for routing attestations upstream

**Key functions:**
- `registerRelay(string calldata relayUrl, uint256 initialCapacity)` — register + stake
- `deregisterRelay()` — unstake + remove
- `submitAttestation(RelayAttestation calldata att, bytes calldata sig)` — EIP-712 verified, EWMA-smoothed
- `getCompositeCapacity(address relay)` — weighted composite of events/sec × uptime × storage
- `getAllRelays()` — enumeration for routing

**Constructor:** `(address coreRegistry, address stakeManager, uint256 alphaNum, uint256 alphaDen)`

**Dependencies:** IRelayCapacityRegistry, ICapacitySignal, IStakeManager, EIP712, ECDSA

### RelayPaymentPool.sol

**Purpose:** BPE-weighted streaming payment pool for Nostr relays. Extends BackpressurePool with anti-spam minimum — relays below minimum capacity are excluded from payment distribution.

**State:**
- `uint256 antiSpamMinimum` — minimum composite capacity to receive payments
- References to RelayCapacityRegistry for capacity reads

**Key functions:**
- `joinPool(address relay)` — enter payment pool (must meet anti-spam minimum)
- `leavePool(address relay)` — exit pool
- `setAntiSpamMinimum(uint256)` — owner configurable
- `rebalance()` — inherited from BackpressurePool, uses relay composite capacity as weights

**Constructor:** `(address relayRegistry, address pool, address pricingCurve, uint256 antiSpamMin)`

**Dependencies:** IBackpressurePool, IRelayCapacityRegistry, IPricingCurve

---

## Domain 3: Lightning

### LightningCapacityOracle.sol

**Purpose:** On-chain oracle for Lightning Network node capacity. Node operators submit EIP-712 signed attestation batches reporting channel capacity and pending HTLCs. Values are EWMA-smoothed (α = 0.3).

**State:**
- `mapping(address => LightningNode) nodes` — node metadata, stake reference
- `mapping(address => SmoothedCapacity) smoothedCapacity` — EWMA-smoothed values
- `mapping(address => uint256) pendingHTLCs` — reported pending HTLC count
- `address[] nodeList` — enumeration

**Key functions:**
- `registerNode(bytes calldata pubkey, uint256 initialCapacity)` — register + stake check
- `deregisterNode()` — remove from oracle
- `submitBatch(LightningAttestation[] calldata atts, bytes[] calldata sigs)` — batch verify EIP-712, update EWMA
- `getSmoothedCapacity(address node)` — latest EWMA value
- `getPendingHTLCs(address node)` — reported HTLC count
- `getAllNodes()` — full node list

**Constructor:** `(address coreRegistry, address stakeManager)`

**Dependencies:** ILightningCapacityOracle, ICapacitySignal, IStakeManager, EIP712, ECDSA

### LightningRoutingPool.sol

**Purpose:** BPE pool where Lightning nodes are sinks weighted by routing capacity. Selects top-N nodes by capacity/congestion score for optimal route recommendations.

**State:**
- `mapping(address => bool) members` — pool membership
- References to LightningCapacityOracle and PricingCurve

**Key functions:**
- `joinPool(uint256 initialCapacity)` — enter routing pool
- `leavePool()` — exit
- `rebalance()` — update unit weights from oracle capacity ÷ congestion
- `getOptimalRoute(uint256 n)` — returns top-N nodes sorted by score

**Constructor:** `(address oracle, address pool, address pricingCurve)`

**Dependencies:** IBackpressurePool, ILightningCapacityOracle, IPricingCurve

### CrossProtocolRouter.sol

**Purpose:** Unified routing across three protocols: Superfluid (streaming), Lightning (instant), and on-chain (settlement). Returns sorted recommendations by estimated cost, speed, and reliability.

**State:**
- `mapping(bytes32 => ProtocolAdapter) protocols` — registered protocol adapters
- `bytes32[] protocolIds` — enumeration

**Key functions:**
- `registerProtocolAdapter(bytes32 id, address adapter, ProtocolType ptype)` — owner registers
- `getRoutes(uint256 amount, address recipient)` — returns sorted RouteRecommendation array
- `executeRoute(bytes32 protocolId, uint256 amount, address recipient, bytes calldata data)` — forward to adapter
- `isProtocolAvailable(bytes32 id)` — availability check

**Constructor:** `()`

**Dependencies:** ICrossProtocolRouter, Ownable

---

## Domain 4: Platform

### UniversalCapacityAdapter.sol

**Purpose:** Registry mapping domain-specific adapters (Nostr, Lightning, etc.) to the core BPE CapacityRegistry. Normalizes domain capacity values to a common 0–10000 scale and caps attestation rate by stake.

**State:**
- `mapping(bytes32 => AdapterConfig) adapters` — domain → adapter address + weight
- `bytes32[] adapterIds` — enumeration

**Key functions:**
- `registerAdapter(bytes32 domainId, address adapter, uint256 weight)` — owner registers
- `removeAdapter(bytes32 domainId)` — owner removes
- `routeAttestation(bytes32 domainId, address provider, uint256 rawCapacity, bytes calldata proof)` — verify → normalize → cap by stake → route to core
- `normalizeCapacity(bytes32 domainId, uint256 raw)` — scale to 0–10000

**Constructor:** `(address coreRegistry, address stakeManager)`

**Dependencies:** ICapacityAdapter, ICapacitySignal, IStakeManager

### ReputationLedger.sol

**Purpose:** Cross-domain portable reputation. Positive actions increment domain-specific scores; negative actions hurt 3× as much. Aggregate reputation across domains earns stake discounts (up to 50%).

**State:**
- `mapping(address => mapping(bytes32 => RepScore)) scores` — per-account, per-domain
- `mapping(address => bytes32[]) accountDomains` — domains an account participates in
- `mapping(bytes32 => uint256) domainWeights` — relative importance per domain

**Key functions:**
- `recordPositive(address account, bytes32 domain, uint256 amount)` — increment (authorized callers only)
- `recordNegative(address account, bytes32 domain, uint256 amount)` — decrement by 3× amount
- `getAggregateReputation(address account)` — weighted average across all domains
- `getStakeDiscount(address account)` — cross-domain bonus, 0–5000 bps (50% max)
- `getAccountDomains(address account)` — list domains
- `setDomainWeight(bytes32 domain, uint256 weight)` — owner sets

**Constructor:** `()`

**Dependencies:** IReputationLedger, Ownable

---

## Contract Dependency Graph

```
                    ┌─────────────────────┐
                    │   StakeManager      │
                    └──────┬──────────────┘
                           │ stake checks
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│CapacityRegistry │ │RelayCapacity │ │LightningCapacity │
│  (core BPE)     │ │  Registry    │ │   Oracle         │
└────────┬────────┘ └──────┬───────┘ └──────┬───────────┘
         │                 │                │
    reads capacity    reads capacity   reads capacity
         │                 │                │
         ▼                 ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│BackpressurePool │ │RelayPayment  │ │LightningRouting  │
│  → EscrowBuffer │ │  Pool        │ │   Pool           │
│  → Pipeline     │ └──────────────┘ └──────────────────┘
│  → PricingCurve │
│  → Completion   │
│  → Aggregator   │
└─────────────────┘
         │                                   │
         └──────────┐              ┌─────────┘
                    ▼              ▼
           ┌────────────────────────────┐
           │  UniversalCapacityAdapter  │
           │  (normalizes + routes all  │
           │   domains to core BPE)     │
           └────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────────┐
           │    ReputationLedger        │
           │  (cross-domain portable    │
           │   reputation → discounts)  │
           └────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────────┐
           │   CrossProtocolRouter      │
           │  (unified Superfluid +     │
           │   Lightning + on-chain)    │
           └────────────────────────────┘
```

## Test Coverage

| Test File | Domain | Tests |
|-----------|--------|-------|
| CapacityRegistry.t.sol | Core | 12 |
| StakeManager.t.sol | Core | 8 |
| EscrowBuffer.t.sol | Core | 7 |
| PricingCurve.t.sol | Core | 11 |
| CompletionTracker.t.sol | Core | 8 |
| OffchainAggregator.t.sol | Core | 10 |
| GasBenchmark.t.sol | Core | 10 |
| DemurrageToken.t.sol | Demurrage | 16 |
| VelocityMetrics.t.sol | Demurrage | 9 |
| ReputationLedger.t.sol | Platform | 14 |
| LightningCapacityOracle.t.sol | Lightning | 10 |
| Fork tests (skipped) | Core | 2 |
| **Total** | | **125 passing** |

## Deployment Order

See `contracts/script/Deploy.s.sol`. Contracts deploy in dependency order:

1. StakeManager (no dependencies)
2. CapacityRegistry → BackpressurePool → EscrowBuffer → Pipeline (core chain)
3. PricingCurve → CompletionTracker → OffchainAggregator (core support)
4. DemurrageToken → VelocityMetrics (demurrage)
5. RelayCapacityRegistry → RelayPaymentPool (Nostr)
6. LightningCapacityOracle → LightningRoutingPool (Lightning)
7. CrossProtocolRouter → UniversalCapacityAdapter → ReputationLedger (platform)
