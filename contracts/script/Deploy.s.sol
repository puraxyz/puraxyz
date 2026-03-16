// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    ISuperTokenFactory
} from "@superfluid-finance/contracts/interfaces/superfluid/ISuperTokenFactory.sol";
import { ISuperToken } from "@superfluid-finance/contracts/interfaces/superfluid/ISuperToken.sol";

import { StakeManager } from "../src/StakeManager.sol";
import { CapacityRegistry } from "../src/CapacityRegistry.sol";
import { BackpressurePool } from "../src/BackpressurePool.sol";
import { EscrowBuffer } from "../src/EscrowBuffer.sol";
import { Pipeline } from "../src/Pipeline.sol";
import { PricingCurve } from "../src/PricingCurve.sol";
import { CompletionTracker } from "../src/CompletionTracker.sol";
import { OffchainAggregator } from "../src/OffchainAggregator.sol";
import { DemurrageToken } from "../src/DemurrageToken.sol";
import { VelocityMetrics } from "../src/VelocityMetrics.sol";
import { RelayCapacityRegistry } from "../src/nostr/RelayCapacityRegistry.sol";
import { RelayPaymentPool } from "../src/nostr/RelayPaymentPool.sol";
import { LightningCapacityOracle } from "../src/lightning/LightningCapacityOracle.sol";
import { LightningRoutingPool } from "../src/lightning/LightningRoutingPool.sol";
import { CrossProtocolRouter } from "../src/lightning/CrossProtocolRouter.sol";
import { UniversalCapacityAdapter } from "../src/UniversalCapacityAdapter.sol";
import { ReputationLedger } from "../src/ReputationLedger.sol";

/// @notice Minimal ERC20 for staking; deployer receives initial supply.
contract BPEToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("BPE Stake Token", "BPE") {
        _mint(msg.sender, initialSupply);
    }
}

