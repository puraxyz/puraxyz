import { type WalletClient, type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

// ──────────────────── Reputation Reads ────────────────────

export async function getAggregateReputation(
  publicClient: PublicClient, addrs: ChainAddresses, account: `0x${string}`,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.reputationLedger, abi: abis.ReputationLedger,
    functionName: "getAggregateReputation", args: [account],
  });
}

export async function getStakeDiscount(
  publicClient: PublicClient, addrs: ChainAddresses,
  account: `0x${string}`, domain: Hash,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.reputationLedger, abi: abis.ReputationLedger,
    functionName: "getStakeDiscount", args: [account, domain],
  });
}

export async function getAccountDomains(
  publicClient: PublicClient, addrs: ChainAddresses, account: `0x${string}`,
): Promise<Hash[]> {
  return read<Hash[]>(publicClient, {
    address: addrs.reputationLedger, abi: abis.ReputationLedger,
    functionName: "getAccountDomains", args: [account],
  });
}

// ──────────────────── Router ────────────────────

export async function isProtocolAvailable(
  publicClient: PublicClient, addrs: ChainAddresses, protocol: 0 | 1 | 2,
): Promise<boolean> {
  return read<boolean>(publicClient, {
    address: addrs.crossProtocolRouter, abi: abis.CrossProtocolRouter,
    functionName: "isProtocolAvailable", args: [protocol],
  });
}

// ──────────────────── Adapter ────────────────────

export async function normalizeCapacity(
  publicClient: PublicClient, addrs: ChainAddresses,
  domainId: Hash, rawSignal: `0x${string}`,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.universalCapacityAdapter, abi: abis.UniversalCapacityAdapter,
    functionName: "normalizeCapacity", args: [domainId, rawSignal],
  });
}

export async function routeAttestation(
  walletClient: WalletClient, addrs: ChainAddresses,
  domainId: Hash, attestation: `0x${string}`,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.universalCapacityAdapter, abi: abis.UniversalCapacityAdapter,
    functionName: "routeAttestation", args: [domainId, attestation],
  });
}
