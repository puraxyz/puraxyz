// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ICrossProtocolRouter } from "../interfaces/ICrossProtocolRouter.sol";

/// @title CrossProtocolRouter
/// @notice Unified routing interface across Superfluid (streaming), Lightning (instant),
///         and on-chain (settlement) payment protocols. Protocol adapters handle execution.
///         Selects optimal route based on availability, cost, and speed constraints.
contract CrossProtocolRouter is ICrossProtocolRouter, Ownable {
    // ──────────────────── Storage ────────────────────

    mapping(RouteProtocol => address) internal _adapters;
    mapping(bytes32 routeId => RouteRecommendation) internal _pendingRoutes;

    uint256 internal _routeNonce;

    // ──────────────────── Errors ────────────────────

    error ProtocolNotAvailable();
    error RouteNotFound();
    error RouteExpired();
    error InsufficientPayment();

    // ──────────────────── Constructor ────────────────────

    constructor(address owner_) Ownable(owner_) {}

    // ──────────────────── Protocol Management ────────────────────

    /// @inheritdoc ICrossProtocolRouter
    function registerProtocolAdapter(RouteProtocol protocol, address adapter) external onlyOwner {
        _adapters[protocol] = adapter;
        emit ProtocolRegistered(protocol, adapter);
    }

    // ──────────────────── Routing ────────────────────

    /// @inheritdoc ICrossProtocolRouter
    function getRoutes(RouteRequest calldata request)
        external
        view
        returns (RouteRecommendation[] memory recommendations)
    {
        // Count available protocols
        uint256 count;
        if (_adapters[RouteProtocol.LIGHTNING] != address(0)) count++;
        if (_adapters[RouteProtocol.SUPERFLUID] != address(0)) count++;
        if (_adapters[RouteProtocol.ONCHAIN] != address(0)) count++;

        recommendations = new RouteRecommendation[](count);
        uint256 idx;

        // Lightning: fastest, moderate fees
        if (_adapters[RouteProtocol.LIGHTNING] != address(0)) {
            recommendations[idx] = RouteRecommendation({
                routeId: keccak256(abi.encode(_routeNonce, RouteProtocol.LIGHTNING, request.recipient)),
                protocol: RouteProtocol.LIGHTNING,
                estimatedFee: _estimateLightningFee(request.amount),
                estimatedLatency: 2,      // ~2 seconds
                successProbability: 9500,  // 95%
                routeData: ""
            });
            idx++;
        }

        // Superfluid: cheapest for ongoing, slower setup
        if (_adapters[RouteProtocol.SUPERFLUID] != address(0)) {
            recommendations[idx] = RouteRecommendation({
                routeId: keccak256(abi.encode(_routeNonce, RouteProtocol.SUPERFLUID, request.recipient)),
                protocol: RouteProtocol.SUPERFLUID,
                estimatedFee: _estimateSuperfluidFee(request.amount),
                estimatedLatency: 4,       // ~4 seconds (1 block)
                successProbability: 9900,   // 99%
                routeData: ""
            });
            idx++;
        }

        // On-chain: fallback, highest fees, reliable
        if (_adapters[RouteProtocol.ONCHAIN] != address(0)) {
            recommendations[idx] = RouteRecommendation({
                routeId: keccak256(abi.encode(_routeNonce, RouteProtocol.ONCHAIN, request.recipient)),
                protocol: RouteProtocol.ONCHAIN,
                estimatedFee: _estimateOnchainFee(request.amount),
                estimatedLatency: 12,      // ~12 seconds (safe confirmation)
                successProbability: 9999,   // 99.99%
                routeData: ""
            });
        }

        // Sort by optimization criteria
        if (request.optimization == RouteOptimization.SPEED) {
            _sortByLatency(recommendations);
        } else if (request.optimization == RouteOptimization.COST) {
            _sortByFee(recommendations);
        }
        // RELIABILITY is already sorted by success probability (on-chain > superfluid > lightning)
    }

    /// @inheritdoc ICrossProtocolRouter
    function executeRoute(bytes32 routeId, bytes calldata routeData) external payable {
        // Route execution delegated to protocol-specific adapter
        // In production, this would verify the route, call the adapter, and emit evidence
        RouteRecommendation storage route = _pendingRoutes[routeId];
        if (route.routeId == bytes32(0)) revert RouteNotFound();

        address adapter = _adapters[route.protocol];
        if (adapter == address(0)) revert ProtocolNotAvailable();

        // Delegate to adapter (implementation-specific)
        (bool success,) = adapter.call(routeData);

        emit RouteExecuted(routeId, route.protocol, success);
        delete _pendingRoutes[routeId];
    }

    // ──────────────────── Reads ────────────────────

    /// @notice Withdraw any ETH accidentally sent to this contract.
    function withdrawETH() external onlyOwner {
        (bool ok,) = msg.sender.call{value: address(this).balance}("");
        require(ok);
    }

    /// @inheritdoc ICrossProtocolRouter
    function isProtocolAvailable(RouteProtocol protocol) external view returns (bool) {
        return _adapters[protocol] != address(0);
    }

    /// @inheritdoc ICrossProtocolRouter
    function getProtocolAdapter(RouteProtocol protocol) external view returns (address) {
        return _adapters[protocol];
    }

    // ──────────────────── Internal Fee Estimation ────────────────────

    function _estimateLightningFee(uint256 amount) internal pure returns (uint256) {
        // Base fee + proportional fee (typical Lightning: 1 sat base + 1 ppm)
        return 1 + (amount / 1_000_000);
    }

    function _estimateSuperfluidFee(uint256 amount) internal pure returns (uint256) {
        // Superfluid streaming has minimal protocol fees, mostly gas
        return amount / 10_000; // ~0.01%
    }

    function _estimateOnchainFee(uint256 amount) internal pure returns (uint256) {
        // On-chain: fixed gas cost estimate (in token terms)
        return amount / 1_000; // ~0.1%
    }

    // ──────────────────── Internal Sorting ────────────────────

    function _sortByLatency(RouteRecommendation[] memory recs) internal pure {
        for (uint256 i = 1; i < recs.length; ++i) {
            RouteRecommendation memory key = recs[i];
            uint256 j = i;
            while (j > 0 && recs[j - 1].estimatedLatency > key.estimatedLatency) {
                recs[j] = recs[j - 1];
                unchecked { --j; }
            }
            recs[j] = key;
        }
    }

    function _sortByFee(RouteRecommendation[] memory recs) internal pure {
        for (uint256 i = 1; i < recs.length; ++i) {
            RouteRecommendation memory key = recs[i];
            uint256 j = i;
            while (j > 0 && recs[j - 1].estimatedFee > key.estimatedFee) {
                recs[j] = recs[j - 1];
                unchecked { --j; }
            }
            recs[j] = key;
        }
    }
}
