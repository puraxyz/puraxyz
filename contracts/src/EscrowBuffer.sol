// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IEscrowBuffer } from "./interfaces/IEscrowBuffer.sol";
import { ICapacitySignal } from "./interfaces/ICapacitySignal.sol";

/// @title EscrowBuffer
/// @notice Overflow buffer for when all sinks in a task type are at capacity.
///         Holds excess funds and drains FIFO as capacity frees up.
///         In BPE, money can't be "dropped" like data - this buffer absorbs the overflow.
contract EscrowBuffer is IEscrowBuffer, Ownable {
    using SafeERC20 for IERC20;

    // ──────────────────── Storage ────────────────────

    IERC20 public immutable TOKEN;
    ICapacitySignal public immutable capacityRegistry;

    struct BufferState {
        uint256 level; // Current buffered amount
        uint256 maxBuffer; // Maximum buffer size (0 = unlimited)
    }

    mapping(bytes32 taskTypeId => BufferState) internal _buffers;

    // ──────────────────── Events ────────────────────

    event PressureChanged(bytes32 indexed taskTypeId, uint256 newPressure, uint256 timestamp);

    // ──────────────────── Errors ────────────────────

    error BufferExceedsMax(uint256 attempted, uint256 max);
    error NothingToDrain();
    error ZeroAmount();

    // ──────────────────── Constructor ────────────────────

    constructor(address token_, address capacityRegistry_, address owner_) Ownable(owner_) {
        TOKEN = IERC20(token_);
        capacityRegistry = ICapacitySignal(capacityRegistry_);
    }

    // ──────────────────── Buffer Operations ────────────────────

    /// @inheritdoc IEscrowBuffer
    function deposit(bytes32 taskTypeId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        BufferState storage buf = _buffers[taskTypeId];

        uint256 newLevel = buf.level + amount;
        if (buf.maxBuffer > 0 && newLevel > buf.maxBuffer) {
            revert BufferExceedsMax(newLevel, buf.maxBuffer);
        }

        buf.level = newLevel;
        TOKEN.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(taskTypeId, msg.sender, amount);

        if (buf.maxBuffer > 0 && newLevel >= buf.maxBuffer) {
            emit BufferFull(taskTypeId, newLevel);
        }

        _emitPressure(taskTypeId, buf);
    }

    /// @inheritdoc IEscrowBuffer
    function drain(bytes32 taskTypeId) external {
        BufferState storage buf = _buffers[taskTypeId];
        if (buf.level == 0) revert NothingToDrain();

        // Get sinks with capacity from registry
        (address[] memory sinks, uint256[] memory capacities) = capacityRegistry.getSinks(taskTypeId);

        uint256 totalAvailable;
        for (uint256 i; i < capacities.length; ++i) {
            totalAvailable += capacities[i];
        }

        if (totalAvailable == 0) revert NothingToDrain();

        // Distribute proportionally to capacity, up to buffer level
        uint256 toDrain = buf.level;
        uint256 drained;

        for (uint256 i; i < sinks.length; ++i) {
            if (capacities[i] == 0) continue;
            uint256 share = (toDrain * capacities[i]) / totalAvailable;
            if (share == 0) continue;

            TOKEN.safeTransfer(sinks[i], share);
            drained += share;
            emit Drained(taskTypeId, sinks[i], share);
        }

        buf.level -= drained;

        _emitPressure(taskTypeId, buf);
    }

    // ──────────────────── Configuration ────────────────────

    /// @inheritdoc IEscrowBuffer
    function setBufferMax(bytes32 taskTypeId, uint256 maxBuffer) external onlyOwner {
        _buffers[taskTypeId].maxBuffer = maxBuffer;
    }

    // ──────────────────── Reads ────────────────────

    /// @inheritdoc IEscrowBuffer
    function bufferLevel(bytes32 taskTypeId) external view returns (uint256) {
        return _buffers[taskTypeId].level;
    }

    /// @inheritdoc IEscrowBuffer
    function bufferMax(bytes32 taskTypeId) external view returns (uint256) {
        return _buffers[taskTypeId].maxBuffer;
    }

    /// @notice Escrow pressure = level / maxBuffer (1e18 scaled). 0 if maxBuffer is 0.
    function getEscrowPressure(bytes32 taskTypeId) external view returns (uint256) {
        BufferState storage buf = _buffers[taskTypeId];
        if (buf.maxBuffer == 0) return 0;
        return (buf.level * 1e18) / buf.maxBuffer;
    }

    // ──────────────────── Internal ────────────────────

    function _emitPressure(bytes32 taskTypeId, BufferState storage buf) internal {
        uint256 pressure = buf.maxBuffer > 0 ? (buf.level * 1e18) / buf.maxBuffer : 0;
        emit PressureChanged(taskTypeId, pressure, block.timestamp);
    }
}
