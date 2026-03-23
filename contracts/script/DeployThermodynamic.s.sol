// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import { TemperatureOracle } from "../src/TemperatureOracle.sol";
import { VirialMonitor } from "../src/VirialMonitor.sol";
import { SystemStateEmitter } from "../src/SystemStateEmitter.sol";

/// @title DeployThermodynamic
/// @notice Deploy the three new thermodynamic contracts and wire them to existing infrastructure.
///         Usage: forge script script/DeployThermodynamic.s.sol --rpc-url base_sepolia --broadcast
contract DeployThermodynamic is Script {
    function _wire(address target, string memory sig, address arg) internal {
        (bool ok,) = target.call(abi.encodeWithSignature(sig, arg));
        require(ok, string.concat("Failed: ", sig));
    }

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address escrowBuffer = vm.envAddress("ESCROW_BUFFER");
        address offchainAggregator = vm.envAddress("OFFCHAIN_AGGREGATOR");
        address backpressurePool = vm.envAddress("BACKPRESSURE_POOL");
        address demurrageToken = vm.envAddress("DEMURRAGE_TOKEN");
        address pricingCurve = vm.envAddress("PRICING_CURVE");
        address pipeline = vm.envAddress("PIPELINE");

        vm.startBroadcast(deployerKey);

        TemperatureOracle tempOracle = new TemperatureOracle(5e17, 5e18, offchainAggregator, deployer);
        console.log("TemperatureOracle:", address(tempOracle));

        VirialMonitor virialMon = new VirialMonitor(1e18, 317_097_920, 3_170_979_198, offchainAggregator, deployer);
        console.log("VirialMonitor:", address(virialMon));

        SystemStateEmitter stateEmitter = new SystemStateEmitter(address(tempOracle), address(virialMon), escrowBuffer);
        console.log("SystemStateEmitter:", address(stateEmitter));

        // Wire refs
        _wire(offchainAggregator, "setTemperatureOracle(address)", address(tempOracle));
        _wire(offchainAggregator, "setVirialMonitor(address)", address(virialMon));
        _wire(offchainAggregator, "setBackpressurePool(address)", backpressurePool);
        _wire(backpressurePool, "setTemperatureOracle(address)", address(tempOracle));
        _wire(backpressurePool, "setShareSubmitter(address)", offchainAggregator);
        _wire(pricingCurve, "setTemperatureOracle(address)", address(tempOracle));
        _wire(pricingCurve, "setEscrowBuffer(address)", escrowBuffer);
        _wire(demurrageToken, "setVirialMonitor(address)", address(virialMon));
        _wire(pipeline, "setEscrowBuffer(address)", escrowBuffer);

        vm.stopBroadcast();
        console.log("--- Thermodynamic deployment complete ---");
    }
}
