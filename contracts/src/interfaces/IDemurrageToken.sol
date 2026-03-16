// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IDemurrageToken
/// @notice Interface for a demurrage-enabled Super Token where idle balances decay continuously.
///         Streaming balances (locked in CFA/GDA agreements) are exempt from decay.
///         Decay proceeds are recycled to a configurable recipient (e.g., BackpressurePool).
interface IDemurrageToken {
    // ──────────────────── Events ────────────────────

    /// @notice Emitted when an account's balance is rebased to account for decay.
    event Rebased(address indexed account, uint256 decayed, uint256 newBalance);

    /// @notice Emitted when the decay rate is updated.
    event DecayRateUpdated(uint256 oldRate, uint256 newRate);

    /// @notice Emitted when the decay recipient is updated.
    event DecayRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ──────────────────── Configuration ────────────────────

    /// @notice Set the continuous decay rate (per-second, 18-decimal fixed point).
    /// @param lambda_ New decay rate. e.g., 5% annual ≈ 1.5854e-9 per second ≈ 1585489599 in 1e18 scale.
    function setDecayRate(uint256 lambda_) external;

    /// @notice Set the recipient of decayed tokens.
    /// @param recipient Address receiving decay proceeds (e.g., BackpressurePool, treasury, burn).
    function setDecayRecipient(address recipient) external;

    // ──────────────────── Reads ────────────────────

    /// @notice Get the real (decay-adjusted) balance of an account at the current timestamp.
    /// @param account The account to query.
    /// @return realBalance The current balance after applying continuous decay.
    function realBalanceOf(address account) external view returns (uint256 realBalance);

    /// @notice Get the nominal (pre-decay) balance of an account.
    /// @param account The account to query.
    /// @return nominalBalance The stored nominal balance before decay adjustment.
    function nominalBalanceOf(address account) external view returns (uint256 nominalBalance);

    /// @notice Get the current decay rate (per-second, 18-decimal fixed point).
    function decayRate() external view returns (uint256);

    /// @notice Get the current decay recipient.
    function decayRecipient() external view returns (address);

    /// @notice Get the timestamp of the last balance update for an account.
    function lastUpdateTime(address account) external view returns (uint256);

    /// @notice Get total decayed tokens since deployment.
    function totalDecayed() external view returns (uint256);

    // ──────────────────── Actions ────────────────────

    /// @notice Explicitly trigger a rebase for an account (updates stored balance to real balance).
    ///         Anyone can call this to force materialization of decay.
    /// @param account The account to rebase.
    function rebase(address account) external;

    /// @notice Wrap underlying ERC-20 tokens into DemurrageTokens.
    /// @param amount Amount of underlying tokens to wrap.
    function wrap(uint256 amount) external;

    /// @notice Unwrap DemurrageTokens back to underlying ERC-20 (at current decayed value).
    /// @param amount Amount of DemurrageTokens to unwrap.
    function unwrap(uint256 amount) external;
}
