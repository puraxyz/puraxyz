/**
 * Example: Register an OpenClaw agent as a BPE sink.
 *
 * This demonstrates the basic flow:
 * 1. Stake tokens to meet minimum requirements
 * 2. Register agent with skill type and initial capacity
 * 3. Periodically update capacity based on real metrics
 * 4. Query reputation and agent status
 *
 * Usage: npx tsx openclaw-agent.ts
 */

import { createPublicClient, createWalletClient, http, keccak256, toBytes, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getAddresses } from "../addresses.js";
import * as stake from "../actions/stake.js";
import * as openclaw from "../actions/openclaw.js";

async function main() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const addrs = getAddresses(baseSepolia.id);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() }) as unknown as PublicClient;
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  // Step 1: Stake (if not already staked)
  const currentStake = await stake.getStake(publicClient, addrs, account.address);
  if (currentStake === 0n) {
    console.log("Staking 500 tokens...");
    await stake.stake(walletClient, addrs, 500n * 10n ** 18n);
  }

  // Step 2: Register agent
  const agentId = keccak256(toBytes("my-openclaw-agent-001"));
  const skillTypeId = keccak256(toBytes("email-management"));

  console.log("Registering agent...");
  await openclaw.registerAgent(walletClient, addrs, agentId, skillTypeId, {
    throughput: 50n,     // 50 skill executions per epoch
    latencyMs: 2000n,    // 2 second average response
    errorRateBps: 100n,  // 1% error rate
  });

  // Step 3: Check agent status
  const agent = await openclaw.getAgent(publicClient, addrs, agentId);
  console.log("Agent registered:", {
    operator: agent.operator,
    capacity: agent.smoothedCapacity.toString(),
    active: agent.active,
  });

  // Step 4: Update capacity (call periodically with real metrics)
  console.log("Updating capacity...");
  await openclaw.updateCapacity(walletClient, addrs, agentId, {
    throughput: 60n,     // Improved throughput
    latencyMs: 1500n,    // Lower latency
    errorRateBps: 50n,   // Lower error rate
  });

  const updatedCapacity = await openclaw.getSmoothedCapacity(publicClient, addrs, agentId);
  console.log("Smoothed capacity after update:", updatedCapacity.toString());

  // Step 5: Check reputation
  const rep = await openclaw.getOpenClawReputation(publicClient, addrs, account.address);
  console.log("Reputation:", {
    score: rep.score.toString(),
    completions: rep.completions.toString(),
    slashCount: rep.slashCount.toString(),
  });

  const discount = await openclaw.getOpenClawStakeDiscount(publicClient, addrs, account.address);
  console.log("Cross-domain stake discount:", `${Number(discount) / 100}%`);
}

main().catch(console.error);
