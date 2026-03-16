// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { OpenClawCapacityAdapter } from "../src/OpenClawCapacityAdapter.sol";
import { StakeManager } from "../src/StakeManager.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { IOpenClawAdapter } from "../src/interfaces/IOpenClawAdapter.sol";

contract OpenClawCapacityAdapterTest is Test {
    OpenClawCapacityAdapter public adapter;
    StakeManager public stakeManager;
    MockERC20 public token;

    address owner = address(0xA);
    address operator1 = address(0x1);
    address operator2 = address(0x2);

    bytes32 constant SKILL_ID = keccak256("email-management");
    bytes32 constant AGENT_1 = keccak256("agent-alpha");
    bytes32 constant AGENT_2 = keccak256("agent-beta");
    uint256 constant MIN_STAKE = 100e18;

    function setUp() public {
        token = new MockERC20("Stake", "STK");
        stakeManager = new StakeManager(address(token), 1e18, MIN_STAKE, owner);
        adapter = new OpenClawCapacityAdapter(address(stakeManager), owner);

        // Fund and stake operators
        _fundAndStake(operator1, 500e18);
        _fundAndStake(operator2, 500e18);

        // Register skill type
        vm.prank(owner);
        adapter.registerSkillType(SKILL_ID, "Email Management", MIN_STAKE);
    }

    function _fundAndStake(address op, uint256 amount) internal {
        token.mint(op, amount);
        vm.startPrank(op);
        token.approve(address(stakeManager), type(uint256).max);
        stakeManager.stake(amount);
        vm.stopPrank();
    }

    // ──────────────────── ICapacityAdapter ────────────────────

    function test_domainId() public view {
        assertEq(adapter.domainId(), keccak256("OPENCLAW_AGENT"));
    }

    function test_domainDescription() public view {
        string memory desc = adapter.domainDescription();
        assertTrue(bytes(desc).length > 0);
    }

    function test_normalizeCapacity_encodedSignal() public view {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity({
            throughput: 100,
            latencyMs: 500,
            errorRateBps: 100 // 1% error rate
        });
        uint256 normalized = adapter.normalizeCapacity(abi.encode(cap));
        assertGt(normalized, 0);
    }

    // ──────────────────── Skill Type Registration ────────────────────

    function test_registerSkillType() public {
        bytes32 newSkill = keccak256("code-generation");
        vm.prank(owner);
        adapter.registerSkillType(newSkill, "Code Generation", MIN_STAKE);
        assertTrue(adapter.skillTypes(newSkill));
    }

    function test_registerSkillType_revert_duplicate() public {
        vm.expectRevert(OpenClawCapacityAdapter.SkillTypeAlreadyExists.selector);
        vm.prank(owner);
        adapter.registerSkillType(SKILL_ID, "Email Management", MIN_STAKE);
    }

    function test_registerSkillType_revert_notOwner() public {
        vm.expectRevert();
        vm.prank(operator1);
        adapter.registerSkillType(keccak256("test"), "Test", MIN_STAKE);
    }

    // ──────────────────── Agent Registration ────────────────────

    function test_registerAgent() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        IOpenClawAdapter.AgentInfo memory info = adapter.getAgent(AGENT_1);
        assertEq(info.operator, operator1);
        assertEq(info.skillTypeId, SKILL_ID);
        assertTrue(info.active);
        assertGt(info.smoothedCapacity, 0);
    }

    function test_registerAgent_revert_badSkillType() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.expectRevert(OpenClawCapacityAdapter.SkillTypeDoesNotExist.selector);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, keccak256("nonexistent"), cap);
    }

    function test_registerAgent_revert_duplicate() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        vm.expectRevert(OpenClawCapacityAdapter.AgentAlreadyRegistered.selector);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);
    }

    function test_registerAgent_revert_insufficientStake() public {
        address poorOp = address(0xBEEF);
        token.mint(poorOp, 10e18);
        vm.startPrank(poorOp);
        token.approve(address(stakeManager), type(uint256).max);
        stakeManager.stake(10e18);
        vm.stopPrank();

        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.expectRevert(OpenClawCapacityAdapter.InsufficientStake.selector);
        vm.prank(poorOp);
        adapter.registerAgent(keccak256("poor-agent"), SKILL_ID, cap);
    }

    function test_registerAgent_capsCapacityByStake() public {
        // Try to register with enormous throughput
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(
            type(uint128).max, 500, 100
        );

        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        uint256 stakeCap = stakeManager.getCapacityCap(operator1);
        IOpenClawAdapter.AgentInfo memory info = adapter.getAgent(AGENT_1);
        assertLe(info.smoothedCapacity, stakeCap);
    }

    // ──────────────────── Agent Deregistration ────────────────────

    function test_deregisterAgent() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        vm.prank(operator1);
        adapter.deregisterAgent(AGENT_1);

        IOpenClawAdapter.AgentInfo memory info = adapter.getAgent(AGENT_1);
        assertFalse(info.active);

        bytes32[] memory agents = adapter.getAgentsForSkill(SKILL_ID);
        assertEq(agents.length, 0);
    }

    function test_deregisterAgent_swapAndPop() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);
        vm.prank(operator2);
        adapter.registerAgent(AGENT_2, SKILL_ID, cap);

        // Deregister first agent, second should remain
        vm.prank(operator1);
        adapter.deregisterAgent(AGENT_1);

        bytes32[] memory agents = adapter.getAgentsForSkill(SKILL_ID);
        assertEq(agents.length, 1);
        assertEq(agents[0], AGENT_2);
    }

    function test_deregisterAgent_revert_notOperator() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        vm.expectRevert(OpenClawCapacityAdapter.NotAgentOperator.selector);
        vm.prank(operator2);
        adapter.deregisterAgent(AGENT_1);
    }

    // ──────────────────── Capacity Updates ────────────────────

    function test_updateCapacity_ewmaSmoothing() public {
        IOpenClawAdapter.SkillCapacity memory initial = IOpenClawAdapter.SkillCapacity(100, 500, 100);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, initial);

        uint256 firstCapacity = adapter.getSmoothedCapacity(AGENT_1);

        // Update with higher throughput
        IOpenClawAdapter.SkillCapacity memory updated = IOpenClawAdapter.SkillCapacity(200, 500, 100);
        vm.prank(operator1);
        adapter.updateCapacity(AGENT_1, updated);

        uint256 smoothedCapacity = adapter.getSmoothedCapacity(AGENT_1);

        // EWMA should be between first and new raw value
        assertGt(smoothedCapacity, firstCapacity);
    }

    function test_updateCapacity_revert_notOperator() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);
        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);

        vm.expectRevert(OpenClawCapacityAdapter.NotAgentOperator.selector);
        vm.prank(operator2);
        adapter.updateCapacity(AGENT_1, cap);
    }

    // ──────────────────── Normalization ────────────────────

    function test_normalize_zeroThroughput() public view {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(0, 500, 100);
        uint256 normalized = adapter.normalizeCapacity(abi.encode(cap));
        assertEq(normalized, 0);
    }

    function test_normalize_maxLatency() public view {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 30_000, 0);
        uint256 normalized = adapter.normalizeCapacity(abi.encode(cap));
        // With max latency, latency component = 0, only error component contributes
        assertGt(normalized, 0); // error component still contributes
    }

    function test_normalize_maxErrors() public view {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 10_000);
        uint256 normalized = adapter.normalizeCapacity(abi.encode(cap));
        // 100% error rate, error component = 0, but latency still contributes
        assertGt(normalized, 0);
    }

    function test_normalize_perfectAgent() public view {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 0, 0);
        uint256 perfectNorm = adapter.normalizeCapacity(abi.encode(cap));

        IOpenClawAdapter.SkillCapacity memory avg = IOpenClawAdapter.SkillCapacity(100, 5_000, 500);
        uint256 avgNorm = adapter.normalizeCapacity(abi.encode(avg));

        // Perfect agent should have higher normalized capacity than average
        assertGt(perfectNorm, avgNorm);
    }

    // ──────────────────── Reads ────────────────────

    function test_getAgentsForSkill() public {
        IOpenClawAdapter.SkillCapacity memory cap = IOpenClawAdapter.SkillCapacity(100, 500, 100);

        vm.prank(operator1);
        adapter.registerAgent(AGENT_1, SKILL_ID, cap);
        vm.prank(operator2);
        adapter.registerAgent(AGENT_2, SKILL_ID, cap);

        bytes32[] memory agents = adapter.getAgentsForSkill(SKILL_ID);
        assertEq(agents.length, 2);
    }
}
