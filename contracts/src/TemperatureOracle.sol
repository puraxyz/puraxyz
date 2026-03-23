// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ITemperatureOracle } from "./interfaces/ITemperatureOracle.sol";

/// @title TemperatureOracle
/// @notice System temperature derived from attestation variance.
///         τ = τ_min + (τ_max - τ_min) * σ² / σ²_max
///
///         High variance among provider attestations → high temperature → more stochastic routing.
///         Low variance → low temperature → near-deterministic routing to best provider.
///
///         Boltzmann weight approximation: w(c) ≈ 1e18 + (c * 1e18) / τ  (first-order Taylor of exp(c/τ)).
///         Full exp() is computed off-chain; this on-chain approximation is for view functions only.
contract TemperatureOracle is ITemperatureOracle, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant PRECISION = 1e18;

    // ──────────────────── Storage ────────────────────

    /// @notice Current system temperature (1e18 scaled).
    uint256 public temperature;

    /// @notice Minimum temperature floor. Raised to 0.5 (5e17) to avoid oscillation trap
    ///         when all providers report near-identical capacity.
    uint256 public tauMin;

    /// @notice Maximum temperature ceiling.
    uint256 public tauMax;

    /// @notice Address authorized to call updateTemperature (typically OffchainAggregator).
    address public updater;

    // ──────────────────── Errors ────────────────────

    error Unauthorized();
    error InvalidRange();
    error ZeroMaxVariance();

    // ──────────────────── Constructor ────────────────────

    constructor(
        uint256 tauMin_,
        uint256 tauMax_,
        address updater_,
        address owner_
    ) Ownable(owner_) {
        if (tauMin_ >= tauMax_) revert InvalidRange();
        tauMin = tauMin_;
        tauMax = tauMax_;
        temperature = tauMin_; // Start cold
        updater = updater_;
    }

    // ──────────────────── Admin ────────────────────

    /// @notice Update the τ range.
    function setTauRange(uint256 min_, uint256 max_) external onlyOwner {
        if (min_ >= max_) revert InvalidRange();
        tauMin = min_;
        tauMax = max_;
    }

    /// @notice Set the authorized updater address.
    function setUpdater(address updater_) external onlyOwner {
        updater = updater_;
    }

    // ──────────────────── Temperature Update ────────────────────

    /// @inheritdoc ITemperatureOracle
    function updateTemperature(uint256 attestationVariance, uint256 maxExpectedVariance) external {
        if (msg.sender != updater && msg.sender != owner()) revert Unauthorized();
        if (maxExpectedVariance == 0) revert ZeroMaxVariance();

        uint256 oldTemp = temperature;

        // τ = τ_min + (τ_max - τ_min) * σ² / σ²_max
        // Cap ratio at 1.0 (if variance exceeds expected max)
        uint256 ratio = attestationVariance >= maxExpectedVariance
            ? PRECISION
            : (attestationVariance * PRECISION) / maxExpectedVariance;

        temperature = tauMin + ((tauMax - tauMin) * ratio) / PRECISION;

        emit TemperatureUpdated(oldTemp, temperature, attestationVariance);
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc ITemperatureOracle
    function getTemperature() external view returns (uint256) {
        return temperature;
    }

    /// @inheritdoc ITemperatureOracle
    function boltzmannWeight(uint256 spareCapacity) external view returns (uint256 weight) {
        uint256 tau = temperature;
        if (tau == 0) return PRECISION;
        // First-order Taylor: exp(c/τ) ≈ 1 + c/τ
        // weight = 1e18 + (c * 1e18) / τ
        weight = PRECISION + (spareCapacity * PRECISION) / tau;
    }
}
