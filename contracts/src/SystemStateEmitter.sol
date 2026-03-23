// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ITemperatureOracle } from "./interfaces/ITemperatureOracle.sol";
import { IVirialMonitor } from "./interfaces/IVirialMonitor.sol";
import { IEscrowBuffer } from "./interfaces/IEscrowBuffer.sol";

/// @title SystemStateEmitter
/// @notice Aggregates thermodynamic state from TemperatureOracle, VirialMonitor, and
///         EscrowBuffer into a single event. Called per-epoch by keepers or the
///         OffchainAggregator to produce a unified snapshot for indexers and dashboards.
contract SystemStateEmitter {
    // ──────────────────── Events ────────────────────

    event SystemStateUpdate(
        bytes32 indexed scope,
        uint256 temperature,
        uint256 virialRatio,
        uint256 escrowPressure,
        uint8 phase,
        uint256 timestamp
    );

    // ──────────────────── Storage ────────────────────

    ITemperatureOracle public immutable temperatureOracle;
    IVirialMonitor public immutable virialMonitor;
    IEscrowBuffer public immutable escrowBuffer;

    // ──────────────────── Constructor ────────────────────

    constructor(address temperatureOracle_, address virialMonitor_, address escrowBuffer_) {
        temperatureOracle = ITemperatureOracle(temperatureOracle_);
        virialMonitor = IVirialMonitor(virialMonitor_);
        escrowBuffer = IEscrowBuffer(escrowBuffer_);
    }

    // ──────────────────── Emit ────────────────────

    /// @notice Read all sources and emit a unified system state snapshot.
    ///         Permissionless — anyone can call (keeper, aggregator, cron).
    /// @param scope Task type or pool identifier to scope the snapshot.
    function emitSystemState(bytes32 scope) external {
        uint256 temp = temperatureOracle.getTemperature();
        uint256 virial = virialMonitor.getVirialRatio();
        uint256 pressure = _getEscrowPressure(scope);
        uint8 phase = _derivePhase(temp, virial, pressure);

        emit SystemStateUpdate(scope, temp, virial, pressure, phase, block.timestamp);
    }

    // ──────────────────── Internal ────────────────────

    /// @dev Read escrow pressure for a scope. Returns 0 if buffer has no max set.
    function _getEscrowPressure(bytes32 scope) internal view returns (uint256) {
        uint256 level = escrowBuffer.bufferLevel(scope);
        uint256 max = escrowBuffer.bufferMax(scope);
        if (max == 0) return 0;
        return (level * 1e18) / max;
    }

    /// @dev Derive phase from thermodynamic signals.
    ///      0=Steady, 1=Bull, 2=Shock, 3=Recovery, 4=Collapse
    function _derivePhase(uint256 temp, uint256 virial, uint256 pressure) internal pure returns (uint8) {
        // Collapse: extreme pressure or virial
        if (pressure > 95e16 || virial > 5e18) return 4; // Collapse
        // Shock: high pressure or very low virial
        if (pressure > 80e16 || virial < 2e17) return 2; // Shock
        // Bull: high virial (under-capitalized, demand exceeding stake)
        if (virial > 15e17) return 1; // Bull
        // Recovery: moderate temperature with recovering virial
        if (temp > 3e18 && virial < 8e17) return 3; // Recovery
        return 0; // Steady
    }
}
