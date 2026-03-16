// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ILightningRoutingPool
/// @notice BPE pool where Lightning nodes are sinks weighted by their available routing capacity.
///         Nodes with balanced channels earn more. Dynamic fees penalize congested routes.
interface ILightningRoutingPool {
    // ──────────────────── Events ────────────────────

    event NodeJoinedPool(bytes32 indexed nodePubkey, address indexed operator);
    event NodeLeftPool(bytes32 indexed nodePubkey, address indexed operator);
    event RoutingPoolRebalanced(uint256 nodeCount, uint256 totalCapacitySats);
    event RoutingFeeUpdated(bytes32 indexed nodePubkey, uint256 newFee);

    // ──────────────────── Pool Management ────────────────────

    /// @notice Initialize the Lightning routing pool.
    function initializePool() external;

    /// @notice Register a Lightning node as a member of the routing pool.
    /// @param nodePubkey Hash of the Lightning node's public key.
    function joinPool(bytes32 nodePubkey) external;

    /// @notice Remove a Lightning node from the routing pool.
    /// @param nodePubkey Hash of the Lightning node's public key.
    function leavePool(bytes32 nodePubkey) external;

    /// @notice Trigger rebalance of pool weights based on current capacity signals.
    function rebalance() external;

    // ──────────────────── Routing ────────────────────

    /// @notice Get the optimal set of nodes for routing a payment, weighted by backpressure.
    /// @param amountSats The payment amount in satoshis.
    /// @param maxNodes Maximum number of nodes to include in the route.
    /// @return nodePubkeys Ordered array of recommended routing nodes.
    /// @return allocations Proportion of payment to route through each node (in BPS).
    /// @return fees Estimated routing fee for each node.
    function getOptimalRoute(uint256 amountSats, uint256 maxNodes)
        external
        view
        returns (bytes32[] memory nodePubkeys, uint256[] memory allocations, uint256[] memory fees);

    // ──────────────────── Reads ────────────────────

    /// @notice Get the BackpressurePool address for Lightning routing.
    function getPoolAddress() external view returns (address);

    /// @notice Check if a node is in the routing pool.
    function isNodeInPool(bytes32 nodePubkey) external view returns (bool);

    /// @notice Get the current routing fee estimate for a specific node.
    function getRoutingFee(bytes32 nodePubkey) external view returns (uint256);
}
