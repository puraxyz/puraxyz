// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IRelayPaymentPool } from "../interfaces/IRelayPaymentPool.sol";
import { IRelayCapacityRegistry } from "../interfaces/IRelayCapacityRegistry.sol";
import { IBackpressurePool } from "../interfaces/IBackpressurePool.sol";
import { ICapacitySignal } from "../interfaces/ICapacitySignal.sol";

/// @title RelayPaymentPool
/// @notice Payment pool system for Nostr relays with three pool types:
///         WRITE (accepting events / anti-spam), READ (serving queries), STORE (retention).
///         Each pool type maps to a separate task type in the core CapacityRegistry,
///         with its own BackpressurePool for payment distribution.
contract RelayPaymentPool is IRelayPaymentPool, Ownable {
    // ──────────────────── Constants ────────────────────

    bytes32 public constant RELAY_WRITE = keccak256("RELAY_WRITE");
    bytes32 public constant RELAY_READ = keccak256("RELAY_READ");
    bytes32 public constant RELAY_STORE = keccak256("RELAY_STORE");

    // ──────────────────── Storage ────────────────────

    IBackpressurePool public immutable backpressurePool;
    ICapacitySignal public immutable capacityRegistry;
    IRelayCapacityRegistry public immutable relayRegistry;

    struct PoolTypeState {
        bytes32 taskTypeId;     // Core registry task type ID
        bool initialized;
        uint256 minPaymentPerEvent; // Anti-spam minimum payment
    }

    mapping(bytes32 poolType => PoolTypeState) internal _poolTypes;
    mapping(bytes32 poolType => mapping(bytes32 nostrPubkey => bool)) internal _memberships;

    // ──────────────────── Errors ────────────────────

    error PoolsAlreadyInitialized();
    error PoolNotInitialized();
    error InvalidPoolType();
    error RelayAlreadyInPool();
    error RelayNotInPool();
    error NotRelayOperator();

    // ──────────────────── Constructor ────────────────────

    constructor(
        address backpressurePool_,
        address capacityRegistry_,
        address relayRegistry_,
        address owner_
    ) Ownable(owner_) {
        backpressurePool = IBackpressurePool(backpressurePool_);
        capacityRegistry = ICapacitySignal(capacityRegistry_);
        relayRegistry = IRelayCapacityRegistry(relayRegistry_);
    }

    // ──────────────────── Pool Initialization ────────────────────

    /// @inheritdoc IRelayPaymentPool
    function initializePools() external onlyOwner {
        if (_poolTypes[RELAY_WRITE].initialized) revert PoolsAlreadyInitialized();

        // Create task type IDs by hashing pool type with a domain separator
        bytes32 writeTaskType = keccak256(abi.encode("backproto.relay", RELAY_WRITE));
        bytes32 readTaskType = keccak256(abi.encode("backproto.relay", RELAY_READ));
        bytes32 storeTaskType = keccak256(abi.encode("backproto.relay", RELAY_STORE));

        // Register task types in core registry (minStake = 0, relay registry handles stake)
        capacityRegistry.registerTaskType(writeTaskType, 0);
        capacityRegistry.registerTaskType(readTaskType, 0);
        capacityRegistry.registerTaskType(storeTaskType, 0);

        // Create BackpressurePools for each
        backpressurePool.createPool(writeTaskType);
        backpressurePool.createPool(readTaskType);
        backpressurePool.createPool(storeTaskType);

        _poolTypes[RELAY_WRITE] = PoolTypeState({
            taskTypeId: writeTaskType,
            initialized: true,
            minPaymentPerEvent: 0
        });
        _poolTypes[RELAY_READ] = PoolTypeState({
            taskTypeId: readTaskType,
            initialized: true,
            minPaymentPerEvent: 0
        });
        _poolTypes[RELAY_STORE] = PoolTypeState({
            taskTypeId: storeTaskType,
            initialized: true,
            minPaymentPerEvent: 0
        });

        emit RelayPoolCreated(RELAY_WRITE, writeTaskType, backpressurePool.getPool(writeTaskType));
        emit RelayPoolCreated(RELAY_READ, readTaskType, backpressurePool.getPool(readTaskType));
        emit RelayPoolCreated(RELAY_STORE, storeTaskType, backpressurePool.getPool(storeTaskType));
    }

    // ──────────────────── Pool Membership ────────────────────

    /// @inheritdoc IRelayPaymentPool
    function joinPool(bytes32 poolType, bytes32 nostrPubkey) external {
        _validatePoolType(poolType);
        if (_memberships[poolType][nostrPubkey]) revert RelayAlreadyInPool();

        // Verify caller is the relay operator
        address operator = relayRegistry.getOperator(nostrPubkey);
        if (operator != msg.sender) revert NotRelayOperator();

        _memberships[poolType][nostrPubkey] = true;

        // Register the operator as a sink in the core registry for this task type
        uint256 capacity = relayRegistry.getCompositeCapacity(nostrPubkey);
        capacityRegistry.registerSink(_poolTypes[poolType].taskTypeId, capacity);

        emit RelayJoinedPool(poolType, nostrPubkey, msg.sender);
    }

    /// @inheritdoc IRelayPaymentPool
    function leavePool(bytes32 poolType, bytes32 nostrPubkey) external {
        _validatePoolType(poolType);
        if (!_memberships[poolType][nostrPubkey]) revert RelayNotInPool();

        address operator = relayRegistry.getOperator(nostrPubkey);
        if (operator != msg.sender) revert NotRelayOperator();

        _memberships[poolType][nostrPubkey] = false;

        // Deregister from core registry
        capacityRegistry.deregisterSink(_poolTypes[poolType].taskTypeId);

        emit RelayLeftPool(poolType, nostrPubkey, msg.sender);
    }

    // ──────────────────── Anti-Spam ────────────────────

    /// @inheritdoc IRelayPaymentPool
    function setMinPaymentPerEvent(bytes32 poolType, uint256 minPaymentPerEvent) external onlyOwner {
        _validatePoolType(poolType);
        _poolTypes[poolType].minPaymentPerEvent = minPaymentPerEvent;
        emit AntiSpamConfigUpdated(poolType, minPaymentPerEvent);
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IRelayPaymentPool
    function getTaskTypeId(bytes32 poolType) external view returns (bytes32) {
        return _poolTypes[poolType].taskTypeId;
    }

    /// @inheritdoc IRelayPaymentPool
    function getPoolAddress(bytes32 poolType) external view returns (address) {
        return backpressurePool.getPool(_poolTypes[poolType].taskTypeId);
    }

    /// @inheritdoc IRelayPaymentPool
    function getMinPaymentPerEvent(bytes32 poolType) external view returns (uint256) {
        return _poolTypes[poolType].minPaymentPerEvent;
    }

    /// @inheritdoc IRelayPaymentPool
    function isRelayInPool(bytes32 poolType, bytes32 nostrPubkey) external view returns (bool) {
        return _memberships[poolType][nostrPubkey];
    }

    // ──────────────────── Internal ────────────────────

    function _validatePoolType(bytes32 poolType) internal view {
        if (!_poolTypes[poolType].initialized) revert PoolNotInitialized();
    }
}
