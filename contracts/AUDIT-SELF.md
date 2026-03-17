# Security Self-Audit

Date: 2026-03-17
Scope: All 22 implementation contracts in `src/`
Tools: Slither 0.10.x, Aderyn 0.6.8, manual review

## Tool Results

### Slither

71 contracts analyzed, 126 results. Zero high or medium severity findings.

Notable informational results (all acceptable):
- **Timestamp comparisons** (expected): UrgencyToken TTL, VelocityToken decay, epoch advancement all intentionally use `block.timestamp`
- **Costly loop in `batchBurn`**: UrgencyToken batch operations update storage in a loop. Acceptable for small batch sizes; callers control array length
- **Low-level call in CrossProtocolRouter**: By design (adapter pattern). Adapter address is owner-controlled
- **Cache array length in LightningRoutingPool**: Gas optimization opportunity, not a vulnerability
- **Missing inheritance**: CapacityRegistry could inherit CapacityRegistryLike interface. Cosmetic

### Aderyn

47 files, 3,090 nSLOC, 88 detectors. 3 high findings, 16 low.

**H-1: CrossProtocolRouter locks Ether** — FIXED. Added `withdrawETH()` function for owner to recover accidentally sent ETH.

**H-2: Reentrancy (48 instances)** — REVIEWED, ACCEPTABLE. All external calls are to our own trusted contracts (CapacityRegistry, StakeManager, BackpressurePool) or Superfluid's GDA. State changes after external calls follow the trust boundary: we trust our own deployed contracts. No user-supplied callbacks. No untrusted external calls in the reentrancy paths.

**H-3: Weak randomness (2 instances)** — FALSE POSITIVE. Both instances are `keccak256` used for EIP-712 struct hashing in CompletionTracker and OpenClawCompletionVerifier. This is cryptographic hashing for signature verification, not randomness generation.

Low findings (all informational/accepted):
- L-1: Centralization risk (Ownable contracts) — by design; owner is deployer
- L-2: Costly operations inside loop — bounded by caller input
- L-3: Empty block — intentional no-op constructors
- L-4/L-5: Large numeric literals / literals instead of constants — readability preference
- L-8: State change without event — some internal bookkeeping updates
- L-10: State variable could be immutable — gas optimization, not security
- L-12: Unchecked return — Superfluid GDA calls return bool; failures revert internally

Full Aderyn report preserved in `AUDIT-ADERYN.md`.

## Manual Review

### Stake/Slash Paths

**StakeManager**: `slash()` is restricted to authorized slashers (set by owner via `setSlasher()`). Only `CompletionTracker` is authorized. Slash amount is bounded by actual stake balance. No path for unauthorized slashing.

**CompletionTracker**: Slash triggers require `consecutiveBelow >= 3` (three consecutive epochs below threshold). Slash amount is `10% * (threshold - actual) / threshold * stake`. This is proportional and bounded. An attacker cannot trigger slashing of other users — only the owner (via `advanceEpoch`) can advance epochs.

### EIP-712 Signature Validation

**OffchainAggregator**: Domain separator includes chain ID, verifying address, and name/version. Nonces are monotonically increasing per sink (`lastNonce[sink]`). Timestamp freshness is enforced (`MAX_ATTESTATION_AGE = 5 minutes`). Replay protection is adequate.

### GDA Unit Math

**BackpressurePool.rebalance()**: Units are set proportional to smoothed capacity. Zero-capacity sinks get 0 units. No division by zero (guarded by `totalCap > 0` check). Rounding is standard uint256 truncation — negligible dust amounts.

### DemurrageToken Decay

**DemurrageToken**: Decay uses `(balance * rate * elapsed) / (365 days * 1e18)`. No overflow risk with realistic values (balance < 1e27, rate < 1e18, elapsed < 1e8). Checked arithmetic by default in Solidity 0.8.26.

### Access Control

All `onlyOwner` functions reviewed. Owner is set at deployment. No unprotected admin functions found. `transferOwnership` inherited from OpenZeppelin Ownable (two-step not used — acceptable for reference demo where deployer retains ownership).

## Conclusion

No exploitable vulnerabilities found. One cosmetic fix applied (H-1: ETH withdrawal). The codebase is suitable for a reference deployment with protocol-owned wallets. A formal third-party audit is recommended before handling external user funds.
