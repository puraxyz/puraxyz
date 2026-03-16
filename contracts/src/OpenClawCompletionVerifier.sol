// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ICompletionTracker } from "./interfaces/ICompletionTracker.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title OpenClawCompletionVerifier
/// @notice Thin wrapper that bridges OpenClaw skill execution receipts to the core
///         CompletionTracker's dual-signature verification. OpenClaw agents and skill
///         requesters co-sign a SkillExecution receipt; this contract verifies the
///         signatures and forwards a recordCompletion() call to CompletionTracker.
///
///         Settlement finality: ~15 minutes (3 epochs x 5 min). This is a documented
///         tradeoff -- the statistical verification model catches sustained fraud,
///         not individual bad completions.
contract OpenClawCompletionVerifier is EIP712 {
    using ECDSA for bytes32;

    // ──────────────────── Constants ────────────────────

    bytes32 public constant SKILL_EXECUTION_TYPEHASH = keccak256(
        "SkillExecution(bytes32 agentId,bytes32 skillTypeId,bytes32 executionId,address requester,uint256 timestamp)"
    );

    // ──────────────────── Storage ────────────────────

    ICompletionTracker public immutable completionTracker;

    /// @notice Replay prevention for execution IDs.
    mapping(bytes32 executionId => bool) public executionRecorded;

    // ──────────────────── Events ────────────────────

    event SkillExecutionVerified(
        bytes32 indexed agentId,
        bytes32 indexed skillTypeId,
        bytes32 indexed executionId,
        address requester
    );

    // ──────────────────── Errors ────────────────────

    error ExecutionAlreadyRecorded();
    error InvalidAgentSignature();
    error InvalidRequesterSignature();

    // ──────────────────── Constructor ────────────────────

    constructor(
        address completionTracker_
    ) EIP712("Backproto-OpenClawVerifier", "1") {
        completionTracker = ICompletionTracker(completionTracker_);
    }

    // ──────────────────── Verification ────────────────────

    /// @notice Verify and record a skill execution with dual signatures.
    ///         The agent (sink) and requester (source) both sign the same SkillExecution
    ///         struct. This contract verifies both, then forwards to CompletionTracker.
    /// @param agentId The OpenClaw agent that executed the skill.
    /// @param skillTypeId The skill type (maps to BPE task type).
    /// @param executionId Unique execution identifier from OpenClaw BuildLog.
    /// @param agentOperator The agent operator's Ethereum address (sink).
    /// @param agentSig Agent's EIP-712 signature over the SkillExecution.
    /// @param requesterSig Requester's EIP-712 signature over the SkillExecution.
    function verifyExecution(
        bytes32 agentId,
        bytes32 skillTypeId,
        bytes32 executionId,
        address agentOperator,
        bytes calldata agentSig,
        bytes calldata requesterSig
    ) external {
        if (executionRecorded[executionId]) revert ExecutionAlreadyRecorded();

        // Build the EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                SKILL_EXECUTION_TYPEHASH,
                agentId,
                skillTypeId,
                executionId,
                msg.sender, // requester submits the tx
                block.timestamp
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        // Verify agent (sink) signature
        address recoveredAgent = digest.recover(agentSig);
        if (recoveredAgent != agentOperator) revert InvalidAgentSignature();

        // Verify requester (source) signature
        address recoveredRequester = digest.recover(requesterSig);
        if (recoveredRequester != msg.sender) revert InvalidRequesterSignature();

        // Mark as recorded
        executionRecorded[executionId] = true;

        // Forward to core CompletionTracker
        // skillTypeId maps directly to BPE taskTypeId
        completionTracker.recordCompletion(
            skillTypeId,
            agentOperator,
            executionId,
            agentSig,
            requesterSig
        );

        emit SkillExecutionVerified(agentId, skillTypeId, executionId, msg.sender);
    }

    // ──────────────────── Reads ────────────────────

    /// @notice Check if an execution has already been recorded.
    function isExecutionRecorded(bytes32 executionId) external view returns (bool) {
        return executionRecorded[executionId];
    }

    /// @notice Get the current completion rate for an agent in a skill type.
    ///         Delegates to the core CompletionTracker.
    function getCompletionRate(bytes32 skillTypeId, address agentOperator)
        external
        view
        returns (uint256)
    {
        return completionTracker.getCompletionRate(skillTypeId, agentOperator);
    }

    /// @notice Get the number of completions for an agent in the current epoch.
    function getCompletions(bytes32 skillTypeId, address agentOperator)
        external
        view
        returns (uint256)
    {
        return completionTracker.getCompletions(skillTypeId, agentOperator);
    }
}
