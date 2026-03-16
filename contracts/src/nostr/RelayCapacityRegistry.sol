// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IRelayCapacityRegistry } from "../interfaces/IRelayCapacityRegistry.sol";
import { ICapacitySignal } from "../interfaces/ICapacitySignal.sol";
import { IStakeManager } from "../interfaces/IStakeManager.sol";

/// @title RelayCapacityRegistry
/// @notice Registry for Nostr relay capacity signals. Maps Nostr pubkeys to Ethereum
///         addresses with multi-dimensional capacity (throughput + storage + bandwidth).
///         Integrates with the core CapacityRegistry by registering relays as sinks
///         under a relay-specific task type.
contract RelayCapacityRegistry is IRelayCapacityRegistry, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant BPS = 10_000;
    uint256 public constant EWMA_ALPHA_BPS = 3000; // 0.3

    // ──────────────────── Storage ────────────────────

    ICapacitySignal public immutable coreRegistry;
    IStakeManager public immutable stakeManager;

    /// @notice The task type ID used for relay routing in the core CapacityRegistry.
    bytes32 public immutable RELAY_TASK_TYPE_ID;

    /// @notice Authorized aggregator (Nostr-to-chain bridge).
    address public authorizedAggregator;

    // Capacity weights (in BPS, must sum to 10000)
    uint256 public throughputWeight = 5000; // 50%
    uint256 public storageWeight = 2500;    // 25%
    uint256 public bandwidthWeight = 2500;  // 25%

    // Relay data
    bytes32[] internal _relayPubkeys;
    mapping(bytes32 nostrPubkey => RelayData) internal _relays;

    struct RelayData {
        address operator;
        string relayUrl;
        RelayCapacity capacity;
        uint256 compositeCapacity;
        uint256 smoothedCapacity;
        bool registered;
        uint256 pubkeyIndex; // Index in _relayPubkeys array (for swap-and-pop)
    }

    // ──────────────────── Errors ────────────────────

    error RelayAlreadyRegistered();
    error RelayNotRegistered();
    error NotOperator();
    error NotAuthorizedAggregator();
    error InvalidWeights();
    error InsufficientStake(uint256 required, uint256 available);

    // ──────────────────── Constructor ────────────────────

    constructor(
        address coreRegistry_,
        address stakeManager_,
        bytes32 relayTaskTypeId_,
        address owner_
    ) Ownable(owner_) {
        coreRegistry = ICapacitySignal(coreRegistry_);
        stakeManager = IStakeManager(stakeManager_);
        RELAY_TASK_TYPE_ID = relayTaskTypeId_;
    }

    // ──────────────────── Admin ────────────────────

    function setAggregator(address aggregator) external onlyOwner {
        authorizedAggregator = aggregator;
    }

    /// @inheritdoc IRelayCapacityRegistry
    function setCapacityWeights(
        uint256 throughputWeight_,
        uint256 storageWeight_,
        uint256 bandwidthWeight_
    ) external onlyOwner {
        if (throughputWeight_ + storageWeight_ + bandwidthWeight_ != BPS) revert InvalidWeights();
        throughputWeight = throughputWeight_;
        storageWeight = storageWeight_;
        bandwidthWeight = bandwidthWeight_;
        emit CapacityWeightsUpdated(throughputWeight_, storageWeight_, bandwidthWeight_);
    }

    // ──────────────────── Registration ────────────────────

    /// @inheritdoc IRelayCapacityRegistry
    function registerRelay(
        bytes32 nostrPubkey,
        string calldata relayUrl,
        RelayCapacity calldata initialCapacity
    ) external {
        if (_relays[nostrPubkey].registered) revert RelayAlreadyRegistered();

        // Check stake
        uint256 sinkStake = stakeManager.getStake(msg.sender);
        uint256 minStake = stakeManager.minSinkStake();
        if (sinkStake < minStake) revert InsufficientStake(minStake, sinkStake);

        uint256 composite = _computeComposite(initialCapacity);

        // Cap by stake
        uint256 cap = stakeManager.getCapacityCap(msg.sender);
        if (composite > cap) composite = cap;

        _relays[nostrPubkey] = RelayData({
            operator: msg.sender,
            relayUrl: relayUrl,
            capacity: initialCapacity,
            compositeCapacity: composite,
            smoothedCapacity: composite,
            registered: true,
            pubkeyIndex: _relayPubkeys.length
        });
        _relayPubkeys.push(nostrPubkey);

        // Register in core CapacityRegistry as a sink
        // The operator must have already registered the task type
        // and the relay contract acts as bridge
        emit RelayRegistered(nostrPubkey, msg.sender, relayUrl, composite);
    }

    /// @inheritdoc IRelayCapacityRegistry
    function deregisterRelay(bytes32 nostrPubkey) external {
        RelayData storage relay = _relays[nostrPubkey];
        if (!relay.registered) revert RelayNotRegistered();
        if (relay.operator != msg.sender) revert NotOperator();

        // Swap-and-pop from pubkeys array
        uint256 idx = relay.pubkeyIndex;
        uint256 lastIdx = _relayPubkeys.length - 1;
        if (idx != lastIdx) {
            bytes32 lastPubkey = _relayPubkeys[lastIdx];
            _relayPubkeys[idx] = lastPubkey;
            _relays[lastPubkey].pubkeyIndex = idx;
        }
        _relayPubkeys.pop();

        address operator = relay.operator;
        delete _relays[nostrPubkey];

        emit RelayDeregistered(nostrPubkey, operator);
    }

    // ──────────────────── Capacity Updates ────────────────────

    /// @inheritdoc IRelayCapacityRegistry
    function updateRelayCapacity(bytes32 nostrPubkey, RelayCapacity calldata capacity) external {
        if (msg.sender != authorizedAggregator) revert NotAuthorizedAggregator();
        RelayData storage relay = _relays[nostrPubkey];
        if (!relay.registered) revert RelayNotRegistered();

        uint256 composite = _computeComposite(capacity);

        // Cap by stake
        uint256 cap = stakeManager.getCapacityCap(relay.operator);
        if (composite > cap) composite = cap;

        // EWMA smoothing
        uint256 oldSmoothed = relay.smoothedCapacity;
        uint256 newSmoothed = (EWMA_ALPHA_BPS * composite + (BPS - EWMA_ALPHA_BPS) * oldSmoothed) / BPS;

        relay.capacity = capacity;
        relay.compositeCapacity = composite;
        relay.smoothedCapacity = newSmoothed;

        emit RelayCapacityUpdated(
            nostrPubkey,
            capacity.eventsPerSecond,
            capacity.storageGB,
            capacity.bandwidthMbps,
            newSmoothed
        );
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IRelayCapacityRegistry
    function getRelay(bytes32 nostrPubkey) external view returns (RelayInfo memory) {
        RelayData storage r = _relays[nostrPubkey];
        return RelayInfo({
            nostrPubkey: nostrPubkey,
            operator: r.operator,
            relayUrl: r.relayUrl,
            capacity: r.capacity,
            compositeCapacity: r.compositeCapacity,
            registered: r.registered
        });
    }

    /// @inheritdoc IRelayCapacityRegistry
    function getOperator(bytes32 nostrPubkey) external view returns (address) {
        return _relays[nostrPubkey].operator;
    }

    /// @inheritdoc IRelayCapacityRegistry
    function getCompositeCapacity(bytes32 nostrPubkey) external view returns (uint256) {
        return _relays[nostrPubkey].smoothedCapacity;
    }

    /// @inheritdoc IRelayCapacityRegistry
    function getAllRelays() external view returns (bytes32[] memory pubkeys, uint256[] memory capacities) {
        uint256 len = _relayPubkeys.length;
        pubkeys = new bytes32[](len);
        capacities = new uint256[](len);
        for (uint256 i; i < len; ++i) {
            pubkeys[i] = _relayPubkeys[i];
            capacities[i] = _relays[_relayPubkeys[i]].smoothedCapacity;
        }
    }

    /// @inheritdoc IRelayCapacityRegistry
    function relayTaskTypeId() external view returns (bytes32) {
        return RELAY_TASK_TYPE_ID;
    }

    // ──────────────────── Internal ────────────────────

    /// @dev Compute weighted composite capacity from multi-dimensional signals.
    function _computeComposite(RelayCapacity memory cap) internal view returns (uint256) {
        return (cap.eventsPerSecond * throughputWeight
            + cap.storageGB * storageWeight
            + cap.bandwidthMbps * bandwidthWeight) / BPS;
    }
}
