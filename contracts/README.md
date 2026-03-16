# Backproto Smart Contracts

**17 Solidity contracts across 4 domains + platform layer, deployed on Base Sepolia**

## Domains

### Core BPE (8 contracts)

| Contract | Purpose |
|----------|---------|
| `CapacityRegistry` | Task type + sink registry, commit-reveal capacity signals, EWMA smoothing |
| `StakeManager` | Stake/unstake/slash, concave capacity cap √(stake/unit) |
| `BackpressurePool` | Superfluid GDA pool with capacity-weighted unit rebalancing |
| `EscrowBuffer` | Overflow hold when all sinks saturated, FIFO drain |
| `Pipeline` | Multi-stage pool chains with upstream congestion propagation |
| `PricingCurve` | EIP-1559-style dynamic fees based on queue length |
| `CompletionTracker` | Statistical capacity verification with auto-slash |
| `OffchainAggregator` | Batched EIP-712 attestation submission (83.5% gas savings) |

### Demurrage (2 contracts)

| Contract | Purpose |
|----------|---------|
| `DemurrageToken` | ERC-20 Super Token with configurable time-decay (demurrage) |
| `VelocityMetrics` | Epoch-based velocity and turnover rate tracking |

### Nostr Relays (2 contracts)

| Contract | Purpose |
|----------|---------|
| `RelayCapacityRegistry` | NIP-compliant relay capacity signals via EIP-712 attestations |
| `RelayPaymentPool` | Anti-spam minimum + BPE-weighted streaming payment distribution |

### Lightning (3 contracts)

| Contract | Purpose |
|----------|---------|
| `LightningCapacityOracle` | EWMA-smoothed Lightning node capacity from signed attestations |
| `LightningRoutingPool` | BPE pool weighting nodes by capacity/congestion score |
| `CrossProtocolRouter` | Unified routing across Superfluid, Lightning, and on-chain |

### Platform (2 contracts)

| Contract | Purpose |
|----------|---------|
| `UniversalCapacityAdapter` | Domain adapter registry routing attestations to core BPE |
| `ReputationLedger` | Cross-domain portable reputation, 3× negative weight, stake discounts |

## Build & Test

```bash
forge install       # install dependencies
forge build         # compile all contracts
forge test          # 125 tests, all passing
forge test -vvv     # verbose output with traces
```

## Deploy

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Dependencies

- [OpenZeppelin Contracts v5](https://github.com/OpenZeppelin/openzeppelin-contracts): Ownable, ECDSA, EIP712, ERC20, SafeERC20, Math
- [Superfluid Protocol](https://github.com/superfluid-finance/protocol-monorepo): GDA, Super Tokens, ISuperTokenFactory
- [Forge Std](https://github.com/foundry-rs/forge-std): Test framework

## License

[MIT](../LICENSE)
