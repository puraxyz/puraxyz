// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ILightningCapacityOracle
/// @notice On-chain oracle for Lightning Network node capacity signals. Nodes sign capacity
///         attestations off-chain (aggregate outbound liquidity + pending HTLCs) and submit
///         via batch aggregation. Privacy-preserving: only aggregate capacity, not per-channel.
interface ILightningCapacityOracle {
    // ──────────────────── Events ────────────────────

    event LightningNodeRegistered(
        bytes32 indexed nodePubkey, address indexed operator, uint256 initialCapacity
    );
    event LightningNodeDeregistered(bytes32 indexed nodePubkey, address indexed operator);
    event LightningCapacityUpdated(
        bytes32 indexed nodePubkey,
        uint256 outboundCapacitySats,
        uint256 channelCount,
        uint256 pendingHTLCs,
        uint256 smoothedCapacity
    );

    // ──────────────────── Structs ────────────────────

    struct LightningAttestation {
        bytes32 nodePubkey; // Lightning node public key (33 bytes compressed → 32 bytes hash)
        address operator; // Linked Ethereum address
        uint256 outboundCapacitySats; // Total outbound liquidity in satoshis
        uint256 channelCount; // Number of active channels
        uint256 pendingHTLCs; // Number of in-flight HTLCs (queue load equivalent)
        uint256 timestamp;
        uint256 nonce;
        bytes signature; // EIP-712 signature by operator
    }

    // ──────────────────── Registration ────────────────────

    /// @notice Register a Lightning node with on-chain identity linking.
    /// @param nodePubkey Hash of the Lightning node's public key.
    /// @param initialCapacitySats Initial declared outbound capacity in satoshis.
    function registerNode(bytes32 nodePubkey, uint256 initialCapacitySats) external;

    /// @notice Deregister a Lightning node.
    function deregisterNode(bytes32 nodePubkey) external;

    // ──────────────────── Batch Updates ────────────────────

    /// @notice Submit a batch of Lightning capacity attestations.
    /// @param attestations Array of signed capacity attestations.
    function submitBatch(LightningAttestation[] calldata attestations) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get EWMA-smoothed capacity for a Lightning node.
    function getSmoothedCapacity(bytes32 nodePubkey) external view returns (uint256);

    /// @notice Get the pending HTLC count (queue load) for a node.
    function getPendingHTLCs(bytes32 nodePubkey) external view returns (uint256);

    /// @notice Get the Ethereum operator address for a Lightning node.
    function getOperator(bytes32 nodePubkey) external view returns (address);

    /// @notice Get all registered Lightning nodes and their capacities.
    function getAllNodes() external view returns (bytes32[] memory pubkeys, uint256[] memory capacities);

    /// @notice Get the task type ID used for Lightning routing in the core CapacityRegistry.
    function lightningTaskTypeId() external view returns (bytes32);
}
