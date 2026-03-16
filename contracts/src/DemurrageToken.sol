// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IDemurrageToken } from "./interfaces/IDemurrageToken.sol";

/// @title DemurrageToken
/// @notice ERC-20 token with continuous balance decay on idle holdings.
///         Completes the stock-side velocity incentive that BPE's flow-side allocation lacks.
///
///         Core mechanic: realBalance(t) = nominal × e^(-λ × (t - t_last))
///
///         Key design: Streaming balances (locked in external CFA/GDA agreements) should be
///         exempt from decay by staking into this contract or using the exempt mechanism.
///         Only idle holdings decay. Decay proceeds recycle to a configurable recipient.
///
///         Approximation: Uses first-order linear decay per interval for gas efficiency:
///         decay = nominal × λ × Δt / 1e18 (valid when λ×Δt << 1, i.e., short intervals).
contract DemurrageToken is IDemurrageToken, IERC20, Ownable {
    using SafeERC20 for IERC20;

    // ──────────────────── Constants ────────────────────

    uint256 public constant PRECISION = 1e18;

    /// @notice Maximum decay rate: ~20% annual ≈ 6.34e-9/sec ≈ 6_342_000_000 in 1e18 scale.
    uint256 public constant MAX_DECAY_RATE = 7e9;

    // ──────────────────── Storage ────────────────────

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    IERC20 public immutable UNDERLYING;

    /// @notice Per-second decay rate (18-decimal fixed point). 5% annual ≈ 1_585_489_599.
    uint256 public _decayRate;

    /// @notice Address receiving decay proceeds.
    address public _decayRecipient;

    /// @notice Total decay collected since deployment.
    uint256 public _totalDecayed;

    /// @notice Total nominal supply (before decay adjustments).
    uint256 public _totalNominalSupply;

    struct AccountState {
        uint256 nominal;    // Stored nominal balance
        uint256 lastUpdate; // Timestamp of last rebase
    }

    mapping(address => AccountState) internal _accounts;
    mapping(address => mapping(address => uint256)) internal _allowances;

    /// @notice Addresses exempt from decay (e.g., staking contracts, pools).
    mapping(address => bool) public decayExempt;

    // ──────────────────── Errors ────────────────────

    error ZeroAmount();
    error ExceedsMaxDecayRate();
    error ZeroRecipient();
    error InsufficientBalance(uint256 required, uint256 available);
    error InsufficientAllowance(uint256 required, uint256 available);

    // ──────────────────── Constructor ────────────────────

    constructor(
        string memory name_,
        string memory symbol_,
        address underlying_,
        uint256 decayRate_,
        address decayRecipient_,
        address owner_
    ) Ownable(owner_) {
        name = name_;
        symbol = symbol_;
        UNDERLYING = IERC20(underlying_);
        if (decayRate_ > MAX_DECAY_RATE) revert ExceedsMaxDecayRate();
        _decayRate = decayRate_;
        _decayRecipient = decayRecipient_;
    }

    // ──────────────────── Admin ────────────────────

    /// @inheritdoc IDemurrageToken
    function setDecayRate(uint256 lambda_) external onlyOwner {
        if (lambda_ > MAX_DECAY_RATE) revert ExceedsMaxDecayRate();
        uint256 old = _decayRate;
        _decayRate = lambda_;
        emit DecayRateUpdated(old, lambda_);
    }

    /// @inheritdoc IDemurrageToken
    function setDecayRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroRecipient();
        address old = _decayRecipient;
        _decayRecipient = recipient;
        emit DecayRecipientUpdated(old, recipient);
    }

    /// @notice Set an address as exempt from decay (e.g., staking, pool contracts).
    function setDecayExempt(address account, bool exempt) external onlyOwner {
        decayExempt[account] = exempt;
    }

    // ──────────────────── Wrap / Unwrap ────────────────────

    /// @inheritdoc IDemurrageToken
    function wrap(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        UNDERLYING.safeTransferFrom(msg.sender, address(this), amount);
        _rebase(msg.sender);
        _accounts[msg.sender].nominal += amount;
        _totalNominalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    /// @inheritdoc IDemurrageToken
    function unwrap(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        _rebase(msg.sender);
        uint256 real = _accounts[msg.sender].nominal;
        if (amount > real) revert InsufficientBalance(amount, real);
        unchecked {
            _accounts[msg.sender].nominal = real - amount;
        }
        _totalNominalSupply -= amount;
        UNDERLYING.safeTransfer(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    // ──────────────────── Rebase ────────────────────

    /// @inheritdoc IDemurrageToken
    function rebase(address account) external {
        _rebase(account);
    }

    function _rebase(address account) internal {
        AccountState storage acc = _accounts[account];
        if (acc.lastUpdate == 0) {
            acc.lastUpdate = block.timestamp;
            return;
        }
        if (decayExempt[account]) {
            acc.lastUpdate = block.timestamp;
            return;
        }
        uint256 elapsed = block.timestamp - acc.lastUpdate;
        if (elapsed == 0 || acc.nominal == 0) {
            acc.lastUpdate = block.timestamp;
            return;
        }

        // Linear approximation of exponential decay: decay = nominal × λ × Δt / 1e18
        // Valid when λ×Δt << 1 (for 5% annual rate with hourly rebases: λ×Δt ≈ 5.7e-6)
        uint256 decayAmount = (acc.nominal * _decayRate * elapsed) / PRECISION;

        // Cap decay at current balance
        if (decayAmount > acc.nominal) {
            decayAmount = acc.nominal;
        }

        if (decayAmount > 0) {
            unchecked {
                acc.nominal -= decayAmount;
            }
            _totalNominalSupply -= decayAmount;
            _totalDecayed += decayAmount;

            // Credit decay to recipient
            if (_decayRecipient != address(0)) {
                _accounts[_decayRecipient].nominal += decayAmount;
                _totalNominalSupply += decayAmount;
            }

            emit Rebased(account, decayAmount, acc.nominal);
        }
        acc.lastUpdate = block.timestamp;
    }

    // ──────────────────── ERC-20 Implementation ────────────────────

    function totalSupply() external view returns (uint256) {
        return _totalNominalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _realBalance(account);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _rebase(msg.sender);
        _rebase(to);
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance(amount, currentAllowance);
            unchecked {
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
        }
        _rebase(from);
        _rebase(to);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 fromBal = _accounts[from].nominal;
        if (fromBal < amount) revert InsufficientBalance(amount, fromBal);
        unchecked {
            _accounts[from].nominal = fromBal - amount;
        }
        _accounts[to].nominal += amount;
        emit Transfer(from, to, amount);
    }

    // ──────────────────── IDemurrageToken Reads ────────────────────

    /// @inheritdoc IDemurrageToken
    function realBalanceOf(address account) external view returns (uint256) {
        return _realBalance(account);
    }

    /// @inheritdoc IDemurrageToken
    function nominalBalanceOf(address account) external view returns (uint256) {
        return _accounts[account].nominal;
    }

    /// @inheritdoc IDemurrageToken
    function decayRate() external view returns (uint256) {
        return _decayRate;
    }

    /// @inheritdoc IDemurrageToken
    function decayRecipient() external view returns (address) {
        return _decayRecipient;
    }

    /// @inheritdoc IDemurrageToken
    function lastUpdateTime(address account) external view returns (uint256) {
        return _accounts[account].lastUpdate;
    }

    /// @inheritdoc IDemurrageToken
    function totalDecayed() external view returns (uint256) {
        return _totalDecayed;
    }

    // ──────────────────── Internal Reads ────────────────────

    /// @dev Compute decay-adjusted balance without modifying state.
    function _realBalance(address account) internal view returns (uint256) {
        AccountState storage acc = _accounts[account];
        if (acc.lastUpdate == 0 || decayExempt[account] || acc.nominal == 0) {
            return acc.nominal;
        }
        uint256 elapsed = block.timestamp - acc.lastUpdate;
        if (elapsed == 0) return acc.nominal;

        uint256 decayAmount = (acc.nominal * _decayRate * elapsed) / PRECISION;
        if (decayAmount > acc.nominal) return 0;
        return acc.nominal - decayAmount;
    }
}
