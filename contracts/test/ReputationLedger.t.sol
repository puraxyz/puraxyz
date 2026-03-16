// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { ReputationLedger } from "../src/ReputationLedger.sol";

contract ReputationLedgerTest is Test {
    ReputationLedger public ledger;

    address owner = address(0xA);
    address recorder1 = address(0xBB);
    address recorder2 = address(0xCC);
    address alice = address(0x1);
    address bob = address(0x2);

    bytes32 constant DOMAIN_AI = keccak256("AI_COMPUTE");
    bytes32 constant DOMAIN_NOSTR = keccak256("NOSTR_RELAY");
    bytes32 constant DOMAIN_LIGHTNING = keccak256("LIGHTNING");

    function setUp() public {
        ledger = new ReputationLedger(owner);

        vm.startPrank(owner);
        ledger.registerDomain(DOMAIN_AI, address(0xD1));
        ledger.registerDomain(DOMAIN_NOSTR, address(0xD2));
        ledger.registerDomain(DOMAIN_LIGHTNING, address(0xD3));

        ledger.authorizeRecorder(DOMAIN_AI, recorder1);
        ledger.authorizeRecorder(DOMAIN_NOSTR, recorder2);
        ledger.authorizeRecorder(DOMAIN_LIGHTNING, recorder1);
        vm.stopPrank();
    }

    // ──────────────────── Positive Reputation ────────────────────

    function test_recordPositive() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 100);

        ReputationLedger.DomainReputation memory rep = ledger.getDomainReputation(alice, DOMAIN_AI);
        assertEq(rep.score, 100);
        assertEq(rep.completions, 1);
    }

    function test_recordPositive_caps_at_max() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 15000); // > MAX_SCORE

        ReputationLedger.DomainReputation memory rep = ledger.getDomainReputation(alice, DOMAIN_AI);
        assertEq(rep.score, 10000); // MAX_SCORE
    }

    function test_recordPositive_revert_unauthorized() public {
        vm.expectRevert(ReputationLedger.NotAuthorized.selector);
        vm.prank(alice);
        ledger.recordPositive(alice, DOMAIN_AI, 100);
    }

    function test_recordPositive_revert_zero() public {
        vm.expectRevert(ReputationLedger.InvalidPoints.selector);
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 0);
    }

    // ──────────────────── Negative Reputation ────────────────────

    function test_recordNegative() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 1000);

        vm.prank(recorder1);
        ledger.recordNegative(alice, DOMAIN_AI, 100);

        ReputationLedger.DomainReputation memory rep = ledger.getDomainReputation(alice, DOMAIN_AI);
        // 1000 - (100 * 3) = 700
        assertEq(rep.score, 700);
        assertEq(rep.slashCount, 1);
    }

    function test_recordNegative_floors_at_zero() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 100);

        vm.prank(recorder1);
        ledger.recordNegative(alice, DOMAIN_AI, 200); // penalty = 600 > 100

        ReputationLedger.DomainReputation memory rep = ledger.getDomainReputation(alice, DOMAIN_AI);
        assertEq(rep.score, 0);
    }

    // ──────────────────── Aggregate Reputation ────────────────────

    function test_aggregateReputation() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 5000);

        vm.prank(recorder2);
        ledger.recordPositive(alice, DOMAIN_NOSTR, 3000);

        uint256 agg = ledger.getAggregateReputation(alice);
        // Equal weights: (5000 * 10000 + 3000 * 10000) / (10000 + 10000) = 4000
        assertEq(agg, 4000);
    }

    function test_aggregateReputation_zero_for_new_account() public {
        assertEq(ledger.getAggregateReputation(bob), 0);
    }

    // ──────────────────── Stake Discount ────────────────────

    function test_stakeDiscount_crossDomain() public {
        // Build reputation in AI
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 8000);

        // Check discount for NOSTR (based on AI reputation)
        uint256 discount = ledger.getStakeDiscount(alice, DOMAIN_NOSTR);
        assertGt(discount, 0);
        assertLe(discount, 5000); // MAX_DISCOUNT_BPS
    }

    function test_stakeDiscount_zero_with_no_crossDomain() public {
        // Only has reputation in one domain
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 5000);

        // Discount for AI itself should use cross-domain only
        // Since alice has no other domain reputation, discount is 0
        uint256 discount = ledger.getStakeDiscount(alice, DOMAIN_AI);
        assertEq(discount, 0);
    }

    // ──────────────────── Domain Tracking ────────────────────

    function test_getAccountDomains() public {
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 100);

        vm.prank(recorder2);
        ledger.recordPositive(alice, DOMAIN_NOSTR, 200);

        bytes32[] memory domains = ledger.getAccountDomains(alice);
        assertEq(domains.length, 2);
    }

    // ──────────────────── Admin ────────────────────

    function test_registerDomain_revert_duplicate() public {
        vm.expectRevert(ReputationLedger.DomainAlreadyRegistered.selector);
        vm.prank(owner);
        ledger.registerDomain(DOMAIN_AI, address(0xD1));
    }

    function test_setDomainWeight() public {
        vm.prank(owner);
        ledger.setDomainWeight(DOMAIN_AI, 2000);

        // Create reputation and verify weight affects aggregate
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 10000);

        vm.prank(recorder2);
        ledger.recordPositive(alice, DOMAIN_NOSTR, 2000);

        // Weighted: (10000 * 2000 + 2000 * 10000) / (2000 + 10000) = 40000000 / 12000 = 3333
        uint256 agg = ledger.getAggregateReputation(alice);
        assertEq(agg, 3333);
    }

    function test_revokeRecorder() public {
        vm.prank(owner);
        ledger.revokeRecorder(DOMAIN_AI, recorder1);

        vm.expectRevert(ReputationLedger.NotAuthorized.selector);
        vm.prank(recorder1);
        ledger.recordPositive(alice, DOMAIN_AI, 100);
    }
}
