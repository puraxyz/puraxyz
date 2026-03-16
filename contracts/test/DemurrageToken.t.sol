// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { DemurrageToken } from "../src/DemurrageToken.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract DemurrageTokenTest is Test {
    DemurrageToken public dToken;
    MockERC20 public underlying;

    address owner = address(0xA);
    address alice = address(0x1);
    address bob = address(0x2);
    address treasury = address(0x7EA);

    // ~5% annual ≈ 1_585_489_599 in per-second 1e18 scale
    uint256 constant DECAY_RATE = 1_585_489_599;

    function setUp() public {
        underlying = new MockERC20("Underlying", "UND");
        dToken = new DemurrageToken("Demurrage Token", "dUND", address(underlying), DECAY_RATE, treasury, owner);

        // Fund alice and bob
        underlying.mint(alice, 10_000e18);
        underlying.mint(bob, 10_000e18);

        vm.prank(alice);
        underlying.approve(address(dToken), type(uint256).max);
        vm.prank(bob);
        underlying.approve(address(dToken), type(uint256).max);
    }

    // ──────────────────── Wrap / Unwrap ────────────────────

    function test_wrap() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        assertEq(dToken.balanceOf(alice), 1000e18);
        assertEq(underlying.balanceOf(alice), 9000e18);
        assertEq(underlying.balanceOf(address(dToken)), 1000e18);
    }

    function test_unwrap() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.prank(alice);
        dToken.unwrap(500e18);

        assertEq(dToken.balanceOf(alice), 500e18);
        assertEq(underlying.balanceOf(alice), 9500e18);
    }

    function test_wrap_revert_zero() public {
        vm.expectRevert(DemurrageToken.ZeroAmount.selector);
        vm.prank(alice);
        dToken.wrap(0);
    }

    function test_unwrap_revert_zero() public {
        vm.expectRevert(DemurrageToken.ZeroAmount.selector);
        vm.prank(alice);
        dToken.unwrap(0);
    }

    // ──────────────────── Decay ────────────────────

    function test_decay_reduces_balance() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        // Advance 1 year
        vm.warp(block.timestamp + 365 days);

        uint256 bal = dToken.balanceOf(alice);
        // ~5% decay over 1 year: balance should be ~950e18
        assertLt(bal, 1000e18);
        assertGt(bal, 900e18); // not more than 10% given linear approximation
    }

    function test_decay_credits_treasury() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.warp(block.timestamp + 365 days);

        // Trigger rebase
        dToken.rebase(alice);

        uint256 treasuryBal = dToken.balanceOf(treasury);
        assertGt(treasuryBal, 0);
    }

    function test_decay_exempt_no_decay() public {
        vm.prank(owner);
        dToken.setDecayExempt(alice, true);

        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.warp(block.timestamp + 365 days);

        assertEq(dToken.balanceOf(alice), 1000e18);
    }

    function test_decay_not_applied_on_zero_elapsed() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        // No time passed, no decay
        assertEq(dToken.balanceOf(alice), 1000e18);
    }

    // ──────────────────── Transfers ────────────────────

    function test_transfer() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.prank(alice);
        dToken.transfer(bob, 400e18);

        assertEq(dToken.balanceOf(alice), 600e18);
        assertEq(dToken.balanceOf(bob), 400e18);
    }

    function test_transfer_rebases_both() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.warp(block.timestamp + 30 days);

        uint256 aliceBalBefore = dToken.balanceOf(alice);

        vm.prank(alice);
        dToken.transfer(bob, 100e18);

        // Alice should have decayed balance minus 100
        assertLt(dToken.balanceOf(alice), aliceBalBefore - 100e18 + 1e18);
    }

    function test_transferFrom_with_approval() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.prank(alice);
        dToken.approve(bob, 500e18);

        vm.prank(bob);
        dToken.transferFrom(alice, bob, 300e18);

        assertEq(dToken.balanceOf(bob), 300e18);
        assertEq(dToken.allowance(alice, bob), 200e18);
    }

    // ──────────────────── Admin ────────────────────

    function test_setDecayRate() public {
        uint256 newRate = 3e9;
        vm.prank(owner);
        dToken.setDecayRate(newRate);
        assertEq(dToken.decayRate(), newRate);
    }

    function test_setDecayRate_revert_exceeds_max() public {
        vm.expectRevert(DemurrageToken.ExceedsMaxDecayRate.selector);
        vm.prank(owner);
        dToken.setDecayRate(8e9); // > MAX_DECAY_RATE
    }

    function test_setDecayRecipient() public {
        address newRecipient = address(0xBEEF);
        vm.prank(owner);
        dToken.setDecayRecipient(newRecipient);
        assertEq(dToken.decayRecipient(), newRecipient);
    }

    function test_setDecayRecipient_revert_zero() public {
        vm.expectRevert(DemurrageToken.ZeroRecipient.selector);
        vm.prank(owner);
        dToken.setDecayRecipient(address(0));
    }

    // ──────────────────── View Functions ────────────────────

    function test_nominalVsReal() public {
        vm.prank(alice);
        dToken.wrap(1000e18);

        vm.warp(block.timestamp + 365 days);

        uint256 nominal = dToken.nominalBalanceOf(alice);
        uint256 real = dToken.realBalanceOf(alice);

        // Before rebase, nominal is stored, real is computed
        assertEq(nominal, 1000e18);
        assertLt(real, 1000e18);
    }
}
