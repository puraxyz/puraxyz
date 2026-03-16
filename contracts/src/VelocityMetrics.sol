// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IVelocityMetrics } from "./interfaces/IVelocityMetrics.sol";

/// @title VelocityMetrics
/// @notice Tracks per-account and network-wide monetary velocity on-chain.
///         Velocity = totalOutflow / averageBalance over epoch windows.
///         Called by DemurrageToken on transfers to record outflows and balance snapshots.
contract VelocityMetrics is IVelocityMetrics, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant EPOCH_DURATION = 3600; // 1 hour epochs
    uint256 public constant BPS = 10_000;

    // ──────────────────── Storage ────────────────────

    /// @notice Address authorized to record outflows (DemurrageToken).
    address public authorizedRecorder;

    uint256 public _currentEpoch;
    uint256 public _epochStartTimestamp;

    // Network-wide tracking
    uint256 public _networkOutflow;        // Total outflow this epoch
    uint256 public _networkBalanceSum;     // Running sum for average
    uint256 public _networkSnapshotCount;  // Number of snapshots this epoch
    uint256 public _lastNetworkVelocity;   // Last computed aggregate velocity

    struct AccountMetrics {
        uint256 epochOutflow;      // Outflow in current epoch
        uint256 balanceSum;        // Running sum for epoch average
        uint256 snapshotCount;     // Number of snapshots this epoch
        uint256 lastTurnoverRate;  // Last computed turnover rate (BPS)
        uint256 lastEpoch;         // Last epoch the account was active
    }

    mapping(address => AccountMetrics) internal _metrics;

    // ──────────────────── Errors ────────────────────

    error NotAuthorizedRecorder();
    error EpochNotElapsed();

    // ──────────────────── Constructor ────────────────────

    constructor(address authorizedRecorder_, address owner_) Ownable(owner_) {
        authorizedRecorder = authorizedRecorder_;
        _epochStartTimestamp = block.timestamp;
        _currentEpoch = 1;
    }

    // ──────────────────── Admin ────────────────────

    function setAuthorizedRecorder(address recorder) external onlyOwner {
        authorizedRecorder = recorder;
    }

    // ──────────────────── Recording ────────────────────

    /// @inheritdoc IVelocityMetrics
    function recordOutflow(address account, uint256 amount) external {
        if (msg.sender != authorizedRecorder) revert NotAuthorizedRecorder();
        _ensureCurrentEpoch(account);
        _metrics[account].epochOutflow += amount;
        _networkOutflow += amount;
    }

    /// @inheritdoc IVelocityMetrics
    function snapshotBalance(address account, uint256 balance) external {
        if (msg.sender != authorizedRecorder) revert NotAuthorizedRecorder();
        _ensureCurrentEpoch(account);
        _metrics[account].balanceSum += balance;
        _metrics[account].snapshotCount++;
        _networkBalanceSum += balance;
        _networkSnapshotCount++;
    }

    // ──────────────────── Epoch Management ────────────────────

    /// @inheritdoc IVelocityMetrics
    function advanceEpoch() external {
        if (block.timestamp < _epochStartTimestamp + EPOCH_DURATION) revert EpochNotElapsed();

        // Compute network velocity
        if (_networkSnapshotCount > 0 && _networkBalanceSum > 0) {
            uint256 avgBalance = _networkBalanceSum / _networkSnapshotCount;
            if (avgBalance > 0) {
                _lastNetworkVelocity = (_networkOutflow * BPS) / avgBalance;
            }
        }

        emit NetworkVelocityUpdated(_lastNetworkVelocity, _currentEpoch);

        // Reset network metrics
        _networkOutflow = 0;
        _networkBalanceSum = 0;
        _networkSnapshotCount = 0;
        _currentEpoch++;
        _epochStartTimestamp = block.timestamp;
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IVelocityMetrics
    function getTurnoverRate(address account) external view returns (uint256) {
        return _metrics[account].lastTurnoverRate;
    }

    /// @inheritdoc IVelocityMetrics
    function getNetworkVelocity() external view returns (uint256) {
        return _lastNetworkVelocity;
    }

    /// @inheritdoc IVelocityMetrics
    function currentEpoch() external view returns (uint256) {
        return _currentEpoch;
    }

    /// @inheritdoc IVelocityMetrics
    function epochOutflow(address account) external view returns (uint256) {
        return _metrics[account].epochOutflow;
    }

    // ──────────────────── Internal ────────────────────

    /// @dev Ensure account metrics are current. If a new epoch started, finalize the old one.
    function _ensureCurrentEpoch(address account) internal {
        AccountMetrics storage m = _metrics[account];
        if (m.lastEpoch < _currentEpoch) {
            // Finalize previous epoch's turnover rate
            if (m.snapshotCount > 0 && m.balanceSum > 0) {
                uint256 avgBalance = m.balanceSum / m.snapshotCount;
                if (avgBalance > 0) {
                    m.lastTurnoverRate = (m.epochOutflow * BPS) / avgBalance;
                }
            }
            emit VelocityUpdated(account, m.lastTurnoverRate, m.lastEpoch);

            // Reset for new epoch
            m.epochOutflow = 0;
            m.balanceSum = 0;
            m.snapshotCount = 0;
            m.lastEpoch = _currentEpoch;
        }
    }
}
