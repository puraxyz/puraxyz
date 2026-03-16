import { type WalletClient, type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

// ──────────────────── Node Management ────────────────────

export async function registerNode(
  walletClient: WalletClient, addrs: ChainAddresses,
  nodePubkey: Hash, initialCapacitySats: bigint,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.lightningCapacityOracle, abi: abis.LightningCapacityOracle,
    functionName: "registerNode", args: [nodePubkey, initialCapacitySats],
  });
}

export async function deregisterNode(
  walletClient: WalletClient, addrs: ChainAddresses, nodePubkey: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.lightningCapacityOracle, abi: abis.LightningCapacityOracle,
    functionName: "deregisterNode", args: [nodePubkey],
  });
}

// ──────────────────── Pool ────────────────────

export async function joinRoutingPool(
  walletClient: WalletClient, addrs: ChainAddresses, nodePubkey: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.lightningRoutingPool, abi: abis.LightningRoutingPool,
    functionName: "joinPool", args: [nodePubkey],
  });
}

export async function leaveRoutingPool(
  walletClient: WalletClient, addrs: ChainAddresses, nodePubkey: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.lightningRoutingPool, abi: abis.LightningRoutingPool,
    functionName: "leavePool", args: [nodePubkey],
  });
}

export async function rebalanceRoutingPool(
  walletClient: WalletClient, addrs: ChainAddresses,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.lightningRoutingPool, abi: abis.LightningRoutingPool,
    functionName: "rebalance",
  });
}

// ──────────────────── Reads ────────────────────

export async function getSmoothedCapacity(
  publicClient: PublicClient, addrs: ChainAddresses, nodePubkey: Hash,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.lightningCapacityOracle, abi: abis.LightningCapacityOracle,
    functionName: "getSmoothedCapacity", args: [nodePubkey],
  });
}

export async function getOptimalRoute(
  publicClient: PublicClient, addrs: ChainAddresses,
  amountSats: bigint, maxNodes: bigint,
): Promise<{ nodePubkeys: Hash[]; allocations: bigint[]; fees: bigint[] }> {
  return read<{ nodePubkeys: Hash[]; allocations: bigint[]; fees: bigint[] }>(publicClient, {
    address: addrs.lightningRoutingPool, abi: abis.LightningRoutingPool,
    functionName: "getOptimalRoute", args: [amountSats, maxNodes],
  });
}

export async function getRoutingFee(
  publicClient: PublicClient, addrs: ChainAddresses, nodePubkey: Hash,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.lightningRoutingPool, abi: abis.LightningRoutingPool,
    functionName: "getRoutingFee", args: [nodePubkey],
  });
}
