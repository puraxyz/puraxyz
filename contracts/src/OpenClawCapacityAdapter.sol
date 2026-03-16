// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IOpenClawAdapter } from "./interfaces/IOpenClawAdapter.sol";
import { ICapacityAdapter } from "./interfaces/ICapacityAdapter.sol";
import { IStakeManager } from "./interfaces/IStakeManager.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title OpenClawCapacityAdapter
/// @notice Bridges OpenClaw skill execution metrics to BPE capacity signals.
///         Implements ICapacityAdapter for registration with UniversalCapacityAdapter, and
///         IOpenClawAdapter for the OpenClaw-specific agent/skill management interface.
///         Normalizes multi-dimensional skill capacity (throughput, latency, error rate) into
///         a single BPE-compatible capacity value, smoothed with EWMA.
contract OpenClawCapacityAdapter is IOpenClawAdapter, ICapacityAdapter, Ownable, EIP712 {
    using ECDSA for bytes32;

    // ──────────────────── Constants ────────────────────

    uint256 public constant BPS = 10_000;
    uint256 public constant EWMA_ALPHA_BPS = 3000;  // alpha=0.3, same as core BPE

    /// @notice Capacity weighting: throughput 50%, latency 30%, error rate 20%
    /// @dev Mirrors RelayCapacityRegistry multi-dimensional approach
    uint256 public constant THROUGHPUT_WEIGHT = 5000;
    uint256 public constant LATENCY_WEIGHT = 3000;
    uint256 public constant ERROR_RATE_WEIGHT = 2000;

    /// @notice Max latency (ms) for normalization. Latency above this = 0 capacity contribution.
    uint256 public constant MAX_LATENCY_MS = 30_000; // 30 seconds

    bytes32 public constant DOMAIN_ID = keccak256("OPENCLAW_AGENT");

    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "SkillAttestation(bytes32 agentId,uint256 throughput,uint256 latencyMs,uint256 errorRateBps,uint256 timestamp)"
    );

    // ──────────────────── Storage ────────────────────

    IStakeManager public immutable stakeManager;

    /// @notice Registered skill types (skillTypeId => exists)
    mapping(bytes32 => bool) public skillTypes;
    mapping(bytes32 => string) public skillNames;

    /// @notice Agent registry
    mapping(bytes32 agentId => AgentInfo) internal _agents;

    /// @notice Skill type => list of agent IDs
    mapping(bytes32 skillTypeId => bytes32[]) internal _skillAgents;
    /// @notice Agent index in _skillAgents for swap-and-pop removal
    mapping(bytes32 agentId => uint256) internal _agentIndex;

    // ──────────────────── Errors ────────────────────

    error SkillTypeAlreadyExists();
    error SkillTypeDoesNotExist();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error NotAgentOperator();
    error InsufficientStake();

    // ──────────────────── Constructor ────────────────────

    constructor(
        address stakeManager_,
        address owner_
    ) Ownable(owner_) EIP712("Backproto-OpenClawAdapter", "1") {
        stakeManager = IStakeManager(stakeManager_);
    }

    // ──────────────────── ICapacityAdapter ────────────────────

    /// @inheritdoc ICapacityAdapter
    function domainId() external pure override returns (bytes32) {
        return DOMAIN_ID;
    }

    /// @inheritdoc ICapacityAdapter
    function domainDescription() external pure override returns (string memory) {
        return "OpenClaw AI Agent Skills: throughput (50%), latency (30%), error rate (20%)";
    }

    /// @inheritdoc ICapacityAdapter
    function normalizeCapacity(bytes calldata rawSignal)
        external
        pure
        override
        returns (uint256 normalizedCapacity)
    {
        SkillCapacity memory cap = abi.decode(rawSignal, (SkillCapacity));
        return _normalize(cap);
    }

    /// @inheritdoc ICapacityAdapter
    function verifyAttestation(bytes calldata attestation)
        external
        view
        override
        returns (bool valid, address sink, uint256 capacity)
    {
        (
            bytes32 agentId,
            uint256 throughput,
            uint256 latencyMs,
            uint256 errorRateBps,
            uint256 timestamp,
            bytes memory signature
        ) = abi.decode(attestation, (bytes32, uint256, uint256, uint256, uint256, bytes));

        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(ATTESTATION_TYPEHASH, agentId, throughput, latencyMs, errorRateBps, timestamp)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        AgentInfo storage agent = _agents[agentId];
        if (!agent.active || signer != agent.operator) {
            return (false, address(0), 0);
        }

        SkillCapacity memory cap = SkillCapacity(throughput, latencyMs, errorRateBps);
        return (true, agent.operator, _normalize(cap));
    }

    // ──────────────────── IOpenClawAdapter: Skill Types ────────────────────

    /// @inheritdoc IOpenClawAdapter
    function registerSkillType(
        bytes32 skillTypeId,
        string calldata skillName,
        uint256
    ) external onlyOwner {
        if (skillTypes[skillTypeId]) revert SkillTypeAlreadyExists();
        skillTypes[skillTypeId] = true;
        skillNames[skillTypeId] = skillName;
        emit SkillTypeRegistered(skillTypeId, skillName);
    }

    // ──────────────────── IOpenClawAdapter: Agent Management ────────────────────

    /// @inheritdoc IOpenClawAdapter
    function registerAgent(
        bytes32 agentId,
        bytes32 skillTypeId,
        SkillCapacity calldata initialCapacity
    ) external {
        if (!skillTypes[skillTypeId]) revert SkillTypeDoesNotExist();
        if (_agents[agentId].active) revert AgentAlreadyRegistered();

        // Verify operator has sufficient stake
        uint256 sinkStake = stakeManager.getStake(msg.sender);
        if (sinkStake < stakeManager.minSinkStake()) revert InsufficientStake();

        uint256 normalized = _normalize(initialCapacity);
        uint256 cap = stakeManager.getCapacityCap(msg.sender);
        if (normalized > cap) normalized = cap;

        _agents[agentId] = AgentInfo({
            operator: msg.sender,
            skillTypeId: skillTypeId,
            smoothedCapacity: normalized,
            lastUpdated: block.timestamp,
            active: true
        });

        _agentIndex[agentId] = _skillAgents[skillTypeId].length;
        _skillAgents[skillTypeId].push(agentId);

        emit AgentRegistered(agentId, msg.sender, skillTypeId);
        emit CapacityUpdated(agentId, normalized, normalized);
    }

    /// @inheritdoc IOpenClawAdapter
    function deregisterAgent(bytes32 agentId) external {
        AgentInfo storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotRegistered();
        if (agent.operator != msg.sender) revert NotAgentOperator();

        agent.active = false;

        // Swap-and-pop from skill agents array
        bytes32 skillTypeId = agent.skillTypeId;
        bytes32[] storage agents = _skillAgents[skillTypeId];
        uint256 idx = _agentIndex[agentId];
        uint256 lastIdx = agents.length - 1;

        if (idx != lastIdx) {
            bytes32 lastAgentId = agents[lastIdx];
            agents[idx] = lastAgentId;
            _agentIndex[lastAgentId] = idx;
        }
        agents.pop();
        delete _agentIndex[agentId];

        emit AgentDeregistered(agentId);
    }

    // ──────────────────── IOpenClawAdapter: Capacity Updates ────────────────────

    /// @inheritdoc IOpenClawAdapter
    function updateCapacity(bytes32 agentId, SkillCapacity calldata capacity) external {
        AgentInfo storage agent = _agents[agentId];
        if (!agent.active) revert AgentNotRegistered();
        if (agent.operator != msg.sender) revert NotAgentOperator();

        uint256 raw = _normalize(capacity);

        // Cap by stake
        uint256 cap = stakeManager.getCapacityCap(msg.sender);
        if (raw > cap) raw = cap;

        // EWMA smoothing: smoothed = alpha * raw + (1 - alpha) * prev
        uint256 smoothed = (EWMA_ALPHA_BPS * raw + (BPS - EWMA_ALPHA_BPS) * agent.smoothedCapacity) / BPS;

        agent.smoothedCapacity = smoothed;
        agent.lastUpdated = block.timestamp;

        emit CapacityUpdated(agentId, raw, smoothed);
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IOpenClawAdapter
    function getAgent(bytes32 agentId) external view override returns (AgentInfo memory) {
        return _agents[agentId];
    }

    /// @inheritdoc IOpenClawAdapter
    function getSmoothedCapacity(bytes32 agentId) external view override returns (uint256) {
        return _agents[agentId].smoothedCapacity;
    }

    /// @inheritdoc IOpenClawAdapter
    function getAgentsForSkill(bytes32 skillTypeId) external view override returns (bytes32[] memory) {
        return _skillAgents[skillTypeId];
    }

    // ──────────────────── Internal ────────────────────

    /// @notice Normalize multi-dimensional skill capacity into a single value.
    /// @dev throughput (50%) + inversed latency (30%) + inversed error rate (20%)
    ///      Higher throughput = more capacity. Lower latency = more capacity. Lower errors = more capacity.
    function _normalize(SkillCapacity memory cap) internal pure returns (uint256) {
        // Latency component: inverse (lower latency = higher capacity)
        uint256 latencyComponent;
        if (cap.latencyMs >= MAX_LATENCY_MS) {
            latencyComponent = 0;
        } else {
            // Scale: (MAX - actual) / MAX * weight, so 0ms = full weight, MAX_LATENCY = 0
            latencyComponent = ((MAX_LATENCY_MS - cap.latencyMs) * LATENCY_WEIGHT) / MAX_LATENCY_MS;
        }

        // Error rate component: inverse (lower error rate = higher capacity)
        uint256 errorComponent;
        if (cap.errorRateBps >= BPS) {
            errorComponent = 0;
        } else {
            errorComponent = ((BPS - cap.errorRateBps) * ERROR_RATE_WEIGHT) / BPS;
        }

        // Combined: throughput dominates magnitude, latency/error modulate
        // throughputComponent is in raw units * 5000, latency/error are in 0-3000/0-2000 range
        // To unify: treat latency+error as a quality multiplier on throughput
        uint256 qualityBps = latencyComponent + errorComponent; // max = 5000 (3000+2000)
        if (cap.throughput == 0) return 0;

        // Final: throughput * quality / BPS
        return (cap.throughput * qualityBps) / BPS;
    }
}
