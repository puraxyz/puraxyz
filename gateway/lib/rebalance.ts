import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId, operatorWallet } from "./chain";
import { GATEWAY_TASK_TYPE } from "./routing";

/**
 * Check if the pool needs rebalancing and trigger if so.
 * Called periodically or after completions.
 */
export async function maybeRebalance(): Promise<string | null> {
  try {
    const addrs = getAddresses(chainId);
    const needs = await pool.needsRebalance(publicClient, addrs, GATEWAY_TASK_TYPE);
    if (!needs) return null;

    const wallet = operatorWallet();
    const hash = await pool.rebalance(wallet, addrs, GATEWAY_TASK_TYPE);
    return hash;
  } catch {
    return null;
  }
}
