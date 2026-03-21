import { describe, it, expect, vi } from "vitest";
import {
  evidenceHashToBytes32,
  submitVerifiedCompletion,
  submitVerifiedExecution,
  reportVerifiedOutcome,
} from "../src/actions/verify.js";

// ── evidenceHashToBytes32 ──────────────────────────────────────────────

describe("evidenceHashToBytes32", () => {
  const hash64 = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

  it("converts bare hex to 0x-prefixed bytes32", () => {
    expect(evidenceHashToBytes32(hash64)).toBe(`0x${hash64}`);
  });

  it("passes through already-prefixed hex", () => {
    expect(evidenceHashToBytes32(`0x${hash64}`)).toBe(`0x${hash64}`);
  });

  it("rejects short hex strings", () => {
    expect(() => evidenceHashToBytes32("abcd")).toThrow("Invalid evidence hash");
  });

  it("rejects non-hex characters", () => {
    const badHash = "z".repeat(64);
    expect(() => evidenceHashToBytes32(badHash)).toThrow("Invalid evidence hash");
  });
});

// ── submitVerifiedCompletion ───────────────────────────────────────────

describe("submitVerifiedCompletion", () => {
  it("calls recordCompletion with evidence hash as taskId", async () => {
    const evidenceHash = "aabbccdd".repeat(8);
    const mockTxHash = "0xdeadbeef" as `0x${string}`;

    const walletClient = {
      writeContract: vi.fn().mockResolvedValue(mockTxHash),
      chain: { id: 84532 },
      account: { address: "0xSourceAddr" },
    } as any;

    const addrs = {
      completionTracker: "0xCT" as `0x${string}`,
    } as any;

    const result = await submitVerifiedCompletion(
      walletClient,
      addrs,
      "0x0001000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
      "0xSinkAddr" as `0x${string}`,
      evidenceHash,
      "0xSinkSig" as `0x${string}`,
    );

    expect(result).toBe(mockTxHash);
    const call = walletClient.writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("recordCompletion");
    // taskId (3rd arg) should be the 0x-prefixed evidence hash
    expect(call.args[2]).toBe(`0x${evidenceHash}`);
  });
});

// ── submitVerifiedExecution ───────────────────────────────────────────

describe("submitVerifiedExecution", () => {
  it("calls verifyExecution with evidence hash as executionId", async () => {
    const evidenceHash = "11223344".repeat(8);
    const mockTxHash = "0xcafe" as `0x${string}`;

    const walletClient = {
      writeContract: vi.fn().mockResolvedValue(mockTxHash),
      chain: { id: 84532 },
      account: { address: "0xRequester" },
    } as any;

    const addrs = {
      openClawCompletionVerifier: "0xOCCV" as `0x${string}`,
    } as any;

    const agentId = "0x" + "aa".repeat(32) as `0x${string}`;
    const skillTypeId = "0x" + "bb".repeat(32) as `0x${string}`;

    const result = await submitVerifiedExecution(
      walletClient,
      addrs,
      agentId,
      skillTypeId,
      evidenceHash,
      "0xAgentOperator" as `0x${string}`,
      "0xAgentSig" as `0x${string}`,
      "0xRequesterSig" as `0x${string}`,
    );

    expect(result).toBe(mockTxHash);
    const call = walletClient.writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("verifyExecution");
    // executionId (3rd arg) should be the 0x-prefixed evidence hash
    expect(call.args[2]).toBe(`0x${evidenceHash}`);
  });
});

// ── reportVerifiedOutcome ─────────────────────────────────────────────

describe("reportVerifiedOutcome", () => {
  const walletClient = {
    writeContract: vi.fn().mockResolvedValue("0xtx" as `0x${string}`),
    chain: { id: 84532 },
    account: { address: "0xReporter" },
  } as any;

  const addrs = {
    openClawReputationBridge: "0xORB" as `0x${string}`,
  } as any;

  const operator = "0xOperator" as `0x${string}`;
  const skillTypeId = "0x" + "cc".repeat(32) as `0x${string}`;

  it("calls reportCompletion when passed=true", async () => {
    walletClient.writeContract.mockClear();
    await reportVerifiedOutcome(walletClient, addrs, operator, skillTypeId, true);
    const call = walletClient.writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("reportCompletion");
  });

  it("calls reportFailure when passed=false", async () => {
    walletClient.writeContract.mockClear();
    await reportVerifiedOutcome(walletClient, addrs, operator, skillTypeId, false);
    const call = walletClient.writeContract.mock.calls[0][0];
    expect(call.functionName).toBe("reportFailure");
  });
});
