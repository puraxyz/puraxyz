/**
 * Example: Multi-agent OpenClaw pipeline using BPE Pipeline.sol.
 *
 * Chains three agents into a research pipeline:
 *   Agent A (Research) -> Agent B (Analysis) -> Agent C (Report)
 *
 * Payment streams cascade through pipeline stages. If Agent B is at capacity,
 * backpressure propagates upstream, throttling new work at Agent A.
 *
 * Usage: npx tsx openclaw-pipeline.ts
 */

import { createPublicClient, createWalletClient, http, keccak256, toBytes, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getAddresses } from "../addresses.js";
import * as pool from "../actions/pool.js";
import * as source from "../actions/source.js";
import * as openclaw from "../actions/openclaw.js";

async function main() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const addrs = getAddresses(baseSepolia.id);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() }) as unknown as PublicClient;
  const walletClient = createWalletClient({ chain: baseSepolia, transport: http(), account });

  // Define skill types for each pipeline stage
  const researchSkill = keccak256(toBytes("openclaw-research"));
  const analysisSkill = keccak256(toBytes("openclaw-analysis"));
  const reportSkill = keccak256(toBytes("openclaw-report"));

  // Step 1: Create pools for each stage
  console.log("Creating pipeline pools...");
  const pool1Tx = await pool.createPool(walletClient, addrs, researchSkill);
  const pool2Tx = await pool.createPool(walletClient, addrs, analysisSkill);
  const pool3Tx = await pool.createPool(walletClient, addrs, reportSkill);
  console.log("Pools created:", { pool1Tx, pool2Tx, pool3Tx });

  // Step 2: Check registered agents for each stage
  const researchers = await openclaw.getAgentsForSkill(publicClient, addrs, researchSkill);
  const analysts = await openclaw.getAgentsForSkill(publicClient, addrs, analysisSkill);
  const reporters = await openclaw.getAgentsForSkill(publicClient, addrs, reportSkill);
  console.log("Pipeline agents:", {
    researchers: researchers.length,
    analysts: analysts.length,
    reporters: reporters.length,
  });

  // Step 3: Start a payment stream into the first stage
  // The flow rate determines payment per second to the research pool
  const flowRate = 1000n; // tokens per second
  console.log("Starting payment stream to research pool...");
  await source.startStream(walletClient, addrs, researchSkill, flowRate);

  // Step 4: Check if pools need rebalancing
  // The Pipeline contract handles upstream propagation automatically
  const needsRebalance = await pool.needsRebalance(publicClient, addrs, researchSkill);
  if (needsRebalance) {
    console.log("Rebalancing research pool...");
    await pool.rebalance(walletClient, addrs, researchSkill);
  }

  console.log("Pipeline active. Agents receive streaming payments proportional to capacity.");
  console.log("Backpressure propagates upstream when downstream stages are congested.");
}

main().catch(console.error);
