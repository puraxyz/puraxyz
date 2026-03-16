// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { OpenClawReputationBridge } from "../src/OpenClawReputationBridge.sol";
import { ReputationLedger } from "../src/ReputationLedger.sol";
import { IReputationLedger } from "../src/interfaces/IReputationLedger.sol";

contract OpenClawReputationBridgeTest is Test {
    OpenClawReputationBridge public bridge;
    ReputationLedger public ledger;

    address owner = address(0xA);
    address reporter = address(0xB);
    address operator1 = address(0x1);
    address operator2 = address(0x2);

    bytes32 constant OPENCLAW_DOMAIN = keccak256("OPENCLAW_AGENT");
    bytes32 constant SKILL_ID = keccak256("email-management");

    function setUp() public {
        ledger = new ReputationLedger(owner);
        bridge = new OpenClawReputationBridge(address(ledger), owner);

        // Register OpenClaw domain in the ReputationLedger
        vm.prank(owner);
        ledger.registerDomain(OPENCLAW_DOMAIN, address(bridge));

        // Authorize the bridge as a recorder for the domain
        vm.prank(owner);
        ledger.authorizeRecorder(OPENCLAW_DOMAIN, address(bridge));

        // Authorize a reporter on the bridge
        vm.prank(owner);
        bridge.authorizeReporter(reporter);
    }

    // ──────────────────── Reporter Management ────────────────────

    function test_authorizeReporter() public view {
        assertTrue(bridge.authorizedReporters(reporter));
    }

    function test_revokeReporter() public {
        vm.prank(owner);
        bridge.revokeReporter(reporter);
        assertFalse(bridge.authorizedReporters(reporter));
    }

    function test_authorizeReporter_revert_notOwner() public {
        vm.expectRevert(OpenClawReputationBridge.NotOwner.selector);
        vm.prank(operator1);
        bridge.authorizeReporter(address(0xC));
    }

    // ──────────────────── Positive Reporting ────────────────────

    function test_reportCompletion() public {
        vm.prank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);

        IReputationLedger.DomainReputation memory rep = bridge.getOpenClawReputation(operator1);
        assertEq(rep.completions, 1);
        assertEq(rep.score, 10); // COMPLETION_POINTS = 10
    }

    function test_reportCompletion_multiple() public {
        vm.startPrank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);
        bridge.reportCompletion(operator1, SKILL_ID);
        bridge.reportCompletion(operator1, SKILL_ID);
        vm.stopPrank();

        IReputationLedger.DomainReputation memory rep = bridge.getOpenClawReputation(operator1);
        assertEq(rep.completions, 3);
        assertEq(rep.score, 30);
    }

    function test_reportCompletion_revert_notReporter() public {
        vm.expectRevert(OpenClawReputationBridge.NotAuthorized.selector);
        vm.prank(operator1);
        bridge.reportCompletion(operator1, SKILL_ID);
    }

    // ──────────────────── Negative Reporting ────────────────────

    function test_reportFailure() public {
        // First build some reputation
        vm.startPrank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);
        bridge.reportCompletion(operator1, SKILL_ID);
        bridge.reportCompletion(operator1, SKILL_ID);
        bridge.reportCompletion(operator1, SKILL_ID);
        // Score: 40

        // Report failure: 10 points * 3x negative weight = 30 deducted
        bridge.reportFailure(operator1, SKILL_ID);
        vm.stopPrank();

        IReputationLedger.DomainReputation memory rep = bridge.getOpenClawReputation(operator1);
        assertEq(rep.slashCount, 1);
        assertEq(rep.score, 10); // 40 - 30 = 10
    }

    function test_reportFailure_floorsAtZero() public {
        // Report failure with no prior reputation
        vm.prank(reporter);
        bridge.reportFailure(operator1, SKILL_ID);

        IReputationLedger.DomainReputation memory rep = bridge.getOpenClawReputation(operator1);
        assertEq(rep.score, 0);
        assertEq(rep.slashCount, 1);
    }

    // ──────────────────── Batch Reporting ────────────────────

    function test_reportBatch() public {
        address[] memory operators = new address[](3);
        operators[0] = operator1;
        operators[1] = operator2;
        operators[2] = operator1;

        bytes32[] memory skillTypeIds = new bytes32[](3);
        skillTypeIds[0] = SKILL_ID;
        skillTypeIds[1] = SKILL_ID;
        skillTypeIds[2] = SKILL_ID;

        bool[] memory successes = new bool[](3);
        successes[0] = true;
        successes[1] = true;
        successes[2] = false;

        vm.prank(reporter);
        bridge.reportBatch(operators, skillTypeIds, successes);

        // operator1: 1 completion (+10) then 1 failure (-30) = 0 (floored)
        IReputationLedger.DomainReputation memory rep1 = bridge.getOpenClawReputation(operator1);
        assertEq(rep1.completions, 1);
        assertEq(rep1.slashCount, 1);
        assertEq(rep1.score, 0);

        // operator2: 1 completion = 10
        IReputationLedger.DomainReputation memory rep2 = bridge.getOpenClawReputation(operator2);
        assertEq(rep2.completions, 1);
        assertEq(rep2.score, 10);
    }

    // ──────────────────── Cross-Domain Reads ────────────────────

    function test_getAggregateReputation() public {
        vm.prank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);

        uint256 aggregate = bridge.getAggregateReputation(operator1);
        assertEq(aggregate, 10); // Only one domain, so aggregate = domain score
    }

    function test_getStakeDiscount_noCrossDomain() public {
        vm.prank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);

        // Discount based on OTHER domains' reputation. With only one domain, discount = 0.
        uint256 discount = bridge.getStakeDiscount(operator1);
        assertEq(discount, 0);
    }

    function test_getStakeDiscount_withCrossDomain() public {
        // Register a second domain and build reputation there
        bytes32 AI_DOMAIN = keccak256("AI_COMPUTE");
        vm.startPrank(owner);
        ledger.registerDomain(AI_DOMAIN, address(0xDEAD));
        ledger.authorizeRecorder(AI_DOMAIN, address(this));
        vm.stopPrank();

        // Build reputation in AI domain (directly via ledger since we're authorized)
        for (uint256 i; i < 100; ++i) {
            ledger.recordPositive(operator1, AI_DOMAIN, 100);
        }

        // Build some OpenClaw reputation
        vm.prank(reporter);
        bridge.reportCompletion(operator1, SKILL_ID);

        // Now operator1 has cross-domain reputation, should get a discount
        uint256 discount = bridge.getStakeDiscount(operator1);
        assertGt(discount, 0);
    }
}
