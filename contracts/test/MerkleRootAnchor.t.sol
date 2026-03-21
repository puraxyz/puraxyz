// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { MerkleRootAnchor } from "../src/MerkleRootAnchor.sol";

contract MerkleRootAnchorTest is Test {
    MerkleRootAnchor public anchor;

    address submitter1 = address(0xA);
    address submitter2 = address(0xB);

    bytes32 constant ROOT_1 = keccak256("evidence-batch-1");
    bytes32 constant ROOT_2 = keccak256("evidence-batch-2");

    function setUp() public {
        anchor = new MerkleRootAnchor();
    }

    function test_anchor_stores_timestamp() public {
        vm.warp(1_700_000_000);
        vm.prank(submitter1);
        anchor.anchor(ROOT_1);

        assertEq(anchor.anchored(ROOT_1), 1_700_000_000);
        assertTrue(anchor.isAnchored(ROOT_1));
    }

    function test_anchor_emits_event() public {
        vm.warp(1_700_000_000);
        vm.prank(submitter1);

        vm.expectEmit(true, true, false, true);
        emit MerkleRootAnchor.RootAnchored(ROOT_1, submitter1, 1_700_000_000);

        anchor.anchor(ROOT_1);
    }

    function test_anchor_reverts_on_duplicate() public {
        vm.prank(submitter1);
        anchor.anchor(ROOT_1);

        vm.prank(submitter2);
        vm.expectRevert(abi.encodeWithSelector(MerkleRootAnchor.RootAlreadyAnchored.selector, ROOT_1));
        anchor.anchor(ROOT_1);
    }

    function test_isAnchored_returns_false_for_unknown() public view {
        assertFalse(anchor.isAnchored(ROOT_1));
    }

    function test_multiple_roots_independent() public {
        vm.warp(1_700_000_000);
        vm.prank(submitter1);
        anchor.anchor(ROOT_1);

        vm.warp(1_700_001_000);
        vm.prank(submitter2);
        anchor.anchor(ROOT_2);

        assertEq(anchor.anchored(ROOT_1), 1_700_000_000);
        assertEq(anchor.anchored(ROOT_2), 1_700_001_000);
        assertTrue(anchor.isAnchored(ROOT_1));
        assertTrue(anchor.isAnchored(ROOT_2));
    }
}
