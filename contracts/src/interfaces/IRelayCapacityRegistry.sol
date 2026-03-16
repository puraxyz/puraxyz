// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IRelayCapacityRegistry
/// @notice Registry for Nostr relay capacity signals. Maps Nostr pubkeys to on-chain sink
///         addresses with multi-dimensional capacity (throughput + storage + bandwidth).
interface IRelayCapacityRegistry {
    // ──────────────────── Events ────────────────────

    event RelayRegistered(
        bytes32 indexed nostrPubkey, address indexed operator, string relayUrl, uint256 compositeCapacity
    );
    event RelayDeregistered(bytes32 indexed nostrPubkey, address indexed operator);
    event RelayCapacityUpdated(
        bytes32 indexed nostrPubkey,
        uint256 eventsPerSecond,
        uint256 storageGB,
        uint256 bandwidthMbps,
        uint256 compositeCapacity
    );
    event CapacityWeightsUpdated(uint256 throughputWeight, uint256 storageWeight, uint256 bandwidthWeight);

    // ──────────────────── Structs ────────────────────

    struct RelayCapacity {
        uint256 eventsPerSecond; // Throughput: events the relay can process per second
        uint256 storageGB; // Storage: gigabytes of event retention capacity
        uint256 bandwidthMbps; // Bandwidth: megabits per second serving capacity
    }

    struct RelayInfo {
        bytes32 nostrPubkey; // Nostr secp256k1 pubkey (32 bytes)
        address operator; // Ethereum address of relay operator
        string relayUrl; // wss://... relay URL
        RelayCapacity capacity; // Multi-dimensional capacity
        uint256 compositeCapacity; // Weighted composite score (used for BPE allocation)
        bool registered;
    }

    // ──────────────────── Registration ────────────────────

    /// @notice Register a Nostr relay with on-chain identity linking.
    /// @param nostrPubkey The relay's Nostr public key (32 bytes, secp256k1 x-coordinate).
    /// @param relayUrl The relay's WebSocket URL (e.g., "wss://nos.lol").
    /// @param initialCapacity Initial multi-dimensional capacity declaration.
    function registerRelay(bytes32 nostrPubkey, string calldata relayUrl, RelayCapacity calldata initialCapacity)
        external;

    /// @notice Deregister a relay, removing it from all pools.
    /// @param nostrPubkey The relay's Nostr public key.
    function deregisterRelay(bytes32 nostrPubkey) external;

    // ──────────────────── Capacity Updates ────────────────────

    /// @notice Update relay capacity (from authorized aggregator, fed by Nostr bridge).
    /// @param nostrPubkey The relay's Nostr public key.
    /// @param capacity Updated multi-dimensional capacity.
    function updateRelayCapacity(bytes32 nostrPubkey, RelayCapacity calldata capacity) external;

    // ──────────────────── Configuration ────────────────────

    /// @notice Set the weights for computing composite capacity from multi-dimensional signals.
    /// @param throughputWeight Weight for events/second (in BPS).
    /// @param storageWeight Weight for storage GB (in BPS).
    /// @param bandwidthWeight Weight for bandwidth Mbps (in BPS).
    function setCapacityWeights(uint256 throughputWeight, uint256 storageWeight, uint256 bandwidthWeight) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get full relay information.
    function getRelay(bytes32 nostrPubkey) external view returns (RelayInfo memory);

    /// @notice Get the Ethereum address linked to a Nostr pubkey.
    function getOperator(bytes32 nostrPubkey) external view returns (address);

    /// @notice Get the composite capacity for a relay.
    function getCompositeCapacity(bytes32 nostrPubkey) external view returns (uint256);

    /// @notice Get all registered relays and their composite capacities.
    function getAllRelays() external view returns (bytes32[] memory pubkeys, uint256[] memory capacities);

    /// @notice Get the task type ID used for relay routing in the core CapacityRegistry.
    function relayTaskTypeId() external view returns (bytes32);
}
