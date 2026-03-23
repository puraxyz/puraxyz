// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IBackpressurePool } from "./interfaces/IBackpressurePool.sol";
import { ICapacitySignal } from "./interfaces/ICapacitySignal.sol";
import { IEscrowBuffer } from "./interfaces/IEscrowBuffer.sol";

/// @title Pipeline
/// @notice Multi-stage pipeline composition: chains BackpressurePools so that downstream
///         congestion propagates upstream. Each stage's effective capacity is constrained
///         by the minimum of its local capacity and the downstream stage's throughput.
///
///         Pipeline: Source → [Stage 0] → [Stage 1] → ... → [Stage N] → Output
///
///         Upstream propagation: C_effective(stage_i) = min(C_local(stage_i), throughput(stage_{i+1}))
contract Pipeline is Ownable {
    // ──────────────────── Types ────────────────────

    enum PoolPhase { Steady, Bull, Shock, Recovery, Collapse }

    struct CircuitBreakerState {
        PoolPhase phase;
        uint64 sinceTimestamp;
        uint64 lowThroughputEpochs; // Consecutive epochs below threshold
        bool decoupled;
    }

    // ──────────────────── Storage ────────────────────

    IBackpressurePool public immutable backpressurePool;
    ICapacitySignal public immutable capacityRegistry;

    struct PipelineConfig {
        bytes32[] stages; // Ordered task type IDs for each stage
        bool active;
    }

    mapping(bytes32 pipelineId => PipelineConfig) internal _pipelines;

    /// @notice Circuit breaker state per stage (pipelineId => stageIndex => state).
    mapping(bytes32 => mapping(uint256 => CircuitBreakerState)) internal _breakerStates;

    /// @notice Escrow buffer reference for pressure checks.
    IEscrowBuffer public escrowBuffer;

    /// @notice Low-throughput threshold (20% of local capacity, in 1e18).
    uint256 public constant LOW_THROUGHPUT_RATIO = 2e17;

    /// @notice Immediate collapse threshold (5% of capacity).
    uint256 public constant IMMEDIATE_COLLAPSE_RATIO = 5e16;

    /// @notice Escrow pressure threshold for shock (90%).
    uint256 public constant ESCROW_SHOCK_THRESHOLD = 9e17;

    /// @notice Escrow pressure threshold for immediate collapse (95%).
    uint256 public constant ESCROW_COLLAPSE_THRESHOLD = 95e16;

    /// @notice Consecutive low-throughput epochs before gradual collapse.
    uint64 public constant COLLAPSE_EPOCH_THRESHOLD = 3;

    // ──────────────────── Events ────────────────────

    event PipelineCreated(bytes32 indexed pipelineId, bytes32[] stages);
    event PipelineRebalanced(bytes32 indexed pipelineId, uint256[] effectiveCapacities);
    event StageCollapse(bytes32 indexed pipelineId, uint256 indexed stageIndex, PoolPhase phase);
    event StageRecovery(bytes32 indexed pipelineId, uint256 indexed stageIndex);

    // ──────────────────── Errors ────────────────────

    error PipelineAlreadyExists();
    error PipelineDoesNotExist();
    error InsufficientStages();

    // ──────────────────── Constructor ────────────────────

    constructor(address backpressurePool_, address capacityRegistry_, address owner_) Ownable(owner_) {
        backpressurePool = IBackpressurePool(backpressurePool_);
        capacityRegistry = ICapacitySignal(capacityRegistry_);
    }

    /// @notice Set the escrow buffer reference for circuit breaker pressure checks.
    function setEscrowBuffer(address buffer_) external onlyOwner {
        escrowBuffer = IEscrowBuffer(buffer_);
    }

    // ──────────────────── Pipeline Management ────────────────────

    /// @notice Create a pipeline with ordered stages.
    /// @param pipelineId Unique identifier for this pipeline.
    /// @param stages Ordered array of task type IDs (stage 0 = first, stage N = last).
    function createPipeline(bytes32 pipelineId, bytes32[] calldata stages) external {
        if (_pipelines[pipelineId].active) revert PipelineAlreadyExists();
        if (stages.length < 2) revert InsufficientStages();

        _pipelines[pipelineId] = PipelineConfig({ stages: stages, active: true });
        emit PipelineCreated(pipelineId, stages);
    }

    /// @notice Rebalance all stages in a pipeline, propagating downstream constraints upstream.
    ///         This reads current capacity from the registry and triggers rebalance on each pool.
    ///         Stages are rebalanced back-to-front so downstream capacity informs upstream.
    /// @param pipelineId The pipeline to rebalance.
    function rebalancePipeline(bytes32 pipelineId) external {
        PipelineConfig storage pipeline = _pipelines[pipelineId];
        if (!pipeline.active) revert PipelineDoesNotExist();

        uint256 stageCount = pipeline.stages.length;
        uint256[] memory effectiveCaps = new uint256[](stageCount);

        // Pass 1: Compute effective capacities back-to-front (upstream propagation)
        for (uint256 i = stageCount; i > 0;) {
            unchecked { --i; }
            bytes32 taskTypeId = pipeline.stages[i];
            (,, uint256 localCapacity) = capacityRegistry.getTaskType(taskTypeId);

            if (i == stageCount - 1) {
                // Last stage: effective = local
                effectiveCaps[i] = localCapacity;
            } else {
                // Constrained by downstream
                effectiveCaps[i] = localCapacity < effectiveCaps[i + 1] ? localCapacity : effectiveCaps[i + 1];
            }
        }

        // Pass 2: Trigger rebalance on each stage's pool
        for (uint256 i; i < stageCount; ++i) {
            backpressurePool.rebalance(pipeline.stages[i]);
        }

        emit PipelineRebalanced(pipelineId, effectiveCaps);
    }

    // ──────────────────── Circuit Breaker ────────────────────

    /// @notice Check and update circuit breaker for a specific stage.
    /// @param pipelineId The pipeline.
    /// @param stageIndex The stage index to check.
    /// @param currentThroughput Current throughput observed for this stage.
    function checkCircuitBreaker(
        bytes32 pipelineId,
        uint256 stageIndex,
        uint256 currentThroughput
    ) external {
        PipelineConfig storage pipeline = _pipelines[pipelineId];
        if (!pipeline.active) revert PipelineDoesNotExist();

        bytes32 taskTypeId = pipeline.stages[stageIndex];
        (,, uint256 localCapacity) = capacityRegistry.getTaskType(taskTypeId);
        CircuitBreakerState storage bs = _breakerStates[pipelineId][stageIndex];

        // Check escrow pressure if buffer is set
        uint256 escrowPressure = 0;
        if (address(escrowBuffer) != address(0)) {
            escrowPressure = escrowBuffer.getEscrowPressure(taskTypeId);
        }

        // Immediate collapse: throughput < 5% OR escrow > 95%
        if (localCapacity > 0) {
            uint256 ratio = (currentThroughput * 1e18) / localCapacity;
            if (ratio < IMMEDIATE_COLLAPSE_RATIO || escrowPressure > ESCROW_COLLAPSE_THRESHOLD) {
                _decoupleStage(pipelineId, stageIndex, bs, PoolPhase.Collapse);
                return;
            }

            // Gradual: throughput < 20% for 3 epochs
            if (ratio < LOW_THROUGHPUT_RATIO || escrowPressure > ESCROW_SHOCK_THRESHOLD) {
                bs.lowThroughputEpochs++;
                if (bs.lowThroughputEpochs >= COLLAPSE_EPOCH_THRESHOLD) {
                    _decoupleStage(pipelineId, stageIndex, bs, PoolPhase.Shock);
                    return;
                }
            } else {
                // Reset counter on healthy epoch
                if (bs.lowThroughputEpochs > 0) bs.lowThroughputEpochs = 0;
            }
        }

        // Recovery: if decoupled and now healthy
        if (bs.decoupled && localCapacity > 0) {
            uint256 ratio = (currentThroughput * 1e18) / localCapacity;
            if (ratio >= LOW_THROUGHPUT_RATIO && escrowPressure < ESCROW_SHOCK_THRESHOLD) {
                _recoupleStage(pipelineId, stageIndex, bs);
            }
        }
    }

    function _decoupleStage(
        bytes32 pipelineId,
        uint256 stageIndex,
        CircuitBreakerState storage bs,
        PoolPhase phase
    ) internal {
        bs.phase = phase;
        bs.sinceTimestamp = uint64(block.timestamp);
        bs.decoupled = true;
        emit StageCollapse(pipelineId, stageIndex, phase);
    }

    function _recoupleStage(
        bytes32 pipelineId,
        uint256 stageIndex,
        CircuitBreakerState storage bs
    ) internal {
        bs.phase = PoolPhase.Recovery;
        bs.sinceTimestamp = uint64(block.timestamp);
        bs.lowThroughputEpochs = 0;
        bs.decoupled = false;
        emit StageRecovery(pipelineId, stageIndex);
    }

    /// @notice Get the circuit breaker state for a stage.
    function getCircuitBreaker(bytes32 pipelineId, uint256 stageIndex)
        external
        view
        returns (PoolPhase phase, uint64 sinceTimestamp, uint64 lowEpochs, bool decoupled)
    {
        CircuitBreakerState storage bs = _breakerStates[pipelineId][stageIndex];
        return (bs.phase, bs.sinceTimestamp, bs.lowThroughputEpochs, bs.decoupled);
    }

    // ──────────────────── Reads ────────────────────

    /// @notice Get pipeline stage configuration.
    /// @param pipelineId The pipeline.
    /// @return stages The ordered task type IDs.
    /// @return active Whether the pipeline is active.
    function getPipeline(bytes32 pipelineId) external view returns (bytes32[] memory stages, bool active) {
        PipelineConfig storage p = _pipelines[pipelineId];
        return (p.stages, p.active);
    }

    /// @notice Compute effective capacities for all stages (read-only, no state change).
    /// @param pipelineId The pipeline.
    /// @return effectiveCaps Effective capacity per stage after upstream propagation.
    function getEffectiveCapacities(bytes32 pipelineId) external view returns (uint256[] memory effectiveCaps) {
        PipelineConfig storage pipeline = _pipelines[pipelineId];
        uint256 stageCount = pipeline.stages.length;
        effectiveCaps = new uint256[](stageCount);

        for (uint256 i = stageCount; i > 0;) {
            unchecked { --i; }
            (,, uint256 localCapacity) = capacityRegistry.getTaskType(pipeline.stages[i]);
            if (i == stageCount - 1) {
                effectiveCaps[i] = localCapacity;
            } else {
                effectiveCaps[i] = localCapacity < effectiveCaps[i + 1] ? localCapacity : effectiveCaps[i + 1];
            }
        }
    }
}
