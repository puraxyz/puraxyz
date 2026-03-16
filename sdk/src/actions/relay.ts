import { type WalletClient, type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

// ──────────────────── Relay Registration ────────────────────

export async function registerRelay(
  walletClient: WalletClient, addrs: ChainAddresses,
  nostrPubkey: Hash,
  initialCapacity: { eventsPerSecond: bigint; storageGB: bigint; bandwidthMbps: bigint },
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.relayCapacityRegistry, abi: abis.RelayCapacityRegistry,
    functionName: "registerRelay",
    args: [nostrPubkey, [initialCapacity.eventsPerSecond, initialCapacity.storageGB, initialCapacity.bandwidthMbps]],
  });
}

export async function deregisterRelay(
  walletClient: WalletClient, addrs: ChainAddresses, nostrPubkey: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.relayCapacityRegistry, abi: abis.RelayCapacityRegistry,
    functionName: "deregisterRelay", args: [nostrPubkey],
  });
}

// ──────────────────── Pool Management ────────────────────

export async function joinRelayPool(
  walletClient: WalletClient, addrs: ChainAddresses,
  poolType: 0 | 1 | 2, // RELAY_WRITE = 0, RELAY_READ = 1, RELAY_STORE = 2
  nostrPubkey: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.relayPaymentPool, abi: abis.RelayPaymentPool,
    functionName: "joinPool", args: [poolType, nostrPubkey],
  });
}

export async function setAntiSpamMinimum(
  walletClient: WalletClient, addrs: ChainAddresses,
  poolType: 0 | 1 | 2, minPayment: bigint,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.relayPaymentPool, abi: abis.RelayPaymentPool,
    functionName: "setAntiSpamMinimum", args: [poolType, minPayment],
  });
}

// ──────────────────── Reads ────────────────────

export async function getRelayOperator(
  publicClient: PublicClient, addrs: ChainAddresses, nostrPubkey: Hash,
): Promise<`0x${string}`> {
  return read<`0x${string}`>(publicClient, {
    address: addrs.relayCapacityRegistry, abi: abis.RelayCapacityRegistry,
    functionName: "getRelayOperator", args: [nostrPubkey],
  });
}

export async function getCompositeCapacity(
  publicClient: PublicClient, addrs: ChainAddresses, nostrPubkey: Hash,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.relayCapacityRegistry, abi: abis.RelayCapacityRegistry,
    functionName: "getCompositeCapacity", args: [nostrPubkey],
  });
}

export async function getAntiSpamMinimum(
  publicClient: PublicClient, addrs: ChainAddresses, poolType: 0 | 1 | 2,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.relayPaymentPool, abi: abis.RelayPaymentPool,
    functionName: "getAntiSpamMinimum", args: [poolType],
  });
}
