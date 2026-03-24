import { NextResponse } from "next/server";
import {
  getAddresses,
  pool,
  stake,
  pricing,
  completion,
  source,
} from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/chain";
import { getWallets, type AgentName } from "@/lib/wallets";
import { agents, agentList, TASK_TYPE_ID } from "@/lib/agents";
import { getScenarioState } from "@/lib/scenario";

export const runtime = "nodejs";

export async function GET() {
  const addrs = getAddresses(chainId);

  // Derive tick number from block timestamp
  const EPOCH = Math.floor(new Date("2026-03-01T00:00:00Z").getTime() / 1000);
  const block = await publicClient.getBlock();
  const tickNumber = Math.floor((Number(block.timestamp) - EPOCH) / 60);
  const scenario = getScenarioState(tickNumber);

  let wallets: ReturnType<typeof getWallets> | null = null;
  try {
    wallets = getWallets();
  } catch {
    // Env vars not set — return partial state
  }

  const poolAddress = await pool
    .getPoolAddress(publicClient, addrs, TASK_TYPE_ID)
    .catch(() => null);

  // Read agent states
  const agentStates: Record<
    string,
    {
      address: string;
      stake: string;
      capacityCap: string;
      poolUnits: string;
      completionRate: string;
      completions: string;
      queueLoad: string;
      price: string;
    }
  > = {};

  for (const name of agentList) {
    const addr = wallets?.[name]?.account?.address;
    if (!addr) continue;

    const [stk, cap, units, compRate, comps, load, price] = await Promise.all([
      stake.getStake(publicClient, addrs, addr).catch(() => 0n),
      stake.getCapacityCap(publicClient, addrs, addr).catch(() => 0n),
      pool.getMemberUnits(publicClient, addrs, TASK_TYPE_ID, addr).catch(() => 0n),
      completion.getCompletionRate(publicClient, addrs, TASK_TYPE_ID, addr).catch(() => 0n),
      completion.getCompletions(publicClient, addrs, TASK_TYPE_ID, addr).catch(() => 0n),
      pricing.getQueueLoad(publicClient, addrs, TASK_TYPE_ID, addr).catch(() => 0n),
      pricing.getPrice(publicClient, addrs, TASK_TYPE_ID, addr).catch(() => 0n),
    ]);

    agentStates[name] = {
      address: addr,
      stake: stk.toString(),
      capacityCap: cap.toString(),
      poolUnits: units.toString(),
      completionRate: compRate.toString(),
      completions: comps.toString(),
      queueLoad: load.toString(),
      price: price.toString(),
    };
  }

  // Global state
  const dispatchAddr = wallets?.dispatch?.account?.address;
  const baseFee = await pricing.getBaseFee(publicClient, addrs, TASK_TYPE_ID).catch(() => 0n);

  let flowRate = 0n;
  if (dispatchAddr && poolAddress) {
    flowRate = await source
      .getFlowRate(publicClient, addrs, dispatchAddr, poolAddress)
      .catch(() => 0n);
  }

  return NextResponse.json({
    tickNumber,
    phase: scenario.phase,
    tickInPhase: scenario.tickInPhase,
    flowRateMultiplier: scenario.flowRateMultiplier,
    baseFee: baseFee.toString(),
    flowRate: flowRate.toString(),
    agents: agentStates,
    poolAddress,
    chainId,
    blockNumber: block.number.toString(),
  });
}
