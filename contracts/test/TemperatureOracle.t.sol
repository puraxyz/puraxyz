// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { TemperatureOracle } from "../src/TemperatureOracle.sol";
import { ITemperatureOracle } from "../src/interfaces/ITemperatureOracle.sol";

contract TemperatureOracleTest is Test {
    TemperatureOracle public oracle;

    address owner = address(0xA);
    address updater = address(0xB);
    address rando = address(0xC);

    function setUp() public {
        oracle = new TemperatureOracle(5e17, 5e18, updater, owner);
    }

    // ──────────────────── Initialization ────────────────────

    function test_initialState() public view {
        assertEq(oracle.tauMin(), 5e17);
        assertEq(oracle.tauMax(), 5e18);
        assertEq(oracle.updater(), updater);
        // Initial temperature = tauMin (zero variance)
        assertEq(oracle.getTemperature(), 5e17);
    }

    // ──────────────────── Update temperature ────────────────────

    function test_updateTemperature_zero_variance() public {
        vm.prank(updater);
        oracle.updateTemperature(0, 1e18);
        assertEq(oracle.getTemperature(), 5e17); // tauMin
    }

    function test_updateTemperature_max_variance() public {
        vm.prank(updater);
        oracle.updateTemperature(1e18, 1e18);
        assertEq(oracle.getTemperature(), 5e18); // tauMax
    }

    function test_updateTemperature_half_variance() public {
        vm.prank(updater);
        oracle.updateTemperature(5e17, 1e18);
        // tau = 0.5 + (5.0 - 0.5) * 0.5 = 0.5 + 2.25 = 2.75
        assertEq(oracle.getTemperature(), 275e16);
    }

    function test_updateTemperature_caps_at_max() public {
        vm.prank(updater);
        oracle.updateTemperature(2e18, 1e18); // variance > maxVariance
        assertEq(oracle.getTemperature(), 5e18); // capped at tauMax
    }

    function test_updateTemperature_revert_unauthorized() public {
        vm.expectRevert(TemperatureOracle.Unauthorized.selector);
        vm.prank(rando);
        oracle.updateTemperature(1e18, 1e18);
    }

    function test_updateTemperature_owner_can_update() public {
        vm.prank(owner);
        oracle.updateTemperature(1e18, 1e18);
        assertEq(oracle.getTemperature(), 5e18);
    }

    function test_updateTemperature_emits_event() public {
        vm.prank(updater);
        vm.expectEmit(false, false, false, true);
        emit ITemperatureOracle.TemperatureUpdated(5e17, 275e16, 5e17);
        oracle.updateTemperature(5e17, 1e18);
    }

    // ──────────────────── Boltzmann weight ────────────────────

    function test_boltzmannWeight_zero_capacity() public view {
        uint256 w = oracle.boltzmannWeight(0);
        assertEq(w, 1e18); // weight(0) = 1 + 0/tau = 1.0
    }

    function test_boltzmannWeight_positive() public {
        vm.prank(updater);
        oracle.updateTemperature(0, 1e18); // tau = tauMin = 0.5
        uint256 w = oracle.boltzmannWeight(1e18); // c = 1.0
        // weight = 1 + c/tau = 1 + 1.0/0.5 = 3.0
        assertEq(w, 3e18);
    }

    // ──────────────────── Admin ────────────────────

    function test_setUpdater() public {
        vm.prank(owner);
        oracle.setUpdater(rando);
        assertEq(oracle.updater(), rando);
    }

    function test_setUpdater_revert_notOwner() public {
        vm.expectRevert();
        vm.prank(rando);
        oracle.setUpdater(rando);
    }
}
