import { type PublicClient, type WalletClient, type Hash } from "viem";
import { abis } from "../abis/index.js";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";

/**
 * Emit an aggregated system state snapshot for a given scope.
 */
export async function emitState(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  scope: Hash,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.systemStateEmitter, abi: abis.SystemStateEmitter,
    functionName: "emitSystemState", args: [scope],
  });
}
