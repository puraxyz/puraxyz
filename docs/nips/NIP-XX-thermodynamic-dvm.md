# NIP-XX: Thermodynamic data vending machines

`draft` `optional`

## Abstract

This NIP extends NIP-90 (Data Vending Machines) with thermodynamic capacity routing. DVM operators declare compute capacity on-chain. A temperature oracle (τ) derived from attestation variance governs Boltzmann-weighted job routing: P(i) = exp(c_i / τ) / Σ exp(c_j / τ). Low temperature concentrates work on highest-capacity operators. High temperature spreads work for exploration. A virial monitor tracks equilibrium between collateral and throughput.

## Motivation

NIP-90 defines a DVM request/response pattern (kind 5xxx → 6xxx/7000) but says nothing about how clients should pick which DVM to use when multiple can handle a job. In practice, clients either hardcode a DVM pubkey or round-robin. There is no load balancing, no price signal, and no economic feedback loop.

This NIP adds three things:

1. On-chain capacity registration for DVMs, backed by stake
2. Boltzmann routing that samples DVMs by probability proportional to exp(capacity / τ)
3. Thermodynamic feedback: temperature rises with node disagreement, demurrage rises when the system is overstaked relative to work being done

## Specification

### DVM capacity registration

A DVM operator calls `registerSink(taskTypeId, capacity)` on the CapacityRegistry contract. The `taskTypeId` is derived from the NIP-90 job kind:

```
taskTypeId = keccak256(abi.encodePacked("nip90:", uint16(kind)))
```

For example, kind 5100 (text-to-text) would be `keccak256("nip90:5100")`.

Capacity is EWMA-smoothed on-chain (α = 0.3). The √stake cap prevents Sybil amplification.

### Boltzmann routing

Given N registered DVMs for a task type, the routing probability for DVM i is:

```
P(i) = exp(c_i / τ) / Σ_j exp(c_j / τ)
```

Where:
- `c_i` is DVM i's smoothed capacity
- `τ` is the system temperature from the TemperatureOracle contract

Clients compute this off-chain. The reference SDK provides `boltzmannRoute(taskTypeId)` which reads current capacities and temperature, then samples.

An exploration rate ε (default 5%) blends in uniform probability:

```
P_effective(i) = (1 - ε) × P(i) + ε × (1/N)
```

### Temperature oracle

The TemperatureOracle contract stores τ derived from attestation variance:

```
τ = τ_min + (τ_max - τ_min) × σ² / σ²_max
```

Where σ² is the variance of capacity attestations in the most recent batch. Default bounds: τ_min = 0.5, τ_max = 5.0.

The OffchainAggregator updates τ after each batch submission.

### Virial monitor

The VirialMonitor contract tracks the ratio:

```
V = 2 × throughput / (staked + escrowed)
```

At equilibrium V = 1. When V < 1, the system is overstaked (too much collateral, not enough work). Adaptive demurrage increases to discourage idle capital. When V > 1, the system needs more stake.

### Nostr event flow

Job requests follow NIP-90 with an added routing step:

1. Client reads on-chain capacity + temperature
2. Client samples DVM via Boltzmann distribution
3. Client publishes kind 5xxx request (NIP-90)
4. Selected DVM processes and publishes kind 6xxx result
5. OffchainAggregator submits completion attestation batch
6. BackpressurePool distributes payment stream

### New event tags

The following tags are added to DVM result events (kind 6xxx):

| Tag | Description |
|-----|-------------|
| `["capacity", "<value>"]` | DVM's current declared capacity |
| `["temperature", "<τ>"]` | System temperature at time of routing |
| `["boltzmann-share", "<P>"]` | DVM's Boltzmann probability |
| `["virial", "<V>"]` | Current virial ratio |

### Circuit breaker integration

If a pipeline stage enters Shock or Collapse phase (tracked in the Pipeline contract), the corresponding task type is temporarily suspended. Clients receiving a `StageCollapse` event from the SystemStateEmitter should route to alternative task types or queue the request.

### Kind 1090: congestion feedback

A new ephemeral event kind for broadcasting congestion price signals to clients.

```json
{
  "kind": 1090,
  "content": "",
  "tags": [
    ["task_type", "<taskTypeId hex>"],
    ["sink", "<DVM pubkey>"],
    ["price", "<msat>"],
    ["base_fee", "<msat>"],
    ["utilization_bps", "<0-10000>"],
    ["congestion_multiplier", "<float>"],
    ["temperature", "<τ>"],
    ["epoch", "<epoch number>"]
  ]
}
```

Publishers: any relay or aggregator that reads on-chain PricingCurve state. Clients subscribe to kind 1090 filtered by task_type to receive real-time congestion updates.

The price field is computed as: `baseFee × (1 + γ × queueLoad / capacity)` where γ defaults to 0.5. When utilization exceeds 50% (5000 bps), the congestion multiplier rises above 1.0 and clients should consider alternative sinks.

Events are ephemeral (not stored by relays). Recommended publish rate: once per epoch or on congestion state change.

## Security considerations

- Boltzmann routing is computed off-chain; a malicious client could ignore it. Economic incentives (payment pools only pay registered DVMs) make defection unprofitable.
- Temperature manipulation requires controlling a majority of attestation variance. The authorized updater pattern limits who can push variance to the oracle.
- Low temperature (τ → 0) creates winner-take-all dynamics. τ_min = 0.5 prevents complete concentration.

## Reference implementation

- Contracts: `TemperatureOracle.sol`, `VirialMonitor.sol`, `SystemStateEmitter.sol`, `DVMCapacityAdapter.sol`, `DVMCompletionVerifier.sol`, `DVMPricingCurve.sol`
- Settlement adapters: `SuperfluidSettlementAdapter.sol`, `LightningSettlementAdapter.sol`, `DirectSettlementAdapter.sol`
- SDK: `@puraxyz/sdk` — `temperature`, `virial`, `systemState` action modules, schema types (`JobIntent`, `PriceSignal`, `SettlementReceipt`)
- Shadow sidecar: `@pura/shadow` — zero-config metrics collection, BPE comparison engine
- Simulation: `simulation/bpe_sim.py` experiment E6 (Boltzmann temperature sweep)
