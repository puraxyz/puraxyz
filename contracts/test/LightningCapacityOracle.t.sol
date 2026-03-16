// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { LightningCapacityOracle } from "../src/lightning/LightningCapacityOracle.sol";
import { ILightningCapacityOracle } from "../src/interfaces/ILightningCapacityOracle.sol";
import { StakeManager } from "../src/StakeManager.sol";
import { CapacityRegistry } from "../src/CapacityRegistry.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract LightningCapacityOracleTest is Test {
    LightningCapacityOracle public oracle;
    StakeManager public stakeManager;
    CapacityRegistry public registry;
    MockERC20 public token;

    address owner = address(0xA);
    uint256 operatorKey1 = 0x1111;
    address operator1;
    uint256 operatorKey2 = 0x2222;
    address operator2;

    bytes32 constant TASK_ID = keccak256("LIGHTNING_ROUTING");
    bytes32 constant NODE_1 = keccak256("node_pubkey_1");
    bytes32 constant NODE_2 = keccak256("node_pubkey_2");
    uint256 constant MIN_STAKE = 100e18;

    function setUp() public {
        operator1 = vm.addr(operatorKey1);
        operator2 = vm.addr(operatorKey2);

        token = new MockERC20("Stake", "STK");
        stakeManager = new StakeManager(address(token), 1e18, MIN_STAKE, owner);
        registry = new CapacityRegistry(address(stakeManager));

        oracle = new LightningCapacityOracle(
            address(registry),
            address(stakeManager),
            TASK_ID,
            owner
        );

        // Fund and stake operators
        _fundAndStake(operator1, 500e18);
        _fundAndStake(operator2, 500e18);
    }

    function _fundAndStake(address op, uint256 amount) internal {
        token.mint(op, amount);
        vm.startPrank(op);
        token.approve(address(stakeManager), type(uint256).max);
        stakeManager.stake(amount);
        vm.stopPrank();
    }

    // ──────────────────── Registration ────────────────────

    function test_registerNode() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        assertEq(oracle.getOperator(NODE_1), operator1);
        assertEq(oracle.getSmoothedCapacity(NODE_1), 100_000);
    }

    function test_registerNode_caps_by_stake() public {
        uint256 cap = stakeManager.getCapacityCap(operator1);

        vm.prank(operator1);
        oracle.registerNode(NODE_1, type(uint256).max);

        assertEq(oracle.getSmoothedCapacity(NODE_1), cap);
    }

    function test_registerNode_revert_already_registered() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        vm.expectRevert(LightningCapacityOracle.NodeAlreadyRegistered.selector);
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);
    }

    function test_registerNode_revert_insufficient_stake() public {
        address poorOp = address(0xBEEF);
        token.mint(poorOp, 10e18);
        vm.startPrank(poorOp);
        token.approve(address(stakeManager), type(uint256).max);
        stakeManager.stake(10e18);
        vm.stopPrank();

        vm.expectRevert(abi.encodeWithSelector(
            LightningCapacityOracle.InsufficientStake.selector, MIN_STAKE, 10e18
        ));
        vm.prank(poorOp);
        oracle.registerNode(NODE_1, 100_000);
    }

    // ──────────────────── Deregistration ────────────────────

    function test_deregisterNode() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        vm.prank(operator1);
        oracle.deregisterNode(NODE_1);

        assertEq(oracle.getOperator(NODE_1), address(0));
    }

    function test_deregisterNode_revert_not_operator() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        vm.expectRevert(LightningCapacityOracle.NotOperator.selector);
        vm.prank(operator2);
        oracle.deregisterNode(NODE_1);
    }

    // ──────────────────── Batch Updates ────────────────────

    function test_submitBatch() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        // Create attestation
        ILightningCapacityOracle.LightningAttestation[] memory batch =
            new ILightningCapacityOracle.LightningAttestation[](1);

        uint256 ts = block.timestamp;
        uint256 nonce = 1;

        bytes32 structHash = keccak256(abi.encode(
            oracle.LIGHTNING_ATTESTATION_TYPEHASH(),
            NODE_1,
            operator1,
            uint256(200_000),
            uint256(5),
            uint256(2),
            ts,
            nonce
        ));

        bytes32 domainSeparator = _computeDomainSeparator();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey1, digest);

        batch[0] = ILightningCapacityOracle.LightningAttestation({
            nodePubkey: NODE_1,
            operator: operator1,
            outboundCapacitySats: 200_000,
            channelCount: 5,
            pendingHTLCs: 2,
            timestamp: ts,
            nonce: nonce,
            signature: abi.encodePacked(r, s, v)
        });

        oracle.submitBatch(batch);

        // Smoothed = (0.3 * 200_000 + 0.7 * 100_000) = 130_000
        uint256 smoothed = oracle.getSmoothedCapacity(NODE_1);
        assertEq(smoothed, 130_000);
        assertEq(oracle.getPendingHTLCs(NODE_1), 2);
    }

    function test_submitBatch_skips_stale() public {
        vm.warp(10_000); // Set a reasonable starting timestamp

        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);

        ILightningCapacityOracle.LightningAttestation[] memory batch =
            new ILightningCapacityOracle.LightningAttestation[](1);

        // Timestamp too old
        uint256 staleTs = block.timestamp - 700; // > MAX_ATTESTATION_AGE (600)

        bytes32 structHash = keccak256(abi.encode(
            oracle.LIGHTNING_ATTESTATION_TYPEHASH(),
            NODE_1, operator1, uint256(200_000), uint256(5), uint256(2), staleTs, uint256(1)
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _computeDomainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(operatorKey1, digest);

        batch[0] = ILightningCapacityOracle.LightningAttestation({
            nodePubkey: NODE_1,
            operator: operator1,
            outboundCapacitySats: 200_000,
            channelCount: 5,
            pendingHTLCs: 2,
            timestamp: staleTs,
            nonce: 1,
            signature: abi.encodePacked(r, s, v)
        });

        oracle.submitBatch(batch);

        // Should NOT have updated
        assertEq(oracle.getSmoothedCapacity(NODE_1), 100_000);
    }

    // ──────────────────── View ────────────────────

    function test_getAllNodes() public {
        vm.prank(operator1);
        oracle.registerNode(NODE_1, 100_000);
        vm.prank(operator2);
        oracle.registerNode(NODE_2, 200_000);

        (bytes32[] memory pubkeys, uint256[] memory capacities) = oracle.getAllNodes();
        assertEq(pubkeys.length, 2);
        assertEq(capacities.length, 2);
    }

    function test_lightningTaskTypeId() public view {
        assertEq(oracle.lightningTaskTypeId(), TASK_ID);
    }

    // Compute EIP-712 domain separator from oracle's eip712Domain()
    function _computeDomainSeparator() internal view returns (bytes32) {
        (, string memory name, string memory version, uint256 chainId, address verifyingContract,,) =
            oracle.eip712Domain();
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }
}
