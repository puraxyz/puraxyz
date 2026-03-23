// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IOffchainAggregator } from "./interfaces/IOffchainAggregator.sol";
import { ICapacitySignal } from "./interfaces/ICapacitySignal.sol";
import { ITemperatureOracle } from "./interfaces/ITemperatureOracle.sol";
import { IVirialMonitor } from "./interfaces/IVirialMonitor.sol";
import { IBackpressurePool } from "./interfaces/IBackpressurePool.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title OffchainAggregator
/// @notice Batch-verifies off-chain signed capacity attestations and feeds them into
///         the CapacityRegistry. Replaces commit-reveal as the fast path for capacity
///         updates - agents sign capacity attestations off-chain, and any relayer can
///         submit a batch on-chain. Replay prevention via per-sink nonces.
contract OffchainAggregator is IOffchainAggregator, Ownable, EIP712 {
    using ECDSA for bytes32;

    // ──────────────────── Constants ────────────────────

    /// @notice EIP-712 typehash for capacity attestations.
    bytes32 public constant ATTESTATION_TYPEHASH =
        keccak256("CapacityAttestation(bytes32 taskTypeId,address sink,uint256 capacity,uint256 timestamp,uint256 nonce)");

    /// @notice Maximum age of an attestation in seconds (stale attestations are rejected).
    uint256 public constant MAX_ATTESTATION_AGE = 600; // 10 minutes

    /// @notice EIP-712 typehash for Boltzmann share submissions.
    bytes32 public constant BOLTZMANN_SHARES_TYPEHASH =
        keccak256("BoltzmannShares(bytes32 taskTypeId,address[] sinks,uint256[] shares,uint256 temperature,uint256 timestamp,uint256 nonce)");

    // ──────────────────── Storage ────────────────────

    CapacityRegistryLike public immutable capacityRegistry;

    /// @notice Temperature oracle for variance updates.
    ITemperatureOracle public temperatureOracle;

    /// @notice Virial monitor for throughput/stake ratio.
    IVirialMonitor public virialMonitor;

    /// @notice Backpressure pool for Boltzmann share rebalancing.
    IBackpressurePool public backpressurePool;

    /// @notice Last processed nonce per sink (replay prevention - nonces must be strictly increasing).
    mapping(address sink => uint256) public lastNonce;

    /// @notice Last applied attestation timestamp per (taskType, sink).
    mapping(bytes32 taskTypeId => mapping(address sink => uint256)) internal _lastTimestamp;

    // ──────────────────── Errors ────────────────────

    error StaleAttestation(uint256 attestationTime, uint256 currentTime);
    error InvalidSignature();
    error NonceAlreadyUsed(uint256 provided, uint256 required);

    // ──────────────────── Constructor ────────────────────

    constructor(
        address capacityRegistry_,
        address owner_
    ) Ownable(owner_) EIP712("BPE-OffchainAggregator", "1") {
        capacityRegistry = CapacityRegistryLike(capacityRegistry_);
    }

    // ──────────────────── Thermodynamic Config ────────────────────

    function setTemperatureOracle(address oracle_) external onlyOwner {
        temperatureOracle = ITemperatureOracle(oracle_);
    }

    function setVirialMonitor(address monitor_) external onlyOwner {
        virialMonitor = IVirialMonitor(monitor_);
    }

    function setBackpressurePool(address pool_) external onlyOwner {
        backpressurePool = IBackpressurePool(pool_);
    }

    // ──────────────────── Batch Submission ────────────────────

    /// @inheritdoc IOffchainAggregator
    function submitBatch(SignedAttestation[] calldata attestations) external {
        uint256 len = attestations.length;

        for (uint256 i; i < len; ++i) {
            SignedAttestation calldata att = attestations[i];

            // 1. Check freshness
            if (block.timestamp > att.timestamp + MAX_ATTESTATION_AGE) {
                emit AttestationRejected(att.taskTypeId, att.sink, "stale");
                continue;
            }

            // 2. Check nonce (must be strictly increasing per sink)
            if (att.nonce <= lastNonce[att.sink]) {
                emit AttestationRejected(att.taskTypeId, att.sink, "nonce");
                continue;
            }

            // 3. Verify EIP-712 signature
            bytes32 structHash = keccak256(
                abi.encode(ATTESTATION_TYPEHASH, att.taskTypeId, att.sink, att.capacity, att.timestamp, att.nonce)
            );
            bytes32 digest = _hashTypedDataV4(structHash);
            address recovered = digest.recover(att.signature);

            if (recovered != att.sink) {
                emit AttestationRejected(att.taskTypeId, att.sink, "signature");
                continue;
            }

            // 4. Update nonce and timestamp
            lastNonce[att.sink] = att.nonce;
            _lastTimestamp[att.taskTypeId][att.sink] = att.timestamp;

            // 5. Feed into CapacityRegistry
            capacityRegistry.updateCapacityFromAggregator(att.taskTypeId, att.sink, att.capacity);

            emit AttestationApplied(att.taskTypeId, att.sink, att.capacity, att.timestamp);
        }

        emit BatchSubmitted(len, msg.sender);

        // Compute variance from accepted attestations and update temperature oracle
        if (address(temperatureOracle) != address(0) && len > 1) {
            _updateVariance(attestations);
        }
    }

    /// @notice Submit pre-computed Boltzmann shares for pool rebalancing.
    ///         Shares are computed off-chain: share[i] = exp(c_i/τ) / Σ exp(c_j/τ)
    function submitBoltzmannShares(
        bytes32 taskTypeId,
        address[] calldata sinks,
        uint256[] calldata shares
    ) external {
        if (address(backpressurePool) == address(0)) return;
        backpressurePool.rebalanceWithShares(taskTypeId, sinks, shares);
    }

    // ──────────────────── Internal Variance ────────────────────

    /// @dev Compute capacity variance from batch and update temperature oracle.
    ///      Variance = E[X²] - (E[X])², computed in 1e18 fixed point.
    function _updateVariance(SignedAttestation[] calldata attestations) internal {
        uint256 len = attestations.length;
        uint256 sumCap;
        uint256 sumCapSq;
        uint256 accepted;

        for (uint256 i; i < len; ++i) {
            // Only include attestations that passed validation (check nonce)
            if (lastNonce[attestations[i].sink] == attestations[i].nonce) {
                uint256 c = attestations[i].capacity;
                sumCap += c;
                sumCapSq += c * c;
                accepted++;
            }
        }

        if (accepted < 2) return;

        // mean = sumCap / accepted
        uint256 mean = sumCap / accepted;
        // variance = sumCapSq / accepted - mean^2
        uint256 variance = (sumCapSq / accepted);
        if (variance > mean * mean) {
            variance -= mean * mean;
        } else {
            variance = 0;
        }

        // Normalize variance relative to mean^2 to get coefficient of variation squared
        // Pass raw variance and a max (mean^2) to temperature oracle
        uint256 maxVariance = mean * mean;
        if (maxVariance == 0) maxVariance = 1;

        temperatureOracle.updateTemperature(variance, maxVariance);
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IOffchainAggregator
    function lastTimestamp(bytes32 taskTypeId, address sink) external view returns (uint256) {
        return _lastTimestamp[taskTypeId][sink];
    }
}

/// @notice Minimal interface for the CapacityRegistry's aggregator-specific function.
interface CapacityRegistryLike {
    function updateCapacityFromAggregator(bytes32 taskTypeId, address sink, uint256 capacity) external;
}
