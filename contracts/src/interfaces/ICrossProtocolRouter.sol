// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ICrossProtocolRouter
/// @notice Unified routing interface across Superfluid (streaming), Lightning (instant),
///         and on-chain (settlement) payment protocols. Selects optimal route based on
///         availability, cost, and speed constraints.
interface ICrossProtocolRouter {
    // ──────────────────── Events ────────────────────

    event RouteSelected(
        bytes32 indexed routeId,
        address indexed sender,
        address indexed recipient,
        RouteProtocol protocol,
        uint256 amount,
        uint256 estimatedFee
    );
    event RouteExecuted(bytes32 indexed routeId, RouteProtocol protocol, bool success);
    event ProtocolRegistered(RouteProtocol protocol, address adapter);

    // ──────────────────── Enums ────────────────────

    enum RouteProtocol {
        SUPERFLUID, // Streaming payments via CFA/GDA
        LIGHTNING, // Instant payments via Lightning Network
        ONCHAIN // Direct on-chain settlement (fallback)
    }

    enum RouteOptimization {
        SPEED, // Minimize latency
        COST, // Minimize fees
        RELIABILITY // Maximize success probability
    }

    // ──────────────────── Structs ────────────────────

    struct RouteRequest {
        address recipient;
        uint256 amount;
        RouteOptimization optimization;
        uint256 maxFee; // Maximum acceptable fee (0 = no limit)
        uint256 deadline; // Execution deadline (0 = no deadline)
    }

    struct RouteRecommendation {
        bytes32 routeId;
        RouteProtocol protocol;
        uint256 estimatedFee;
        uint256 estimatedLatency; // In seconds
        uint256 successProbability; // In BPS (10000 = 100%)
        bytes routeData; // Protocol-specific routing data
    }

    // ──────────────────── Routing ────────────────────

    /// @notice Get routing recommendations for a payment, sorted by the optimization criteria.
    /// @param request The routing request parameters.
    /// @return recommendations Ordered array of route recommendations.
    function getRoutes(RouteRequest calldata request)
        external
        view
        returns (RouteRecommendation[] memory recommendations);

    /// @notice Execute a payment via the recommended route.
    /// @param routeId The route ID from a previous getRoutes() call.
    /// @param routeData Protocol-specific data for execution.
    function executeRoute(bytes32 routeId, bytes calldata routeData) external payable;

    // ──────────────────── Protocol Adapters ────────────────────

    /// @notice Register a protocol adapter for route execution.
    /// @param protocol The protocol type.
    /// @param adapter The adapter contract address implementing protocol-specific logic.
    function registerProtocolAdapter(RouteProtocol protocol, address adapter) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Check if a protocol is available for routing.
    function isProtocolAvailable(RouteProtocol protocol) external view returns (bool);

    /// @notice Get the adapter address for a protocol.
    function getProtocolAdapter(RouteProtocol protocol) external view returns (address);
}
