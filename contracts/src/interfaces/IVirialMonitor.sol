// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IVirialMonitor
/// @notice Interface for the virial ratio monitor.
///         Virial ratio V = 2 * throughput / (staked + escrowed) measures whether the
///         system's economic energy (stake + escrow) matches its kinetic output (throughput).
///         V ≈ 1 signals equilibrium. V >> 1 means under-capitalized. V << 1 means over-staked.
interface IVirialMonitor {
    // ──────────────────── Events ────────────────────

    event VirialUpdated(uint256 oldRatio, uint256 newRatio, uint256 throughput, uint256 totalBound);
    event EquilibriumTargetUpdated(uint256 oldTarget, uint256 newTarget);

    // ──────────────────── Write ────────────────────

    /// @notice Update virial ratio from epoch throughput data.
    /// @param epochThroughput Total throughput value for the epoch (1e18 scaled).
    /// @param totalStaked Total staked tokens across all sinks (1e18 scaled).
    /// @param totalEscrowed Total escrowed tokens across all buffers (1e18 scaled).
    function updateVirial(uint256 epochThroughput, uint256 totalStaked, uint256 totalEscrowed) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the current virial ratio (1e18 scaled).
    /// @return ratio Current V value.
    function getVirialRatio() external view returns (uint256 ratio);

    /// @notice Get the recommended demurrage rate based on virial deviation.
    ///         δ = δ_min + (δ_max - δ_min) * max(0, 1 - V)
    /// @return rate Recommended per-second decay rate (1e18 scaled).
    function recommendedDemurrageRate() external view returns (uint256 rate);

    /// @notice Get the recommended stake adjustment direction.
    ///         Returns positive if more stake needed (V > target), negative if over-staked.
    /// @return adjustment Signed adjustment hint: >0 means increase, <0 means decrease (1e18 scaled).
    function recommendedStakeAdjustment() external view returns (int256 adjustment);

    /// @notice Get the equilibrium target.
    function equilibriumTarget() external view returns (uint256);
}
