// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IReputationLedger
/// @notice Cross-domain portable reputation system. Participants earn reputation across
///         domains (AI compute, Nostr relay, Lightning routing) that follows them.
///         Higher reputation → lower minimum stake requirements for new domains.
interface IReputationLedger {
    // ──────────────────── Events ────────────────────

    event ReputationUpdated(address indexed account, bytes32 indexed domain, uint256 newScore, uint256 aggregateScore);
    event DomainRegistered(bytes32 indexed domain, address indexed adapter);
    event StakeDiscountApplied(address indexed account, bytes32 indexed domain, uint256 discountBps);

    // ──────────────────── Structs ────────────────────

    struct DomainReputation {
        uint256 score; // Domain-specific reputation score (0-10000 BPS)
        uint256 stakeDuration; // Total seconds staked in this domain
        uint256 completions; // Total successful completions
        uint256 slashCount; // Number of times slashed
        uint256 lastUpdated; // Timestamp of last update
    }

    // ──────────────────── Domain Registration ────────────────────

    /// @notice Register a domain that can contribute to reputation.
    /// @param domain Domain identifier (e.g., keccak256("AI_COMPUTE")).
    /// @param adapter The domain's ICapacityAdapter address (for verification).
    function registerDomain(bytes32 domain, address adapter) external;

    // ──────────────────── Reputation Updates ────────────────────

    /// @notice Record a positive reputation event (completion, uptime milestone, etc.).
    /// @param account The participant account.
    /// @param domain The domain where the event occurred.
    /// @param points Reputation points to add.
    function recordPositive(address account, bytes32 domain, uint256 points) external;

    /// @notice Record a negative reputation event (slash, downtime, etc.).
    /// @param account The participant account.
    /// @param domain The domain where the event occurred.
    /// @param points Reputation points to deduct.
    function recordNegative(address account, bytes32 domain, uint256 points) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the aggregate reputation score for an account across all domains.
    /// @param account The participant account.
    /// @return aggregateScore Weighted average reputation across all domains (0-10000 BPS).
    function getAggregateReputation(address account) external view returns (uint256 aggregateScore);

    /// @notice Get the domain-specific reputation for an account.
    function getDomainReputation(address account, bytes32 domain)
        external
        view
        returns (DomainReputation memory);

    /// @notice Get the stake discount an account qualifies for in a given domain.
    /// @param account The participant account.
    /// @param domain The target domain.
    /// @return discountBps Discount on minimum stake requirement (0-5000 BPS, max 50% off).
    function getStakeDiscount(address account, bytes32 domain) external view returns (uint256 discountBps);

    /// @notice Get all domains an account has reputation in.
    function getAccountDomains(address account) external view returns (bytes32[] memory domains);
}
