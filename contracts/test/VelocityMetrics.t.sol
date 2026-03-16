// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { VelocityMetrics } from "../src/VelocityMetrics.sol";

contract VelocityMetricsTest is Test {
    VelocityMetrics public metrics;

    address owner = address(0xA);
    address recorder = address(0xBB);
    address alice = address(0x1);
    address bob = address(0x2);

    function setUp() public {
        metrics = new VelocityMetrics(recorder, owner);
    }

    // ──────────────────── Recording ────────────────────

    function test_recordOutflow() public {
        vm.prank(recorder);
        metrics.recordOutflow(alice, 100e18);

        // Within same epoch, metrics accumulate
        vm.prank(recorder);
        metrics.recordOutflow(alice, 50e18);

        // Check network outflow
        assertEq(metrics._networkOutflow(), 150e18);
    }

    function test_recordOutflow_revert_unauthorized() public {
        vm.expectRevert(VelocityMetrics.NotAuthorizedRecorder.selector);
        vm.prank(alice);
        metrics.recordOutflow(alice, 100e18);
    }

    function test_snapshotBalance() public {
        vm.prank(recorder);
        metrics.snapshotBalance(alice, 1000e18);

        assertEq(metrics._networkSnapshotCount(), 1);
    }

    // ──────────────────── Epoch Advancement ────────────────────

    function test_advanceEpoch() public {
        // Record some activity
        vm.prank(recorder);
        metrics.recordOutflow(alice, 100e18);

        vm.prank(recorder);
        metrics.snapshotBalance(alice, 1000e18);

        // Advance time past epoch
        vm.warp(block.timestamp + 3601);

        metrics.advanceEpoch();

        // Network velocity should be computed
        uint256 velocity = metrics._lastNetworkVelocity();
        assertGt(velocity, 0);
    }

    function test_advanceEpoch_revert_not_elapsed() public {
        vm.expectRevert(VelocityMetrics.EpochNotElapsed.selector);
        metrics.advanceEpoch();
    }

    function test_advanceEpoch_resets_counters() public {
        vm.prank(recorder);
        metrics.recordOutflow(alice, 100e18);

        vm.warp(block.timestamp + 3601);
        metrics.advanceEpoch();

        // Counters should be reset
        assertEq(metrics._networkOutflow(), 0);
        assertEq(metrics._networkSnapshotCount(), 0);
    }

    // ──────────────────── Turnover Rate ────────────────────

    function test_turnoverRate_zero_balance() public {
        vm.prank(recorder);
        metrics.recordOutflow(alice, 100e18);
        // No balance snapshot → avg balance = 0

        vm.warp(block.timestamp + 3601);
        metrics.advanceEpoch();

        // Velocity should be 0 when no snapshots
        // (division by zero protection)
        assertEq(metrics._lastNetworkVelocity(), 0);
    }

    function test_multiple_accounts_tracked() public {
        vm.startPrank(recorder);
        metrics.recordOutflow(alice, 100e18);
        metrics.recordOutflow(bob, 200e18);
        metrics.snapshotBalance(alice, 1000e18);
        metrics.snapshotBalance(bob, 2000e18);
        vm.stopPrank();

        assertEq(metrics._networkOutflow(), 300e18);
        assertEq(metrics._networkSnapshotCount(), 2);
    }

    // ──────────────────── Admin ────────────────────

    function test_setAuthorizedRecorder() public {
        address newRecorder = address(0xCC);
        vm.prank(owner);
        metrics.setAuthorizedRecorder(newRecorder);
        assertEq(metrics.authorizedRecorder(), newRecorder);
    }
}
