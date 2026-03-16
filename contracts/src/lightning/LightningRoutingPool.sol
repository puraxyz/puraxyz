// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ILightningRoutingPool } from "../interfaces/ILightningRoutingPool.sol";
import { ILightningCapacityOracle } from "../interfaces/ILightningCapacityOracle.sol";
import { IBackpressurePool } from "../interfaces/IBackpressurePool.sol";
import { ICapacitySignal } from "../interfaces/ICapacitySignal.sol";
import { IPricingCurve } from "../interfaces/IPricingCurve.sol";

/// @title LightningRoutingPool
/// @notice BPE pool where Lightning nodes are sinks weighted by routing capacity.
///         Nodes with balanced channels earn more. Dynamic fees penalize congested routes.
///         Provides optimal route computation based on capacity + congestion signals.
contract LightningRoutingPool is ILightningRoutingPool, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_ROUTE_NODES = 10;

    // ──────────────────── Storage ────────────────────

    IBackpressurePool public immutable backpressurePool;
    ICapacitySignal public immutable capacityRegistry;
    ILightningCapacityOracle public immutable lightningOracle;
    IPricingCurve public immutable pricingCurve;

    bytes32 public immutable LIGHTNING_TASK_TYPE_ID;
    bool public poolInitialized;

    bytes32[] internal _poolNodes;
    mapping(bytes32 nodePubkey => bool) internal _inPool;
    mapping(bytes32 nodePubkey => uint256) internal _nodeIndex;

    // ──────────────────── Errors ────────────────────

    error PoolAlreadyInitialized();
    error PoolNotInitialized();
    error NodeAlreadyInPool();
    error NodeNotInPool();
    error NotNodeOperator();
    error TooManyNodes();

    // ──────────────────── Constructor ────────────────────

    constructor(
        address backpressurePool_,
        address capacityRegistry_,
        address lightningOracle_,
        address pricingCurve_,
        bytes32 lightningTaskTypeId_,
        address owner_
    ) Ownable(owner_) {
        backpressurePool = IBackpressurePool(backpressurePool_);
        capacityRegistry = ICapacitySignal(capacityRegistry_);
        lightningOracle = ILightningCapacityOracle(lightningOracle_);
        pricingCurve = IPricingCurve(pricingCurve_);
        LIGHTNING_TASK_TYPE_ID = lightningTaskTypeId_;
    }

    // ──────────────────── Pool Lifecycle ────────────────────

    /// @inheritdoc ILightningRoutingPool
    function initializePool() external onlyOwner {
        if (poolInitialized) revert PoolAlreadyInitialized();
        poolInitialized = true;
        // Pool creation is done via BackpressurePool.createPool(taskTypeId) externally
    }

    /// @inheritdoc ILightningRoutingPool
    function joinPool(bytes32 nodePubkey) external {
        if (!poolInitialized) revert PoolNotInitialized();
        if (_inPool[nodePubkey]) revert NodeAlreadyInPool();

        address operator = lightningOracle.getOperator(nodePubkey);
        if (operator != msg.sender) revert NotNodeOperator();

        _inPool[nodePubkey] = true;
        _nodeIndex[nodePubkey] = _poolNodes.length;
        _poolNodes.push(nodePubkey);

        emit NodeJoinedPool(nodePubkey, msg.sender);
    }

    /// @inheritdoc ILightningRoutingPool
    function leavePool(bytes32 nodePubkey) external {
        if (!_inPool[nodePubkey]) revert NodeNotInPool();

        address operator = lightningOracle.getOperator(nodePubkey);
        if (operator != msg.sender) revert NotNodeOperator();

        // Swap-and-pop
        uint256 idx = _nodeIndex[nodePubkey];
        uint256 lastIdx = _poolNodes.length - 1;
        if (idx != lastIdx) {
            bytes32 lastPubkey = _poolNodes[lastIdx];
            _poolNodes[idx] = lastPubkey;
            _nodeIndex[lastPubkey] = idx;
        }
        _poolNodes.pop();
        delete _inPool[nodePubkey];
        delete _nodeIndex[nodePubkey];

        emit NodeLeftPool(nodePubkey, msg.sender);
    }

    /// @inheritdoc ILightningRoutingPool
    function rebalance() external {
        if (!poolInitialized) revert PoolNotInitialized();
        backpressurePool.rebalance(LIGHTNING_TASK_TYPE_ID);

        uint256 totalCap;
        for (uint256 i; i < _poolNodes.length; ++i) {
            totalCap += lightningOracle.getSmoothedCapacity(_poolNodes[i]);
        }
        emit RoutingPoolRebalanced(_poolNodes.length, totalCap);
    }

    // ──────────────────── Routing ────────────────────

    /// @inheritdoc ILightningRoutingPool
    function getOptimalRoute(uint256 amountSats, uint256 maxNodes)
        external
        view
        returns (bytes32[] memory nodePubkeys, uint256[] memory allocations, uint256[] memory fees)
    {
        uint256 nodeCount = _poolNodes.length;
        if (maxNodes > MAX_ROUTE_NODES) maxNodes = MAX_ROUTE_NODES;
        if (maxNodes > nodeCount) maxNodes = nodeCount;

        // Compute scores: capacity / (1 + pendingHTLCs)
        // Higher capacity + fewer pending HTLCs = better score
        uint256[] memory scores = new uint256[](nodeCount);
        uint256 totalScore;
        for (uint256 i; i < nodeCount; ++i) {
            uint256 cap = lightningOracle.getSmoothedCapacity(_poolNodes[i]);
            uint256 htlcs = lightningOracle.getPendingHTLCs(_poolNodes[i]);
            // Score = capacity / (1 + htlcs) — backpressure-weighted
            scores[i] = cap * BPS / (1 + htlcs);
            totalScore += scores[i];
        }

        // Select top-N nodes by score (simple selection, not full sort)
        nodePubkeys = new bytes32[](maxNodes);
        allocations = new uint256[](maxNodes);
        fees = new uint256[](maxNodes);

        bool[] memory selected = new bool[](nodeCount);
        uint256 selectedScore;

        for (uint256 n; n < maxNodes; ++n) {
            uint256 bestIdx;
            uint256 bestScore;
            for (uint256 i; i < nodeCount; ++i) {
                if (!selected[i] && scores[i] > bestScore) {
                    bestScore = scores[i];
                    bestIdx = i;
                }
            }
            selected[bestIdx] = true;
            nodePubkeys[n] = _poolNodes[bestIdx];
            selectedScore += bestScore;
        }

        // Allocate proportionally to score among selected nodes
        if (selectedScore > 0) {
            for (uint256 n; n < maxNodes; ++n) {
                uint256 idx;
                for (uint256 i; i < nodeCount; ++i) {
                    if (_poolNodes[i] == nodePubkeys[n]) {
                        idx = i;
                        break;
                    }
                }
                allocations[n] = (scores[idx] * BPS) / selectedScore;

                // Fee estimate using pricing curve
                address operator = lightningOracle.getOperator(nodePubkeys[n]);
                fees[n] = pricingCurve.getPrice(LIGHTNING_TASK_TYPE_ID, operator);
            }
        }
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc ILightningRoutingPool
    function getPoolAddress() external view returns (address) {
        return backpressurePool.getPool(LIGHTNING_TASK_TYPE_ID);
    }

    /// @inheritdoc ILightningRoutingPool
    function isNodeInPool(bytes32 nodePubkey) external view returns (bool) {
        return _inPool[nodePubkey];
    }

    /// @inheritdoc ILightningRoutingPool
    function getRoutingFee(bytes32 nodePubkey) external view returns (uint256) {
        address operator = lightningOracle.getOperator(nodePubkey);
        return pricingCurve.getPrice(LIGHTNING_TASK_TYPE_ID, operator);
    }
}
