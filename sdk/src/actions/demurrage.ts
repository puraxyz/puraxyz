import { type WalletClient, type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

// ──────────────────── Writes ────────────────────

export async function wrap(
  walletClient: WalletClient, addrs: ChainAddresses, amount: bigint,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "wrap", args: [amount],
  });
}

export async function unwrap(
  walletClient: WalletClient, addrs: ChainAddresses, amount: bigint,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "unwrap", args: [amount],
  });
}

export async function rebase(
  walletClient: WalletClient, addrs: ChainAddresses, account: `0x${string}`,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "rebase", args: [account],
  });
}

// ──────────────────── Reads ────────────────────

export async function realBalanceOf(
  publicClient: PublicClient, addrs: ChainAddresses, account: `0x${string}`,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "realBalanceOf", args: [account],
  });
}

export async function nominalBalanceOf(
  publicClient: PublicClient, addrs: ChainAddresses, account: `0x${string}`,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "nominalBalanceOf", args: [account],
  });
}

export async function decayRate(
  publicClient: PublicClient, addrs: ChainAddresses,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "decayRate",
  });
}

export async function totalDecayed(
  publicClient: PublicClient, addrs: ChainAddresses,
): Promise<bigint> {
  return read<bigint>(publicClient, {
    address: addrs.demurrageToken, abi: abis.DemurrageToken,
    functionName: "totalDecayed",
  });
}
