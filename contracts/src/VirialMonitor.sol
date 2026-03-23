// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IVirialMonitor } from "./interfaces/IVirialMonitor.sol";

/// @title VirialMonitor
/// @notice Virial ratio V = 2 * throughput / (staked + escrowed).
///         Analogous to the virial theorem in statistical mechanics: at equilibrium,
///         twice the kinetic energy (throughput) equals the potential energy (bound capital).
///
///         V ≈ 1.0: healthy equilibrium — capital commitment matches productive output.
///         V >> 1:  under-capitalized — throughput exceeds what stake+escrow can back.
///         V << 1:  over-staked — too much capital locked relative to actual usage.
///
///         Recommends demurrage rate: δ = δ_min + (δ_max - δ_min) * max(0, 1 - V)
///         When V < 1 (over-staked), demurrage rises to push idle capital back into circulation.
///         When V ≥ 1, demurrage stays at minimum.
contract VirialMonitor is IVirialMonitor, Ownable {
    // ──────────────────── Constants ────────────────────

    uint256 public constant PRECISION = 1e18;

    // ──────────────────── Storage ────────────────────

    /// @notice Current virial ratio (1e18 scaled). V=1e18 means equilibrium.
    uint256 public virialRatio;

    /// @notice Equilibrium target (1e18 scaled). Configurable, start at 1.0.
    uint256 public equilibriumTarget;

    /// @notice Minimum demurrage rate (per-second, 1e18 scaled).
    ///         ~1% annual ≈ 317_097_920 in 1e18 scale.
    uint256 public deltaMin;

    /// @notice Maximum demurrage rate (per-second, 1e18 scaled).
    ///         ~10% annual ≈ 3_170_979_198 in 1e18 scale.
    uint256 public deltaMax;

    /// @notice Address authorized to call updateVirial (typically OffchainAggregator).
    address public updater;

    // ──────────────────── Errors ────────────────────

    error Unauthorized();
    error ZeroDenominator();
    error InvalidDemurrageRange();

    // ──────────────────── Constructor ────────────────────

    constructor(
        uint256 equilibriumTarget_,
        uint256 deltaMin_,
        uint256 deltaMax_,
        address updater_,
        address owner_
    ) Ownable(owner_) {
        if (deltaMin_ > deltaMax_) revert InvalidDemurrageRange();
        equilibriumTarget = equilibriumTarget_;
        deltaMin = deltaMin_;
        deltaMax = deltaMax_;
        updater = updater_;
        virialRatio = equilibriumTarget_; // Start at equilibrium
    }

    // ──────────────────── Admin ────────────────────

    /// @notice Set the equilibrium target.
    function setEquilibriumTarget(uint256 target_) external onlyOwner {
        uint256 old = equilibriumTarget;
        equilibriumTarget = target_;
        emit EquilibriumTargetUpdated(old, target_);
    }

    /// @notice Set the demurrage rate range.
    function setDemurrageRange(uint256 min_, uint256 max_) external onlyOwner {
        if (min_ > max_) revert InvalidDemurrageRange();
        deltaMin = min_;
        deltaMax = max_;
    }

    /// @notice Set the authorized updater address.
    function setUpdater(address updater_) external onlyOwner {
        updater = updater_;
    }

    // ──────────────────── Virial Update ────────────────────

    /// @inheritdoc IVirialMonitor
    function updateVirial(uint256 epochThroughput, uint256 totalStaked, uint256 totalEscrowed) external {
        if (msg.sender != updater && msg.sender != owner()) revert Unauthorized();

        uint256 totalBound = totalStaked + totalEscrowed;
        if (totalBound == 0) revert ZeroDenominator();

        uint256 oldRatio = virialRatio;

        // V = 2 * throughput / (staked + escrowed)
        virialRatio = (2 * epochThroughput * PRECISION) / totalBound;

        emit VirialUpdated(oldRatio, virialRatio, epochThroughput, totalBound);
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IVirialMonitor
    function getVirialRatio() external view returns (uint256) {
        return virialRatio;
    }

    /// @inheritdoc IVirialMonitor
    function recommendedDemurrageRate() external view returns (uint256 rate) {
        // δ = δ_min + (δ_max - δ_min) * max(0, 1 - V)
        // When V >= 1e18 (at or above equilibrium): δ = δ_min
        // When V < 1e18 (over-staked): δ increases linearly toward δ_max at V=0
        if (virialRatio >= PRECISION) {
            return deltaMin;
        }
        uint256 deficit = PRECISION - virialRatio; // 0 < deficit <= 1e18
        rate = deltaMin + ((deltaMax - deltaMin) * deficit) / PRECISION;
    }

    /// @inheritdoc IVirialMonitor
    function recommendedStakeAdjustment() external view returns (int256 adjustment) {
        // Positive: more stake needed (V > target). Negative: over-staked (V < target).
        if (virialRatio > equilibriumTarget) {
            adjustment = int256(virialRatio - equilibriumTarget);
        } else {
            adjustment = -int256(equilibriumTarget - virialRatio);
        }
    }
}
