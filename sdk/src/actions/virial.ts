import { type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { read } from "../helpers.js";

/**
 * Read current virial ratio V from the monitor.
 */
export async function getVirialRatio(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<bigint> {
  return read(client, {
    address: addrs.virialMonitor, abi: abis.VirialMonitor,
    functionName: "getVirialRatio",
  }) as Promise<bigint>;
}

/**
 * Read recommended demurrage rate from virial monitor.
 */
export async function getRecommendedDemurrageRate(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<bigint> {
  return read(client, {
    address: addrs.virialMonitor, abi: abis.VirialMonitor,
    functionName: "recommendedDemurrageRate",
  }) as Promise<bigint>;
}

/**
 * Read recommended stake adjustment hint.
 */
export async function getStakeAdjustment(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<bigint> {
  return read(client, {
    address: addrs.virialMonitor, abi: abis.VirialMonitor,
    functionName: "recommendedStakeAdjustment",
  }) as Promise<bigint>;
}

/**
 * Read equilibrium target.
 */
export async function getEquilibriumTarget(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<bigint> {
  return read(client, {
    address: addrs.virialMonitor, abi: abis.VirialMonitor,
    functionName: "equilibriumTarget",
  }) as Promise<bigint>;
}
