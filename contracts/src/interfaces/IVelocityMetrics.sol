// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IVelocityMetrics
/// @notice Tracks per-account and network-wide monetary velocity metrics on-chain.
///         Velocity = totalOutflow / averageBalance over epoch windows.
interface IVelocityMetrics {
    // ──────────────────── Events ────────────────────

    /// @notice Emitted when an account's velocity is updated at epoch boundary.
    event VelocityUpdated(address indexed account, uint256 turnoverRate, uint256 epoch);

    /// @notice Emitted when network-wide velocity is computed at epoch boundary.
    event NetworkVelocityUpdated(uint256 aggregateVelocity, uint256 epoch);

    // ──────────────────── Recording ────────────────────

    /// @notice Record an outflow event for an account (called by DemurrageToken on transfers).
    /// @param account The account transferring tokens.
    /// @param amount The amount transferred.
    function recordOutflow(address account, uint256 amount) external;

    /// @notice Snapshot the current balance for an account (called periodically or on transfers).
    /// @param account The account to snapshot.
    /// @param balance The current balance.
    function snapshotBalance(address account, uint256 balance) external;

    /// @notice Advance to the next epoch, computing velocity metrics for all tracked accounts.
    function advanceEpoch() external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the turnover rate for an account in the most recent completed epoch.
    /// @param account The account to query.
    /// @return turnoverRate Turnover rate in basis points (10000 = 1x turnover per epoch).
    function getTurnoverRate(address account) external view returns (uint256 turnoverRate);

    /// @notice Get the network-wide aggregate velocity for the most recent completed epoch.
    /// @return aggregateVelocity Aggregate velocity in basis points.
    function getNetworkVelocity() external view returns (uint256 aggregateVelocity);

    /// @notice Get the current epoch number.
    function currentEpoch() external view returns (uint256);

    /// @notice Get cumulative outflow for an account in the current epoch.
    function epochOutflow(address account) external view returns (uint256);
}
