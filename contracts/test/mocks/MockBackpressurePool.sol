// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IBackpressurePool } from "../../src/interfaces/IBackpressurePool.sol";

/// @dev Mock BackpressurePool for testing NestedPool.
contract MockBackpressurePool is IBackpressurePool {
    mapping(bytes32 => address) public pools;
    mapping(bytes32 => uint256) public rebalanceCount;

    function setPool(bytes32 taskTypeId, address pool) external {
        pools[taskTypeId] = pool;
    }

    function createPool(bytes32 taskTypeId) external {
        pools[taskTypeId] = address(uint160(uint256(taskTypeId)));
        emit PoolCreated(taskTypeId, pools[taskTypeId]);
    }

    function rebalance(bytes32 taskTypeId) external {
        rebalanceCount[taskTypeId]++;
        emit Rebalanced(taskTypeId, 0, 0);
    }

    function rebalanceWithShares(bytes32 taskTypeId, address[] calldata, uint256[] calldata) external {
        rebalanceCount[taskTypeId]++;
        emit Rebalanced(taskTypeId, 0, 0);
    }

    function needsRebalance(bytes32) external pure returns (bool) {
        return true;
    }

    function getPool(bytes32 taskTypeId) external view returns (address) {
        return pools[taskTypeId];
    }

    function getMemberUnits(bytes32, address) external pure returns (uint128) {
        return 0;
    }

    function getVerificationBudget(bytes32) external pure returns (uint256) {
        return 0;
    }
}
