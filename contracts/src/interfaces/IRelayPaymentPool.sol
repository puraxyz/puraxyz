// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IRelayPaymentPool
/// @notice Payment pool system for Nostr relays, supporting three pool types:
///         WRITE (accepting events / anti-spam), READ (serving queries), STORE (long-term retention).
///         Each pool is a separate BackpressurePool with dynamic pricing.
interface IRelayPaymentPool {
    // ──────────────────── Events ────────────────────

    event RelayPoolCreated(bytes32 indexed poolType, bytes32 indexed taskTypeId, address indexed pool);
    event RelayJoinedPool(bytes32 indexed poolType, bytes32 indexed nostrPubkey, address operator);
    event RelayLeftPool(bytes32 indexed poolType, bytes32 indexed nostrPubkey, address operator);
    event AntiSpamConfigUpdated(bytes32 indexed poolType, uint256 minPaymentPerEvent);

    // ──────────────────── Pool Type Constants ────────────────────
    // Pool types are bytes32 identifiers:
    // RELAY_WRITE = keccak256("RELAY_WRITE")  - Payment for accepting/publishing events
    // RELAY_READ  = keccak256("RELAY_READ")   - Payment for serving subscription queries
    // RELAY_STORE = keccak256("RELAY_STORE")   - Payment for long-term event retention

    // ──────────────────── Pool Management ────────────────────

    /// @notice Initialize pools for all relay pool types.
    function initializePools() external;

    /// @notice Register a relay as a member of a specific pool type.
    /// @param poolType The pool type (RELAY_WRITE, RELAY_READ, or RELAY_STORE).
    /// @param nostrPubkey The relay's Nostr public key.
    function joinPool(bytes32 poolType, bytes32 nostrPubkey) external;

    /// @notice Remove a relay from a specific pool type.
    /// @param poolType The pool type.
    /// @param nostrPubkey The relay's Nostr public key.
    function leavePool(bytes32 poolType, bytes32 nostrPubkey) external;

    // ──────────────────── Anti-Spam ────────────────────

    /// @notice Set the minimum payment per event for a pool type (anti-spam).
    ///         Dynamic pricing from PricingCurve still applies on top.
    /// @param poolType The pool type.
    /// @param minPaymentPerEvent Minimum payment in token units per event.
    function setMinPaymentPerEvent(bytes32 poolType, uint256 minPaymentPerEvent) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the task type ID for a given pool type.
    function getTaskTypeId(bytes32 poolType) external view returns (bytes32);

    /// @notice Get the BackpressurePool address for a given pool type.
    function getPoolAddress(bytes32 poolType) external view returns (address);

    /// @notice Get the minimum payment per event for a pool type.
    function getMinPaymentPerEvent(bytes32 poolType) external view returns (uint256);

    /// @notice Check if a relay is a member of a specific pool type.
    function isRelayInPool(bytes32 poolType, bytes32 nostrPubkey) external view returns (bool);
}
