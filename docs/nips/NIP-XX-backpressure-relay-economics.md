# NIP-XX: Backpressure Relay Economics

`draft` `optional`

## Abstract

This NIP defines an economic layer for Nostr relays using backpressure-based resource allocation. Relays declare multi-dimensional capacity (throughput, storage, bandwidth) that is verified and smoothed on-chain, enabling proportional payment distribution via streaming micropayments. The protocol creates a self-correcting marketplace where relay operators are compensated proportionally to their real-time available capacity, while anti-spam mechanisms set minimum payment thresholds for event publication.

## Motivation

Current Nostr relay economics are unsustainable. Most relays run at a loss or rely on donations. Paid-relay models (NIP-42 authentication) require manual pricing decisions and don't adapt to load. This NIP introduces:

1. **Capacity-weighted payment distribution**: Relays earn proportionally to their available capacity, not arbitrary pricing
2. **Anti-spam through economics**: Writers pay a minimum amount per event, making spam costly without censoring content
3. **Multi-dimensional resource accounting**: Throughput (events/sec), storage (GB), and bandwidth (Mbps) are separately tracked
4. **Dynamic pricing**: Fees adjust based on congestion via an EIP-1559-style pricing curve

## Specification

### Relay Capacity Declaration

Relays declare three capacity dimensions:

| Dimension | Unit | Description |
|-----------|------|-------------|
| `throughput` | events/second | Maximum event ingestion rate |
| `storage` | GB | Available storage for event retention |
| `bandwidth` | Mbps | Available bandwidth for query serving |

These combine into a composite score via configurable weights (default: 50% throughput, 25% storage, 25% bandwidth):

```
compositeCapacity = (throughput × w_t + storage × w_s + bandwidth × w_b) / BPS
```

### On-Chain Contracts

#### RelayCapacityRegistry

Maps Nostr relay pubkeys (32-byte Schnorr) to Ethereum operator addresses. Operators must stake tokens to participate (Sybil resistance via √stake capacity cap).

```
registerRelay(bytes32 nostrPubkey, RelayCapacity initialCapacity)
```

Capacity updates are EWMA-smoothed (α=0.3) to prevent gaming:

```
smoothed_new = α × raw + (1-α) × smoothed_old
```

#### RelayPaymentPool

Three pool types, each with independent payment streams:

| Pool | Purpose | Anti-Spam |
|------|---------|-----------|
| `RELAY_WRITE` | Event publication fees | Min payment per event |
| `RELAY_READ` | Query serving fees | Min payment per query batch |
| `RELAY_STORE` | Long-term storage fees | Min payment per GB-month |

Payments flow via Superfluid GDA (General Distribution Agreement), proportionally distributed to relay operators based on their smoothed capacity.

### Client Integration

#### Event Publication (NIP-01 Extension)

Clients attach payment proof when publishing events:

```json
{
  "kind": 1,
  "content": "Hello Nostr!",
  "tags": [
    ["backpressure", "<pool_address>", "<payment_amount>", "<tx_hash>"]
  ]
}
```

The `backpressure` tag is optional. Relays MAY require it for anti-spam. Relays that participate in the backpressure protocol SHOULD:

1. Verify the payment transaction exists on-chain
2. Verify the payment meets the minimum threshold for the pool type
3. Accept the event if payment is valid, regardless of other content filtering

#### Relay Discovery

Relay information documents (NIP-11) are extended with backpressure metadata:

```json
{
  "name": "Example Relay",
  "supported_nips": [1, 11, "XX"],
  "backpressure": {
    "operator": "0x1234...5678",
    "registry": "0xabcd...ef01",
    "pools": {
      "write": "0x...",
      "read": "0x...",
      "store": "0x..."
    },
    "min_payment": {
      "write": "1000",
      "read": "500",
      "store": "2000"
    },
    "chain_id": 8453,
    "token": "0x..."
  }
}
```

### Attestation Bridge

Relay capacity is attested by an off-chain bridge that:

1. Monitors relay health metrics (events/sec, storage, bandwidth)
2. Signs EIP-712 attestations bundling multiple relay updates
3. Submits batches to `RelayCapacityRegistry.updateCapacityFromAggregator()`

The aggregator pattern (matching the existing OffchainAggregator design) batches attestations to minimize gas costs (~83% gas savings vs individual updates).

### Fee Dynamics

Relay fees follow an EIP-1559-style pricing curve from the core BPE `PricingCurve` contract:

```
fee = baseFee × (1 + queueLength / TARGET_QUEUE_LENGTH)
```

When relay utilization exceeds 50%, fees increase exponentially. When underutilized, fees decrease to a minimum (the anti-spam floor).

## Rationale

### Why Streaming Payments?

Superfluid's GDA enables continuous proportional distribution without per-event settlement. A single token approval creates a persistent payment stream that automatically rebalances as relay capacity changes. This is dramatically more gas-efficient than per-event payments.

### Why Multi-Dimensional Capacity?

A relay with 1000 events/sec throughput but 1GB storage is fundamentally different from one with 10 events/sec but 100TB storage. Single-dimension capacity metrics systematically undervalue specialized relays.

### Why EWMA Smoothing?

Without smoothing, operators could oscillate capacity declarations to game payment allocation cycles. EWMA (α=0.3) makes rapid changes expensive: reaching 95% of a new value requires ~10 updates.

### Why √Stake Capacity Cap?

Concave capacity caps (via `StakeManager`) ensure diminishing returns for Sybil fragmentation. Splitting 400 tokens across 4 identities (4 × √100 = 40 capacity) yields less than a single identity (√400 ≈ 20 × 2 = 20... wait). Actually, using a single 400-token identity: √400 ≈ 20. Four 100-token identities: 4 × √100 = 4 × 10 = 40. The aggregation happens at the pool level where total capacity determines share, so fragmentation doesn't increase total share—it just increases gas costs.

## Security Considerations

1. **Relay attestation fraud**: Bridge operators could attest false capacity. Mitigated by: (a) EWMA smoothing reduces impact of outlier reports, (b) CompletionTracker verifies actual task completion, (c) slashing via StakeManager for persistent discrepancies.

2. **Anti-spam bypass**: Clients could pay minimum fees but send spam. Mitigated by: minimum payment thresholds set economically (cost must exceed spam value), and relays retain independent content filtering rights.

3. **Relay censorship**: Relays could accept payments but not serve events. Mitigated by: completion tracking and epoch-based slashing for relays that fail to meet their declared capacity.

## Implementations

- **Contracts**: `RelayCapacityRegistry.sol`, `RelayPaymentPool.sol` (Solidity 0.8.26, Base L2)
- **SDK**: `@puraxyz/sdk` TypeScript client with relay management actions
- **Bridge**: Off-chain attestation service (Node.js/TypeScript)

## References

- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md): Basic protocol
- [NIP-11](https://github.com/nostr-protocol/nips/blob/master/11.md): Relay Information Document
- [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md): Authentication of clients to relays
- [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559): Fee market change
- [Superfluid GDA](https://docs.superfluid.finance/docs/protocol/distributions/guides/distributions): General Distribution Agreement
