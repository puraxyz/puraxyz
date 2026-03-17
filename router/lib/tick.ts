import type { Hash, Hex } from "viem";
import {
  getAddresses,
  source,
  pool,
  pricing,
  completion,
  aggregator,
  signCapacityAttestation,
  signCompletionReceipt,
  type SignedAttestation,
} from "@backproto/sdk";
import { publicClient, chainId } from "./chain";
import { getWallets, type AgentName } from "./wallets";
import { agents, agentList, TASK_TYPE_ID } from "./agents";
import { getScenarioState, getFlowRate } from "./scenario";

export interface TickEvent {
  ts: number;
  agent: string;
  action: string;
  txHash?: string;
}

export interface TickResult {
  tickNumber: number;
  phase: string;
  flowRate: string;
  events: TickEvent[];
  error?: string;
}

/**
 * Derive a tick number from the current block timestamp.
 * Uses minutes since a fixed epoch (2026-03-01T00:00:00Z).
 */
const EPOCH = Math.floor(new Date("2026-03-01T00:00:00Z").getTime() / 1000);

async function getTickNumber(): Promise<number> {
  const block = await publicClient.getBlock();
  return Math.floor((Number(block.timestamp) - EPOCH) / 60);
}

export async function executeTick(): Promise<TickResult> {
  const events: TickEvent[] = [];
  const ts = () => Date.now();

  const tickNumber = await getTickNumber();
  const scenario = getScenarioState(tickNumber);
  const targetFlowRate = getFlowRate(scenario);

  const addrs = getAddresses(chainId);
  const wallets = getWallets();

  const poolAddress = await pool.getPoolAddress(publicClient, addrs, TASK_TYPE_ID);

  // ── Step 1: Dispatch adjusts stream flow rate ──

  try {
    const currentFlow = await source.getFlowRate(
      publicClient,
      addrs,
      wallets.dispatch.account!.address,
      poolAddress,
    );

    if (currentFlow !== targetFlowRate) {
      const txHash = await source.startStream(wallets.dispatch, addrs, poolAddress, targetFlowRate);
      events.push({ ts: ts(), agent: "dispatch", action: `flow → ${targetFlowRate}`, txHash });
    }
  } catch (e) {
    events.push({ ts: ts(), agent: "dispatch", action: `flow-error: ${(e as Error).message}` });
  }

  // ── Step 2: Agents submit capacity attestations ──

  const attestations: SignedAttestation[] = [];
  const now = BigInt(Math.floor(Date.now() / 1000));

  for (const name of agentList) {
    const persona = agents[name];
    const wallet = wallets[name];

    try {
      const attestation = {
        taskTypeId: TASK_TYPE_ID,
        sink: wallet.account!.address,
        capacity: persona.declaredCapacity,
        timestamp: now,
        nonce: BigInt(tickNumber),
      };

      const signed = await signCapacityAttestation(
        wallet,
        chainId,
        addrs.offchainAggregator,
        attestation,
      );
      attestations.push(signed);
      events.push({ ts: ts(), agent: name, action: `attest cap=${persona.declaredCapacity}` });
    } catch (e) {
      events.push({ ts: ts(), agent: name, action: `attest-error: ${(e as Error).message}` });
    }
  }

  // Submit attestation batch (any agent can submit)
  if (attestations.length > 0) {
    try {
      const txHash = await aggregator.submitBatch(wallets.atlas, addrs, attestations);
      events.push({ ts: ts(), agent: "atlas", action: `batch ${attestations.length} attestations`, txHash });
    } catch (e) {
      events.push({ ts: ts(), agent: "atlas", action: `batch-error: ${(e as Error).message}` });
    }
  }

  // ── Step 3: Rebalance pool if needed ──

  try {
    const needsRb = await pool.needsRebalance(publicClient, addrs, TASK_TYPE_ID);
    if (needsRb) {
      const txHash = await pool.rebalance(wallets.atlas, addrs, TASK_TYPE_ID);
      events.push({ ts: ts(), agent: "atlas", action: "pool rebalanced", txHash });
    }
  } catch (e) {
    events.push({ ts: ts(), agent: "system", action: `rebalance-error: ${(e as Error).message}` });
  }

  // ── Step 4: Agents complete tasks (or don't) ──

  for (const name of agentList) {
    const persona = agents[name];
    const wallet = wallets[name];

    // Simulate completion based on agent's reliability
    const completes = Math.random() < persona.completionRate;

    if (completes) {
      try {
        const taskId = `0x${tickNumber.toString(16).padStart(64, "0")}` as Hash;

        const receipt = {
          taskTypeId: TASK_TYPE_ID,
          sink: wallet.account!.address,
          source: wallets.dispatch.account!.address,
          taskId,
          timestamp: now,
        };

        const sinkSig = await signCompletionReceipt(
          wallet,
          chainId,
          addrs.completionTracker,
          receipt,
        );

        const txHash = await completion.recordCompletion(
          wallets.dispatch,
          addrs,
          TASK_TYPE_ID,
          wallet.account!.address,
          taskId,
          sinkSig,
        );
        events.push({ ts: ts(), agent: name, action: "task completed", txHash });
      } catch (e) {
        events.push({ ts: ts(), agent: name, action: `completion-error: ${(e as Error).message}` });
      }
    } else {
      events.push({ ts: ts(), agent: name, action: "task missed" });
    }
  }

  // ── Step 5: Report queue loads ──

  for (const name of agentList) {
    const persona = agents[name];
    const wallet = wallets[name];
    const load = BigInt(Math.floor(100 * persona.loadMultiplier[scenario.phase]));

    try {
      const txHash = await pricing.reportQueueLoad(
        wallet,
        addrs,
        TASK_TYPE_ID,
        wallet.account!.address,
        load,
      );
      events.push({ ts: ts(), agent: name, action: `load=${load}`, txHash });
    } catch (e) {
      events.push({ ts: ts(), agent: name, action: `load-error: ${(e as Error).message}` });
    }
  }

  // ── Step 6: Periodic maintenance ──

  // Advance pricing epoch every 10 ticks
  if (tickNumber % 10 === 0) {
    try {
      const txHash = await pricing.advancePricingEpoch(wallets.atlas, addrs, TASK_TYPE_ID);
      events.push({ ts: ts(), agent: "system", action: "pricing epoch advanced", txHash });
    } catch (e) {
      events.push({ ts: ts(), agent: "system", action: `pricing-epoch-error: ${(e as Error).message}` });
    }
  }

  // Advance completion epoch every 20 ticks (triggers slash check)
  if (tickNumber % 20 === 0) {
    for (const name of agentList) {
      try {
        const wallet = wallets[name];
        const txHash = await completion.advanceCompletionEpoch(
          wallets.atlas,
          addrs,
          TASK_TYPE_ID,
          wallet.account!.address,
        );
        events.push({ ts: ts(), agent: name, action: "completion epoch advanced", txHash });
      } catch (e) {
        events.push({ ts: ts(), agent: name, action: `comp-epoch-error: ${(e as Error).message}` });
      }
    }
  }

  return {
    tickNumber,
    phase: scenario.phase,
    flowRate: targetFlowRate.toString(),
    events,
  };
}
