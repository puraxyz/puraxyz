// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IReputationLedger } from "./interfaces/IReputationLedger.sol";

/// @title ReputationLedger
/// @notice Cross-domain portable reputation system. Tracks performance across all
///         backproto domains (AI compute, Nostr relay, Lightning routing, DePIN).
///         Higher aggregate reputation → lower minimum stake in new domains (up to 50% off).
///         Only authorized domain contracts can record events.
contract ReputationLedger is IReputationLedger, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_SCORE = 10_000;         // 100% in BPS
    uint256 public constant MAX_DISCOUNT_BPS = 5_000;   // 50% max stake discount
    uint256 public constant NEGATIVE_WEIGHT = 3;        // Negatives hurt 3x

    // ──────────────────── Storage ────────────────────

    struct DomainConfig {
        address adapter;
        bool active;
        uint256 weight;     // Weight for aggregate scoring (BPS)
    }

    mapping(bytes32 domain => DomainConfig) internal _domains;
    bytes32[] internal _domainIds;

    // account => domain => reputation
    mapping(address => mapping(bytes32 => DomainReputation)) internal _reputations;
    // account => list of domains participated in
    mapping(address => bytes32[]) internal _accountDomains;
    // account => domain => index in accountDomains
    mapping(address => mapping(bytes32 => uint256)) internal _domainIndex;
    // account => domain => exists flag
    mapping(address => mapping(bytes32 => bool)) internal _hasDomain;

    // domain => authorized recorders (contracts that can update reputation)
    mapping(bytes32 => mapping(address => bool)) public authorizedRecorders;

    // ──────────────────── Errors ────────────────────

    error DomainAlreadyRegistered();
    error DomainNotRegistered();
    error NotAuthorized();
    error InvalidPoints();

    // ──────────────────── Constructor ────────────────────

    constructor(address owner_) Ownable(owner_) {}

    // ──────────────────── Domain Registration ────────────────────

    /// @inheritdoc IReputationLedger
    function registerDomain(bytes32 domain, address adapter) external onlyOwner {
        if (_domains[domain].active) revert DomainAlreadyRegistered();

        _domains[domain] = DomainConfig({
            adapter: adapter,
            active: true,
            weight: BPS // default equal weight
        });
        _domainIds.push(domain);

        emit DomainRegistered(domain, adapter);
    }

    /// @notice Set the weight of a domain in aggregate reputation scoring.
    /// @param domain The domain identifier.
    /// @param weight Weight in BPS (e.g., 2500 = 25%).
    function setDomainWeight(bytes32 domain, uint256 weight) external onlyOwner {
        if (!_domains[domain].active) revert DomainNotRegistered();
        _domains[domain].weight = weight;
    }

    /// @notice Authorize a contract to record reputation events for a domain.
    /// @param domain The domain identifier.
    /// @param recorder The contract address to authorize.
    function authorizeRecorder(bytes32 domain, address recorder) external onlyOwner {
        if (!_domains[domain].active) revert DomainNotRegistered();
        authorizedRecorders[domain][recorder] = true;
    }

    /// @notice Revoke a recorder's authorization.
    function revokeRecorder(bytes32 domain, address recorder) external onlyOwner {
        authorizedRecorders[domain][recorder] = false;
    }

    // ──────────────────── Reputation Updates ────────────────────

    /// @inheritdoc IReputationLedger
    function recordPositive(address account, bytes32 domain, uint256 points) external {
        if (!authorizedRecorders[domain][msg.sender]) revert NotAuthorized();
        if (points == 0) revert InvalidPoints();

        _ensureDomainTracked(account, domain);

        DomainReputation storage rep = _reputations[account][domain];
        rep.completions += 1;

        // Score: add points, cap at MAX_SCORE
        uint256 newScore = rep.score + points;
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        rep.score = newScore;
        rep.lastUpdated = block.timestamp;

        uint256 aggregate = _computeAggregate(account);
        emit ReputationUpdated(account, domain, newScore, aggregate);
    }

    /// @inheritdoc IReputationLedger
    function recordNegative(address account, bytes32 domain, uint256 points) external {
        if (!authorizedRecorders[domain][msg.sender]) revert NotAuthorized();
        if (points == 0) revert InvalidPoints();

        _ensureDomainTracked(account, domain);

        DomainReputation storage rep = _reputations[account][domain];
        rep.slashCount += 1;

        // Negatives hurt more (3x weight)
        uint256 penalty = points * NEGATIVE_WEIGHT;
        if (penalty >= rep.score) {
            rep.score = 0;
        } else {
            rep.score -= penalty;
        }
        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(account, domain, rep.score, _computeAggregate(account));
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IReputationLedger
    function getAggregateReputation(address account) external view returns (uint256 aggregateScore) {
        return _computeAggregate(account);
    }

    /// @inheritdoc IReputationLedger
    function getDomainReputation(address account, bytes32 domain)
        external
        view
        returns (DomainReputation memory)
    {
        return _reputations[account][domain];
    }

    /// @inheritdoc IReputationLedger
    function getStakeDiscount(address account, bytes32 domain)
        external
        view
        returns (uint256 discountBps)
    {
        uint256 aggregate = _computeAggregate(account);

        // Discount from OTHER domains' reputation (cross-domain benefit)
        // Exclude the target domain from the calculation
        uint256 crossScore = _computeAggregateExcluding(account, domain);

        // Linear: up to MAX_DISCOUNT_BPS for crossScore = MAX_SCORE
        discountBps = (crossScore * MAX_DISCOUNT_BPS) / MAX_SCORE;
        if (discountBps > MAX_DISCOUNT_BPS) discountBps = MAX_DISCOUNT_BPS;
    }

    /// @inheritdoc IReputationLedger
    function getAccountDomains(address account) external view returns (bytes32[] memory domains) {
        return _accountDomains[account];
    }

    // ──────────────────── Internal ────────────────────

    function _ensureDomainTracked(address account, bytes32 domain) internal {
        if (!_domains[domain].active) revert DomainNotRegistered();
        if (!_hasDomain[account][domain]) {
            _hasDomain[account][domain] = true;
            _domainIndex[account][domain] = _accountDomains[account].length;
            _accountDomains[account].push(domain);
        }
    }

    function _computeAggregate(address account) internal view returns (uint256) {
        bytes32[] storage domains = _accountDomains[account];
        if (domains.length == 0) return 0;

        uint256 totalWeight;
        uint256 weightedScore;

        for (uint256 i; i < domains.length; ++i) {
            uint256 weight = _domains[domains[i]].weight;
            totalWeight += weight;
            weightedScore += _reputations[account][domains[i]].score * weight;
        }

        if (totalWeight == 0) return 0;
        return weightedScore / totalWeight;
    }

    function _computeAggregateExcluding(address account, bytes32 excludeDomain)
        internal
        view
        returns (uint256)
    {
        bytes32[] storage domains = _accountDomains[account];
        if (domains.length == 0) return 0;

        uint256 totalWeight;
        uint256 weightedScore;

        for (uint256 i; i < domains.length; ++i) {
            if (domains[i] == excludeDomain) continue;
            uint256 weight = _domains[domains[i]].weight;
            totalWeight += weight;
            weightedScore += _reputations[account][domains[i]].score * weight;
        }

        if (totalWeight == 0) return 0;
        return weightedScore / totalWeight;
    }
}
