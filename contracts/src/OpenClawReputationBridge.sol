// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IReputationLedger } from "./interfaces/IReputationLedger.sol";

/// @title OpenClawReputationBridge
/// @notice Connects OpenClaw skill ratings (from ClawHub) to the BPE ReputationLedger's
///         cross-domain scoring system. Authorized reporters (e.g., the OpenClawCompletionVerifier
///         or an off-chain service bridging ClawHub ratings) can submit positive/negative
///         reputation events that feed into the aggregate cross-domain score.
///
///         This enables:
///         - Skill creators with good track records to earn stake discounts (up to 50%)
///         - Bad actors to be penalized across domains (3x negative weight)
///         - BPE reputation scores to be queried by ClawHub for skill ranking
contract OpenClawReputationBridge {
    // ──────────────────── Constants ────────────────────

    bytes32 public constant OPENCLAW_DOMAIN = keccak256("OPENCLAW_AGENT");

    /// @notice Points awarded per successful skill execution.
    uint256 public constant COMPLETION_POINTS = 10;

    /// @notice Points deducted per failed/slashed skill execution.
    /// @dev The ReputationLedger applies a 3x multiplier on top of this.
    uint256 public constant FAILURE_POINTS = 10;

    // ──────────────────── Storage ────────────────────

    IReputationLedger public immutable reputationLedger;

    /// @notice Addresses authorized to submit reputation events.
    mapping(address => bool) public authorizedReporters;

    /// @notice Contract owner for managing reporters.
    address public owner;

    // ──────────────────── Events ────────────────────

    event ReporterAuthorized(address indexed reporter);
    event ReporterRevoked(address indexed reporter);
    event SkillCompletionReported(address indexed operator, bytes32 indexed skillTypeId, bool success);

    // ──────────────────── Errors ────────────────────

    error NotAuthorized();
    error NotOwner();

    // ──────────────────── Modifiers ────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyReporter() {
        if (!authorizedReporters[msg.sender]) revert NotAuthorized();
        _;
    }

    // ──────────────────── Constructor ────────────────────

    constructor(address reputationLedger_, address owner_) {
        reputationLedger = IReputationLedger(reputationLedger_);
        owner = owner_;
    }

    // ──────────────────── Reporter Management ────────────────────

    /// @notice Authorize an address to submit reputation events.
    ///         Typically the OpenClawCompletionVerifier or an off-chain bridge.
    function authorizeReporter(address reporter) external onlyOwner {
        authorizedReporters[reporter] = true;
        emit ReporterAuthorized(reporter);
    }

    /// @notice Revoke a reporter's authorization.
    function revokeReporter(address reporter) external onlyOwner {
        authorizedReporters[reporter] = false;
        emit ReporterRevoked(reporter);
    }

    // ──────────────────── Reputation Reporting ────────────────────

    /// @notice Report a successful skill execution. Awards reputation points.
    /// @param operator The agent operator's Ethereum address.
    /// @param skillTypeId The skill type that was executed (for event logging).
    function reportCompletion(address operator, bytes32 skillTypeId) external onlyReporter {
        reputationLedger.recordPositive(operator, OPENCLAW_DOMAIN, COMPLETION_POINTS);
        emit SkillCompletionReported(operator, skillTypeId, true);
    }

    /// @notice Report a failed skill execution. Deducts reputation points.
    ///         The ReputationLedger applies a 3x multiplier, so 10 failure points
    ///         = 30 points deducted from the score.
    /// @param operator The agent operator's Ethereum address.
    /// @param skillTypeId The skill type that failed.
    function reportFailure(address operator, bytes32 skillTypeId) external onlyReporter {
        reputationLedger.recordNegative(operator, OPENCLAW_DOMAIN, FAILURE_POINTS);
        emit SkillCompletionReported(operator, skillTypeId, false);
    }

    /// @notice Report a batch of completions (gas-efficient for bulk settlement).
    /// @param operators Array of operator addresses.
    /// @param skillTypeIds Array of skill type IDs (parallel with operators).
    /// @param successes Array of success flags (parallel with operators).
    function reportBatch(
        address[] calldata operators,
        bytes32[] calldata skillTypeIds,
        bool[] calldata successes
    ) external onlyReporter {
        uint256 len = operators.length;
        for (uint256 i; i < len; ++i) {
            if (successes[i]) {
                reputationLedger.recordPositive(operators[i], OPENCLAW_DOMAIN, COMPLETION_POINTS);
            } else {
                reputationLedger.recordNegative(operators[i], OPENCLAW_DOMAIN, FAILURE_POINTS);
            }
            emit SkillCompletionReported(operators[i], skillTypeIds[i], successes[i]);
        }
    }

    // ──────────────────── Reads (Delegated to ReputationLedger) ────────────────────

    /// @notice Get an operator's OpenClaw-specific reputation.
    function getOpenClawReputation(address operator)
        external
        view
        returns (IReputationLedger.DomainReputation memory)
    {
        return reputationLedger.getDomainReputation(operator, OPENCLAW_DOMAIN);
    }

    /// @notice Get an operator's aggregate cross-domain reputation.
    function getAggregateReputation(address operator) external view returns (uint256) {
        return reputationLedger.getAggregateReputation(operator);
    }

    /// @notice Get the stake discount an operator qualifies for in the OpenClaw domain.
    ///         Based on their reputation in OTHER domains (cross-domain benefit).
    function getStakeDiscount(address operator) external view returns (uint256 discountBps) {
        return reputationLedger.getStakeDiscount(operator, OPENCLAW_DOMAIN);
    }
}
