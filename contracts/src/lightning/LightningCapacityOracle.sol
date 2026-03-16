// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ILightningCapacityOracle } from "../interfaces/ILightningCapacityOracle.sol";
import { ICapacitySignal } from "../interfaces/ICapacitySignal.sol";
import { IStakeManager } from "../interfaces/IStakeManager.sol";

/// @title LightningCapacityOracle
/// @notice On-chain oracle for Lightning Network node capacity. Nodes sign attestations
///         of their aggregate outbound liquidity off-chain, submitted in batches.
///         Privacy-preserving: only aggregate capacity reported, not per-channel balances.
///         EWMA-smoothed to prevent gaming.
contract LightningCapacityOracle is ILightningCapacityOracle, Ownable, EIP712 {
    using ECDSA for bytes32;

    // ──────────────────── Constants ────────────────────

    bytes32 public constant LIGHTNING_ATTESTATION_TYPEHASH = keccak256(
        "LightningAttestation(bytes32 nodePubkey,address operator,uint256 outboundCapacitySats,uint256 channelCount,uint256 pendingHTLCs,uint256 timestamp,uint256 nonce)"
    );

    uint256 public constant MAX_ATTESTATION_AGE = 600; // 10 minutes
    uint256 public constant EWMA_ALPHA_BPS = 3000;     // 0.3
    uint256 public constant BPS = 10_000;

    // ──────────────────── Storage ────────────────────

    ICapacitySignal public immutable coreRegistry;
    IStakeManager public immutable stakeManager;
    bytes32 public immutable LIGHTNING_TASK_TYPE_ID;

    bytes32[] internal _nodePubkeys;

    struct NodeData {
        address operator;
        uint256 outboundCapacitySats;
        uint256 channelCount;
        uint256 pendingHTLCs;
        uint256 smoothedCapacity;
        uint256 lastNonce;
        uint256 lastTimestamp;
        bool registered;
        uint256 pubkeyIndex;
    }

    mapping(bytes32 nodePubkey => NodeData) internal _nodes;

    // ──────────────────── Errors ────────────────────

    error NodeAlreadyRegistered();
    error NodeNotRegistered();
    error NotOperator();
    error InsufficientStake(uint256 required, uint256 available);

    // ──────────────────── Constructor ────────────────────

    constructor(
        address coreRegistry_,
        address stakeManager_,
        bytes32 lightningTaskTypeId_,
        address owner_
    ) Ownable(owner_) EIP712("Backproto-LightningOracle", "1") {
        coreRegistry = ICapacitySignal(coreRegistry_);
        stakeManager = IStakeManager(stakeManager_);
        LIGHTNING_TASK_TYPE_ID = lightningTaskTypeId_;
    }

    // ──────────────────── Registration ────────────────────

    /// @inheritdoc ILightningCapacityOracle
    function registerNode(bytes32 nodePubkey, uint256 initialCapacitySats) external {
        if (_nodes[nodePubkey].registered) revert NodeAlreadyRegistered();

        uint256 sinkStake = stakeManager.getStake(msg.sender);
        uint256 minStake = stakeManager.minSinkStake();
        if (sinkStake < minStake) revert InsufficientStake(minStake, sinkStake);

        uint256 cap = stakeManager.getCapacityCap(msg.sender);
        uint256 capped = initialCapacitySats > cap ? cap : initialCapacitySats;

        _nodes[nodePubkey] = NodeData({
            operator: msg.sender,
            outboundCapacitySats: capped,
            channelCount: 0,
            pendingHTLCs: 0,
            smoothedCapacity: capped,
            lastNonce: 0,
            lastTimestamp: 0,
            registered: true,
            pubkeyIndex: _nodePubkeys.length
        });
        _nodePubkeys.push(nodePubkey);

        emit LightningNodeRegistered(nodePubkey, msg.sender, capped);
    }

    /// @inheritdoc ILightningCapacityOracle
    function deregisterNode(bytes32 nodePubkey) external {
        NodeData storage node = _nodes[nodePubkey];
        if (!node.registered) revert NodeNotRegistered();
        if (node.operator != msg.sender) revert NotOperator();

        // Swap-and-pop
        uint256 idx = node.pubkeyIndex;
        uint256 lastIdx = _nodePubkeys.length - 1;
        if (idx != lastIdx) {
            bytes32 lastPubkey = _nodePubkeys[lastIdx];
            _nodePubkeys[idx] = lastPubkey;
            _nodes[lastPubkey].pubkeyIndex = idx;
        }
        _nodePubkeys.pop();

        address operator = node.operator;
        delete _nodes[nodePubkey];

        emit LightningNodeDeregistered(nodePubkey, operator);
    }

    // ──────────────────── Batch Updates ────────────────────

    /// @inheritdoc ILightningCapacityOracle
    function submitBatch(LightningAttestation[] calldata attestations) external {
        for (uint256 i; i < attestations.length; ++i) {
            LightningAttestation calldata att = attestations[i];

            NodeData storage node = _nodes[att.nodePubkey];
            if (!node.registered) continue;

            // Check freshness
            if (block.timestamp > att.timestamp + MAX_ATTESTATION_AGE) continue;

            // Check nonce
            if (att.nonce <= node.lastNonce) continue;

            // Verify EIP-712 signature
            bytes32 structHash = keccak256(abi.encode(
                LIGHTNING_ATTESTATION_TYPEHASH,
                att.nodePubkey,
                att.operator,
                att.outboundCapacitySats,
                att.channelCount,
                att.pendingHTLCs,
                att.timestamp,
                att.nonce
            ));
            bytes32 digest = _hashTypedDataV4(structHash);
            address recovered = digest.recover(att.signature);

            if (recovered != node.operator) continue;

            // Cap by stake
            uint256 cap = stakeManager.getCapacityCap(node.operator);
            uint256 capped = att.outboundCapacitySats > cap ? cap : att.outboundCapacitySats;

            // EWMA smoothing
            uint256 oldSmoothed = node.smoothedCapacity;
            uint256 newSmoothed = (EWMA_ALPHA_BPS * capped + (BPS - EWMA_ALPHA_BPS) * oldSmoothed) / BPS;

            node.outboundCapacitySats = capped;
            node.channelCount = att.channelCount;
            node.pendingHTLCs = att.pendingHTLCs;
            node.smoothedCapacity = newSmoothed;
            node.lastNonce = att.nonce;
            node.lastTimestamp = att.timestamp;

            emit LightningCapacityUpdated(
                att.nodePubkey,
                capped,
                att.channelCount,
                att.pendingHTLCs,
                newSmoothed
            );
        }
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc ILightningCapacityOracle
    function getSmoothedCapacity(bytes32 nodePubkey) external view returns (uint256) {
        return _nodes[nodePubkey].smoothedCapacity;
    }

    /// @inheritdoc ILightningCapacityOracle
    function getPendingHTLCs(bytes32 nodePubkey) external view returns (uint256) {
        return _nodes[nodePubkey].pendingHTLCs;
    }

    /// @inheritdoc ILightningCapacityOracle
    function getOperator(bytes32 nodePubkey) external view returns (address) {
        return _nodes[nodePubkey].operator;
    }

    /// @inheritdoc ILightningCapacityOracle
    function getAllNodes() external view returns (bytes32[] memory pubkeys, uint256[] memory capacities) {
        uint256 len = _nodePubkeys.length;
        pubkeys = new bytes32[](len);
        capacities = new uint256[](len);
        for (uint256 i; i < len; ++i) {
            pubkeys[i] = _nodePubkeys[i];
            capacities[i] = _nodes[_nodePubkeys[i]].smoothedCapacity;
        }
    }

    /// @inheritdoc ILightningCapacityOracle
    function lightningTaskTypeId() external view returns (bytes32) {
        return LIGHTNING_TASK_TYPE_ID;
    }
}