/// @notice Testnet USDC stand-in (6 decimals); deployer receives initial supply.
contract TestUSDC is ERC20 {
    constructor(uint256 initialSupply) ERC20("USD Coin (Test)", "tUSDC") {
        _mint(msg.sender, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @title Deploy
/// @notice Full-stack BPE deployment on Base Sepolia.
///         Usage: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
contract Deploy is Script {
    // ─── Base Sepolia Superfluid addresses ───
    address constant GDA_V1 = 0x53F4f44C813Dc380182d0b2b67fe5832A12B97f8;
    address constant SUPER_TOKEN_FACTORY = 0x7447E94Dfe3d804a9f46Bf12838d467c912C8F6C;

    // ─── Deploy parameters ───
    uint256 constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 constant STAKE_UNIT = 1e18;
    uint256 constant MIN_SINK_STAKE = 100e18;
    uint256 constant USDC_SUPPLY = 1_000_000e6; // 1M tUSDC (6 decimals)
    uint256 constant DECAY_RATE = 1_585_489_599; // ~5% annual decay

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Stake token
        BPEToken stakeToken = new BPEToken(INITIAL_SUPPLY);
        console.log("BPEToken:", address(stakeToken));

        // 2. StakeManager
        StakeManager stakeManager = new StakeManager(
            address(stakeToken), STAKE_UNIT, MIN_SINK_STAKE, deployer
        );
        console.log("StakeManager:", address(stakeManager));

        // 3. CapacityRegistry
        CapacityRegistry registry = new CapacityRegistry(address(stakeManager));
        console.log("CapacityRegistry:", address(registry));

        // 4. SuperToken wrapper for BPE (used for staking rewards if needed)
        ISuperTokenFactory factory = ISuperTokenFactory(SUPER_TOKEN_FACTORY);
        ISuperToken bpeSuperToken = factory.createERC20Wrapper(
            IERC20Metadata(address(stakeToken)),
            ISuperTokenFactory.Upgradability.SEMI_UPGRADABLE,
            "Super BPE Token",
            "BPEx"
        );
        console.log("SuperToken (BPEx):", address(bpeSuperToken));

        // 5. Payment token (TestUSDC) + SuperToken wrapper
        TestUSDC paymentToken = new TestUSDC(USDC_SUPPLY);
        console.log("TestUSDC:", address(paymentToken));

        ISuperToken paymentSuperToken = factory.createERC20Wrapper(
            IERC20Metadata(address(paymentToken)),
            ISuperTokenFactory.Upgradability.SEMI_UPGRADABLE,
            "Super USD Coin (Test)",
            "tUSDCx"
        );
        console.log("SuperToken (tUSDCx):", address(paymentSuperToken));

        // 6. BackpressurePool - uses tUSDCx as the streaming payment token
        BackpressurePool pool = new BackpressurePool(
            GDA_V1, address(paymentSuperToken), address(registry), deployer
        );
        console.log("BackpressurePool:", address(pool));

        // 7. EscrowBuffer
        EscrowBuffer buffer = new EscrowBuffer(
            address(paymentToken), address(registry), deployer
        );
        console.log("EscrowBuffer:", address(buffer));

        // 8. Pipeline
        Pipeline pipeline = new Pipeline(
            address(pool), address(registry), deployer
        );
        console.log("Pipeline:", address(pipeline));

        // 9. PricingCurve - dynamic queue-length pricing
        PricingCurve pricing = new PricingCurve(address(registry));
        console.log("PricingCurve:", address(pricing));

        // 10. CompletionTracker - statistical capacity verification
        CompletionTracker tracker = new CompletionTracker(
            address(registry), address(stakeManager)
        );
        console.log("CompletionTracker:", address(tracker));

        // 11. OffchainAggregator - batch off-chain signal verification
        OffchainAggregator aggregator = new OffchainAggregator(
            address(registry), deployer
        );
        console.log("OffchainAggregator:", address(aggregator));

        // ─── Post-deploy configuration ───
        // Authorize the aggregator to update capacity in the registry
        registry.setAggregator(address(aggregator));
        // Authorize the completion tracker to slash underperforming sinks
        stakeManager.setSlasher(address(tracker), true);

        // ─── Phase A: Demurrage Layer ───
        _deployBackproto(deployer, address(stakeToken), address(registry), address(stakeManager), address(pool), address(pricing));

        vm.stopBroadcast();

        // ─── Output deployment JSON (copy to deployments/base-sepolia.json) ───
        console.log("");
        console.log("--- Deployment Addresses (JSON) ---");
        console.log("See console logs above for all addresses.");
        console.log("--- Deployment Complete ---");
    }

    function _deployBackproto(
        address deployer,
        address stakeToken_,
        address registry_,
        address stakeManager_,
        address pool_,
        address pricing_
    ) internal {
        // Phase A: Demurrage
        DemurrageToken demurrageToken = new DemurrageToken(
            "Demurrage BPE", "dBPE", stakeToken_, DECAY_RATE, deployer, deployer
        );
        console.log("DemurrageToken:", address(demurrageToken));

        VelocityMetrics velocityMetrics = new VelocityMetrics(
            address(demurrageToken), deployer
        );
        console.log("VelocityMetrics:", address(velocityMetrics));

        // Phase B: Nostr
        bytes32 relayTaskTypeId = keccak256("NOSTR_RELAY");
        RelayCapacityRegistry relayRegistry = new RelayCapacityRegistry(
            registry_, stakeManager_, relayTaskTypeId, deployer
        );
        console.log("RelayCapacityRegistry:", address(relayRegistry));

        RelayPaymentPool relayPool = new RelayPaymentPool(
            address(relayRegistry), registry_, pool_, deployer
        );
        console.log("RelayPaymentPool:", address(relayPool));

        // Phase C: Lightning
        _deployLightningAndPlatform(deployer, registry_, stakeManager_, pool_, pricing_);
    }

    function _deployLightningAndPlatform(
        address deployer,
        address registry_,
        address stakeManager_,
        address pool_,
        address pricing_
    ) internal {
        bytes32 lightningTaskTypeId = keccak256("LIGHTNING_ROUTING");
        LightningCapacityOracle lightningOracle = new LightningCapacityOracle(
            registry_, stakeManager_, lightningTaskTypeId, deployer
        );
        console.log("LightningCapacityOracle:", address(lightningOracle));

        LightningRoutingPool lightningPool = new LightningRoutingPool(
            pool_, registry_, address(lightningOracle), pricing_, lightningTaskTypeId, deployer
        );
        console.log("LightningRoutingPool:", address(lightningPool));

        CrossProtocolRouter router = new CrossProtocolRouter(deployer);
        console.log("CrossProtocolRouter:", address(router));

        // Phase D: Platform Unification
        UniversalCapacityAdapter adapter = new UniversalCapacityAdapter(
            registry_, stakeManager_, deployer
        );
        console.log("UniversalCapacityAdapter:", address(adapter));

        ReputationLedger reputation = new ReputationLedger(deployer);
        console.log("ReputationLedger:", address(reputation));
    }
}
