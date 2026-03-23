// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ITemperatureOracle
/// @notice Interface for the system temperature oracle.
///         Temperature τ controls the stochasticity of Boltzmann routing:
///         high τ → near-uniform distribution, low τ → near-deterministic to best provider.
interface ITemperatureOracle {
    // ──────────────────── Events ────────────────────

    event TemperatureUpdated(uint256 oldTemperature, uint256 newTemperature, uint256 variance);

    // ──────────────────── Write ────────────────────

    /// @notice Update system temperature from attestation variance.
    /// @param attestationVariance Variance of capacity attestations in the current batch (1e18 scaled).
    /// @param maxExpectedVariance Maximum expected variance for normalization (1e18 scaled).
    function updateTemperature(uint256 attestationVariance, uint256 maxExpectedVariance) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the current system temperature (1e18 scaled).
    /// @return temperature Current τ value.
    function getTemperature() external view returns (uint256 temperature);

    /// @notice Compute Boltzmann weight for a given spare capacity at current temperature.
    ///         weight = exp(spareCapacity / τ) approximated via first-order Taylor.
    /// @param spareCapacity The spare capacity of a sink (1e18 scaled).
    /// @return weight The unnormalized Boltzmann weight (1e18 scaled).
    function boltzmannWeight(uint256 spareCapacity) external view returns (uint256 weight);

    /// @notice Get τ_min parameter.
    function tauMin() external view returns (uint256);

    /// @notice Get τ_max parameter.
    function tauMax() external view returns (uint256);
}
