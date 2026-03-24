import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId, operatorWallet } from "../shared/chain";
import { GATEWAY_TASK_TYPE } from "./routing";

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
