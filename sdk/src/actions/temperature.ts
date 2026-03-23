import { type PublicClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { read } from "../helpers.js";

/**
 * Read current system temperature τ from the oracle.
 */
export async function getTemperature(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<bigint> {
  return read(client, {
    address: addrs.temperatureOracle, abi: abis.TemperatureOracle,
    functionName: "getTemperature",
  }) as Promise<bigint>;
}

/**
 * Compute Boltzmann weight for a given capacity value.
 */
export async function boltzmannWeight(
  client: PublicClient,
  addrs: ChainAddresses,
  capacity: bigint,
): Promise<bigint> {
  return read(client, {
    address: addrs.temperatureOracle, abi: abis.TemperatureOracle,
    functionName: "boltzmannWeight", args: [capacity],
  }) as Promise<bigint>;
}

/**
 * Read τ_min and τ_max bounds.
 */
export async function getTauBounds(
  client: PublicClient,
  addrs: ChainAddresses,
): Promise<{ tauMin: bigint; tauMax: bigint }> {
  const [tauMin, tauMax] = await Promise.all([
    read(client, {
      address: addrs.temperatureOracle, abi: abis.TemperatureOracle,
      functionName: "tauMin",
    }) as Promise<bigint>,
    read(client, {
      address: addrs.temperatureOracle, abi: abis.TemperatureOracle,
      functionName: "tauMax",
    }) as Promise<bigint>,
  ]);
  return { tauMin, tauMax };
}
