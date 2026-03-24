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

/// @notice Minimal ERC20 for staking; deployer receives initial supply.
contract BPEToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("BPE Stake Token", "BPE") {
        _mint(msg.sender, initialSupply);
    }
}

/// @title DeployMainnet
/// @notice Deploys 12 core + demurrage + relay contracts to Base mainnet.
///         Uses real USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) instead of TestUSDC.
///
///         forge script script/DeployMainnet.s.sol \
///           --rpc-url base_mainnet \
///           --private-key $DEPLOYER_PRIVATE_KEY \
///           --broadcast --verify \
///           --etherscan-api-key $BASESCAN_API_KEY
contract DeployMainnet is Script {
    // ─── Base mainnet Superfluid addresses ───
    address constant GDA_V1 = 0xfE6c87BE05feDB2059d2EC41bA0A09826C9FD7aa;
    address constant SUPER_TOKEN_FACTORY = 0xe20B9a38E0c96F61d1bA6b42a61512D56Fea1Eb3;

    // ─── Base mainnet USDC ───
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // ─── Deploy parameters ───
    uint256 constant INITIAL_SUPPLY = 1_000_000e18;
    uint256 constant STAKE_UNIT = 1e18;
    uint256 constant MIN_SINK_STAKE = 100e18;
    uint256 constant DECAY_RATE = 1_585_489_599; // ~5% annual decay

    function run() external {
        require(block.chainid == 8453, "DeployMainnet: must run on Base mainnet (8453)");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("USDC:", USDC);

        vm.startBroadcast(deployerKey);

        (BPEToken stakeToken, StakeManager stakeManager, CapacityRegistry registry) =
            _deployCore(deployer);

        _deployDemurrage(deployer, address(stakeToken));
        _deployRelay(deployer, address(registry), address(stakeManager));

        vm.stopBroadcast();

        console.log("");
        console.log("--- Mainnet Deployment Complete ---");
        console.log("Copy addresses above to contracts/deployments/base-mainnet.json");
        console.log("Then update sdk/src/addresses.ts chain 8453 entries");
    }

    function _deployCore(address deployer)
        internal
        returns (BPEToken stakeToken, StakeManager stakeManager, CapacityRegistry registry)
    {
        // 1. Stake token
        stakeToken = new BPEToken(INITIAL_SUPPLY);
        console.log("BPEToken:", address(stakeToken));

        // 2. StakeManager
        stakeManager = new StakeManager(
            address(stakeToken), STAKE_UNIT, MIN_SINK_STAKE, deployer
        );
        console.log("StakeManager:", address(stakeManager));

        // 3. CapacityRegistry
        registry = new CapacityRegistry(address(stakeManager));
        console.log("CapacityRegistry:", address(registry));

        // 4. SuperToken wrapper for BPE
        ISuperTokenFactory factory = ISuperTokenFactory(SUPER_TOKEN_FACTORY);
        ISuperToken bpeSuperToken = factory.createERC20Wrapper(
            IERC20Metadata(address(stakeToken)),
            ISuperTokenFactory.Upgradability.SEMI_UPGRADABLE,
            "Super BPE Token",
            "BPEx"
        );
        console.log("SuperToken (BPEx):", address(bpeSuperToken));

        // 5. Payment SuperToken (USDCx)
        ISuperToken paymentSuperToken;
        {
            address existingWrapper = factory.getCanonicalERC20Wrapper(USDC);
            if (existingWrapper != address(0)) {
                paymentSuperToken = ISuperToken(existingWrapper);
                console.log("USDCx (existing):", existingWrapper);
            } else {
                paymentSuperToken = factory.createERC20Wrapper(
                    IERC20Metadata(USDC),
                    ISuperTokenFactory.Upgradability.SEMI_UPGRADABLE,
                    "Super USD Coin",
                    "USDCx"
                );
                console.log("USDCx (created):", address(paymentSuperToken));
            }
        }

        // 6. BackpressurePool
        BackpressurePool bpPool = new BackpressurePool(
            GDA_V1, address(paymentSuperToken), address(registry), deployer
        );
        console.log("BackpressurePool:", address(bpPool));

        // 7. EscrowBuffer
        EscrowBuffer buffer = new EscrowBuffer(
            USDC, address(registry), deployer
        );
        console.log("EscrowBuffer:", address(buffer));

        // 8. Pipeline
        Pipeline pipeline = new Pipeline(
            address(bpPool), address(registry), deployer
        );
        console.log("Pipeline:", address(pipeline));

        // 9. PricingCurve
        PricingCurve pricing = new PricingCurve(address(registry));
        console.log("PricingCurve:", address(pricing));

        // 10. CompletionTracker
        CompletionTracker tracker = new CompletionTracker(
            address(registry), address(stakeManager)
        );
        console.log("CompletionTracker:", address(tracker));

        // 11. OffchainAggregator
        OffchainAggregator aggregator = new OffchainAggregator(
            address(registry), deployer
        );
        console.log("OffchainAggregator:", address(aggregator));

        // Post-deploy wiring
        registry.setAggregator(address(aggregator));
        stakeManager.setSlasher(address(tracker), true);
    }

    function _deployDemurrage(address deployer, address stakeTokenAddr) internal {
        DemurrageToken demurrageToken = new DemurrageToken(
            "Demurrage BPE", "dBPE", stakeTokenAddr, DECAY_RATE, deployer, deployer
        );
        console.log("DemurrageToken:", address(demurrageToken));

        VelocityMetrics velocityMetrics = new VelocityMetrics(
            address(demurrageToken), deployer
        );
        console.log("VelocityMetrics:", address(velocityMetrics));
    }

    function _deployRelay(
        address deployer,
        address registryAddr,
        address stakeManagerAddr
    ) internal {
        bytes32 relayTaskTypeId = keccak256("NOSTR_RELAY");
        RelayCapacityRegistry relayRegistry = new RelayCapacityRegistry(
            registryAddr, stakeManagerAddr, relayTaskTypeId, deployer
        );
        console.log("RelayCapacityRegistry:", address(relayRegistry));

        // BackpressurePool address not available here, set to zero — can be configured post-deploy
        RelayPaymentPool relayPool = new RelayPaymentPool(
            address(relayRegistry), registryAddr, address(0), deployer
        );
        console.log("RelayPaymentPool:", address(relayPool));
    }
}
