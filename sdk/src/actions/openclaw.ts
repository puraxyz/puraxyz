import { type WalletClient, type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

// ──────────────────── Agent Management ────────────────────

export async function registerAgent(
  walletClient: WalletClient, addrs: ChainAddresses,
  agentId: Hash,
  skillTypeId: Hash,
  initialCapacity: { throughput: bigint; latencyMs: bigint; errorRateBps: bigint },
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "registerAgent",
    args: [agentId, skillTypeId, [initialCapacity.throughput, initialCapacity.latencyMs, initialCapacity.errorRateBps]],
  });
}

export async function deregisterAgent(
  walletClient: WalletClient, addrs: ChainAddresses, agentId: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "deregisterAgent", args: [agentId],
  });
}

// ──────────────────── Capacity Updates ────────────────────

export async function updateCapacity(
  walletClient: WalletClient, addrs: ChainAddresses,
  agentId: Hash,
  capacity: { throughput: bigint; latencyMs: bigint; errorRateBps: bigint },
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "updateCapacity",
    args: [agentId, [capacity.throughput, capacity.latencyMs, capacity.errorRateBps]],
  });
}

// ──────────────────── Completion Verification ────────────────────

export async function verifyExecution(
  walletClient: WalletClient, addrs: ChainAddresses,
  agentId: Hash,
  skillTypeId: Hash,
  executionId: Hash,
  agentOperator: `0x${string}`,
  agentSig: `0x${string}`,
  requesterSig: `0x${string}`,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawCompletionVerifier, abi: abis.OpenClawCompletionVerifier,
    functionName: "verifyExecution",
    args: [agentId, skillTypeId, executionId, agentOperator, agentSig, requesterSig],
  });
}

// ──────────────────── Reputation Reporting ────────────────────

export async function reportCompletion(
  walletClient: WalletClient, addrs: ChainAddresses,
  operator: `0x${string}`, skillTypeId: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawReputationBridge, abi: abis.OpenClawReputationBridge,
    functionName: "reportCompletion", args: [operator, skillTypeId],
  });
}

export async function reportFailure(
  walletClient: WalletClient, addrs: ChainAddresses,
  operator: `0x${string}`, skillTypeId: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.openClawReputationBridge, abi: abis.OpenClawReputationBridge,
    functionName: "reportFailure", args: [operator, skillTypeId],
  });
}

// ──────────────────── Reads ────────────────────

export async function getAgent(
  publicClient: PublicClient, addrs: ChainAddresses, agentId: Hash,
): Promise<{
  operator: `0x${string}`;
  skillTypeId: Hash;
  smoothedCapacity: bigint;
  lastUpdated: bigint;
  active: boolean;
}> {
  return read(publicClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "getAgent", args: [agentId],
  });
}

export async function getSmoothedCapacity(
  publicClient: PublicClient, addrs: ChainAddresses, agentId: Hash,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "getSmoothedCapacity", args: [agentId],
  });
}

export async function getAgentsForSkill(
  publicClient: PublicClient, addrs: ChainAddresses, skillTypeId: Hash,
): Promise<Hash[]> {
  return read<Hash[]>(publicClient, {
    address: addrs.openClawCapacityAdapter, abi: abis.OpenClawCapacityAdapter,
    functionName: "getAgentsForSkill", args: [skillTypeId],
  });
}

export async function getOpenClawReputation(
  publicClient: PublicClient, addrs: ChainAddresses, operator: `0x${string}`,
): Promise<{
  score: bigint;
  stakeDuration: bigint;
  completions: bigint;
  slashCount: bigint;
  lastUpdated: bigint;
}> {
  return read(publicClient, {
    address: addrs.openClawReputationBridge, abi: abis.OpenClawReputationBridge,
    functionName: "getOpenClawReputation", args: [operator],
  });
}

export async function getOpenClawStakeDiscount(
  publicClient: PublicClient, addrs: ChainAddresses, operator: `0x${string}`,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.openClawReputationBridge, abi: abis.OpenClawReputationBridge,
    functionName: "getStakeDiscount", args: [operator],
  });
}

export async function isExecutionRecorded(
  publicClient: PublicClient, addrs: ChainAddresses, executionId: Hash,
): Promise<boolean> {
  return read<boolean>(publicClient, {
    address: addrs.openClawCompletionVerifier, abi: abis.OpenClawCompletionVerifier,
    functionName: "isExecutionRecorded", args: [executionId],
  });
}
