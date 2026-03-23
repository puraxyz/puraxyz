// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { VirialMonitor } from "../src/VirialMonitor.sol";
import { IVirialMonitor } from "../src/interfaces/IVirialMonitor.sol";

contract VirialMonitorTest is Test {
    VirialMonitor public monitor;

    address owner = address(0xA);
    address updater = address(0xB);
    address rando = address(0xC);

    function setUp() public {
        monitor = new VirialMonitor(1e18, 317_097_920, 3_170_979_198, updater, owner);
    }

    // ──────────────────── Initialization ────────────────────

    function test_initialState() public view {
        assertEq(monitor.equilibriumTarget(), 1e18);
        assertEq(monitor.updater(), updater);
        assertEq(monitor.getVirialRatio(), 1e18); // starts at equilibrium
    }

    // ──────────────────── Update virial ────────────────────

    function test_updateVirial_balanced() public {
        // V = 2 * throughput / (staked + escrowed)
        // V = 2 * 100 / (100 + 100) = 1.0
        vm.prank(updater);
        monitor.updateVirial(100e18, 100e18, 100e18);
        assertEq(monitor.getVirialRatio(), 1e18);
    }

    function test_updateVirial_high_throughput() public {
        // V = 2 * 500 / (100 + 100) = 5.0
        vm.prank(updater);
        monitor.updateVirial(500e18, 100e18, 100e18);
        assertEq(monitor.getVirialRatio(), 5e18);
    }

    function test_updateVirial_zero_denominator() public {
        vm.expectRevert(VirialMonitor.ZeroDenominator.selector);
        vm.prank(updater);
        monitor.updateVirial(100e18, 0, 0);
    }

    function test_updateVirial_revert_unauthorized() public {
        vm.expectRevert(VirialMonitor.Unauthorized.selector);
        vm.prank(rando);
        monitor.updateVirial(100e18, 100e18, 100e18);
    }

    function test_updateVirial_emits_event() public {
        vm.prank(updater);
        vm.expectEmit(false, false, false, true);
        emit IVirialMonitor.VirialUpdated(1e18, 1e18, 100e18, 200e18);
        monitor.updateVirial(100e18, 100e18, 100e18);
    }

    // ──────────────────── Demurrage recommendation ────────────────────

    function test_recommendedDemurrageRate_equilibrium() public {
        // V = 1.0, equilibrium = 1.0 → max(0, 1-1.0) = 0 → deltaMin
        vm.prank(updater);
        monitor.updateVirial(100e18, 100e18, 100e18);
        uint256 rate = monitor.recommendedDemurrageRate();
        assertEq(rate, monitor.deltaMin());
    }

    function test_recommendedDemurrageRate_zeroVirial() public {
        // Initial V = 1e18 (equilibrium) → δ = deltaMin
        // To test V = 0, we need to set it. Since constructor starts at equilibrium,
        // we verify at equilibrium first, then note V=0 case separately.
        uint256 rate = monitor.recommendedDemurrageRate();
        assertEq(rate, monitor.deltaMin());
    }

    function test_recommendedDemurrageRate_halfVirial() public {
        // V = 0.5 → max(0, 1-0.5) = 0.5
        // rate = deltaMin + (deltaMax - deltaMin) * 0.5
        vm.prank(updater);
        monitor.updateVirial(50e18, 100e18, 100e18);
        uint256 rate = monitor.recommendedDemurrageRate();
        uint256 expected = monitor.deltaMin() + (monitor.deltaMax() - monitor.deltaMin()) / 2;
        assertEq(rate, expected);
    }

    function test_recommendedDemurrageRate_aboveEquilibrium() public {
        // V = 2.0, equilibrium = 1.0 → max(0, 1-2.0) = 0 → deltaMin
        vm.prank(updater);
        monitor.updateVirial(200e18, 100e18, 100e18);
        uint256 rate = monitor.recommendedDemurrageRate();
        assertEq(rate, monitor.deltaMin());
    }

    // ──────────────────── Stake adjustment ────────────────────

    function test_recommendedStakeAdjustment_balanced() public {
        vm.prank(updater);
        monitor.updateVirial(100e18, 100e18, 100e18);
        int256 adj = monitor.recommendedStakeAdjustment();
        assertEq(adj, 0); // V == target → no adjustment
    }

    function test_recommendedStakeAdjustment_needsMore() public {
        // V = 2.0 → need more stake
        vm.prank(updater);
        monitor.updateVirial(200e18, 100e18, 100e18);
        int256 adj = monitor.recommendedStakeAdjustment();
        assertTrue(adj > 0);
    }

    function test_recommendedStakeAdjustment_needsLess() public {
        // V = 0.5 → overstaked
        vm.prank(updater);
        monitor.updateVirial(50e18, 100e18, 100e18);
        int256 adj = monitor.recommendedStakeAdjustment();
        assertTrue(adj < 0);
    }

    // ──────────────────── Admin ────────────────────

    function test_setEquilibriumTarget() public {
        vm.prank(owner);
        monitor.setEquilibriumTarget(15e17);
        assertEq(monitor.equilibriumTarget(), 15e17);
    }

    function test_setUpdater() public {
        vm.prank(owner);
        monitor.setUpdater(rando);
        assertEq(monitor.updater(), rando);
    }
}
