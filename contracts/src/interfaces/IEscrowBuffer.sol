// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IEscrowBuffer
/// @notice Interface for overflow escrow when all sinks are at capacity.
///         Buffers excess payment and drains FIFO as capacity frees up.
interface IEscrowBuffer {
    // ──────────────────── Events ────────────────────

    event Deposited(bytes32 indexed taskTypeId, address indexed source, uint256 amount);
    event Drained(bytes32 indexed taskTypeId, address indexed sink, uint256 amount);
    event BufferFull(bytes32 indexed taskTypeId, uint256 bufferLevel);

    // ──────────────────── Buffer Operations ────────────────────

    /// @notice Deposit overflow funds into the buffer for a task type.
    /// @param taskTypeId The task type.
    /// @param amount Amount to buffer.
    function deposit(bytes32 taskTypeId, uint256 amount) external;

    /// @notice Drain buffered funds to sinks with available capacity.
    ///         Permissionless - anyone can trigger.
    /// @param taskTypeId The task type to drain buffer for.
    function drain(bytes32 taskTypeId) external;

    // ──────────────────── Configuration ────────────────────

    /// @notice Set the maximum buffer size for a task type.
    /// @param taskTypeId The task type.
    /// @param maxBuffer The maximum buffer level.
    function setBufferMax(bytes32 taskTypeId, uint256 maxBuffer) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the current buffer level for a task type.
    /// @param taskTypeId The task type.
    /// @return level Current amount buffered.
    function bufferLevel(bytes32 taskTypeId) external view returns (uint256 level);

    /// @notice Get the maximum buffer size for a task type.
    /// @param taskTypeId The task type.
    /// @return maxBuffer Maximum buffer level.
    function bufferMax(bytes32 taskTypeId) external view returns (uint256 maxBuffer);

    /// @notice Get the escrow pressure P = level / maxBuffer (1e18 scaled).
    /// @param taskTypeId The task type.
    /// @return pressure The pressure ratio (0 = empty, 1e18 = full).
    function getEscrowPressure(bytes32 taskTypeId) external view returns (uint256 pressure);
}
