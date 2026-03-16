// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { OpenClawCompletionVerifier } from "../src/OpenClawCompletionVerifier.sol";
import { CompletionTracker } from "../src/CompletionTracker.sol";
import { CapacityRegistry } from "../src/CapacityRegistry.sol";
import { StakeManager } from "../src/StakeManager.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract OpenClawCompletionVerifierTest is Test {
    OpenClawCompletionVerifier public verifier;
    CompletionTracker public completionTracker;
    CapacityRegistry public registry;
    StakeManager public stakeManager;
    MockERC20 public token;

    address owner = address(0xA);

    // Use vm.addr() for key-pair consistency with vm.sign()
    uint256 agentPk = 0xA11CE;
    address agentOp;
    uint256 requesterPk = 0xB0B;
    address requester;

    bytes32 constant SKILL_ID = keccak256("email-management");
    bytes32 constant EXEC_ID = keccak256("exec-001");
    bytes32 constant AGENT_ID = keccak256("agent-alpha");
    uint256 constant MIN_STAKE = 100e18;

    function setUp() public {
        agentOp = vm.addr(agentPk);
        requester = vm.addr(requesterPk);

        token = new MockERC20("Stake", "STK");
        stakeManager = new StakeManager(address(token), 1e18, MIN_STAKE, owner);
        registry = new CapacityRegistry(address(stakeManager));
        completionTracker = new CompletionTracker(address(registry), address(stakeManager));
        verifier = new OpenClawCompletionVerifier(address(completionTracker));

        // Fund and stake agent operator
        _fundAndStake(agentOp, 500e18);

        // Register task type (skill type maps to BPE task type)
        registry.registerTaskType(SKILL_ID, MIN_STAKE);

        // Register sink
        vm.prank(agentOp);
        registry.registerSink(SKILL_ID, 100);

        // Authorize completionTracker to slash
        vm.prank(owner);
        stakeManager.setSlasher(address(completionTracker), true);
    }

    function _fundAndStake(address op, uint256 amount) internal {
        token.mint(op, amount);
        vm.startPrank(op);
        token.approve(address(stakeManager), type(uint256).max);
        stakeManager.stake(amount);
        vm.stopPrank();
    }

    // ──────────────────── Core Verification ────────────────────

    function test_isExecutionRecorded_initial() public view {
        assertFalse(verifier.isExecutionRecorded(EXEC_ID));
    }

    // ──────────────────── Read Delegation ────────────────────

    function test_getCompletionRate_delegates() public view {
        // Should return 0 for an agent with no completions yet
        uint256 rate = verifier.getCompletionRate(SKILL_ID, agentOp);
        assertEq(rate, 0);
    }

    function test_getCompletions_delegates() public view {
        uint256 count = verifier.getCompletions(SKILL_ID, agentOp);
        assertEq(count, 0);
    }

    // ──────────────────── Replay Prevention ────────────────────

    // Note: Full EIP-712 dual-signature verification is complex to test
    // because CompletionTracker.recordCompletion() also verifies signatures
    // with its own EIP-712 domain. In production, the signatures must be valid
    // for BOTH the verifier's and tracker's domains. Integration tests with
    // a fork or mock CompletionTracker are recommended for full coverage.
    //
    // Unit tests here verify the verifier's own state management and read delegation.
}
