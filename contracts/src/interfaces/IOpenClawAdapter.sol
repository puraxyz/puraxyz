// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IOpenClawAdapter
/// @notice Interface for the OpenClaw ↔ BPE capacity adapter. Maps OpenClaw skill types
///         to BPE task types and normalizes skill execution metrics into BPE capacity signals.
interface IOpenClawAdapter {
    // ──────────────────── Structs ────────────────────

    /// @notice Skill capacity dimensions reported by an OpenClaw agent.
    struct SkillCapacity {
        uint256 throughput;     // Skill executions per epoch
        uint256 latencyMs;      // Average response latency in milliseconds
        uint256 errorRateBps;   // Error rate in basis points (0 = perfect, 10000 = 100% errors)
    }

    /// @notice Registered agent metadata.
    struct AgentInfo {
        address operator;       // Ethereum address of the agent operator
        bytes32 skillTypeId;    // BPE task type this agent serves
        uint256 smoothedCapacity; // EWMA-smoothed normalized capacity
        uint256 lastUpdated;    // Timestamp of last capacity update
        bool active;            // Whether agent is currently active
    }

    // ──────────────────── Events ────────────────────

    event SkillTypeRegistered(bytes32 indexed skillTypeId, string skillName);
    event AgentRegistered(bytes32 indexed agentId, address indexed operator, bytes32 indexed skillTypeId);
    event AgentDeregistered(bytes32 indexed agentId);
    event CapacityUpdated(bytes32 indexed agentId, uint256 rawCapacity, uint256 smoothedCapacity);

    // ──────────────────── Skill Types ────────────────────

    /// @notice Register a new OpenClaw skill type, creating a corresponding BPE task type.
    /// @param skillTypeId Identifier for the skill (e.g., keccak256("email-management")).
    /// @param skillName Human-readable skill name.
    /// @param minStake Minimum stake required to serve this skill type.
    function registerSkillType(bytes32 skillTypeId, string calldata skillName, uint256 minStake) external;

    // ──────────────────── Agent Management ────────────────────

    /// @notice Register an OpenClaw agent instance as a BPE sink for a skill type.
    /// @param agentId Unique agent identifier (e.g., keccak256 of agent's public key).
    /// @param skillTypeId The skill type this agent can serve.
    /// @param initialCapacity Initial capacity declaration.
    function registerAgent(bytes32 agentId, bytes32 skillTypeId, SkillCapacity calldata initialCapacity) external;

    /// @notice Deregister an agent, removing it from BPE routing.
    /// @param agentId The agent to deregister.
    function deregisterAgent(bytes32 agentId) external;

    // ──────────────────── Capacity Updates ────────────────────

    /// @notice Submit a capacity update for an agent. Smoothed with EWMA.
    /// @param agentId The agent reporting capacity.
    /// @param capacity Current skill capacity dimensions.
    function updateCapacity(bytes32 agentId, SkillCapacity calldata capacity) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get agent metadata.
    function getAgent(bytes32 agentId) external view returns (AgentInfo memory);

    /// @notice Get the smoothed normalized capacity for an agent.
    function getSmoothedCapacity(bytes32 agentId) external view returns (uint256);

    /// @notice Get all active agent IDs for a skill type.
    function getAgentsForSkill(bytes32 skillTypeId) external view returns (bytes32[] memory);
}
