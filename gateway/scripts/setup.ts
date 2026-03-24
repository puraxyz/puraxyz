/**
 * Gateway setup script.
 * Registers provider sinks and creates the BackpressurePool for the gateway.
 * Run once: npx tsx scripts/setup.ts
 */

import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { getAddresses, sink, pool } from "@puraxyz/sdk";

const chainId = Number(process.env.CHAIN_ID ?? 84532);

function getChain(): Chain {
  if (chainId === 8453) return base;
  return baseSepolia;
}

const rpcUrl =
  process.env.RPC_URL ??
  (chainId === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org");

async function main() {
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  if (!pk) {
    console.error("Set OPERATOR_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = getChain();

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const addrs = getAddresses(chainId);
  const TASK_TYPE =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

  console.log(`Operator: ${account.address}`);
  console.log(`Chain: ${chainId}`);
  console.log();

  // 1. Register OpenAI sink
  const openaiSink =
    process.env.OPENAI_SINK_ADDRESS ??
    "0x0000000000000000000000000000000000000001";
  console.log(`Registering OpenAI sink: ${openaiSink}`);
  try {
    const tx = await sink.registerSink(
      walletClient,
      addrs,
      TASK_TYPE,
      1000n, // initial capacity
    );
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message}`);
  }

  // 2. Register Anthropic sink
  const anthropicSink =
    process.env.ANTHROPIC_SINK_ADDRESS ??
    "0x0000000000000000000000000000000000000002";
  console.log(`Registering Anthropic sink: ${anthropicSink}`);
  try {
    const tx = await sink.registerSink(
      walletClient,
      addrs,
      TASK_TYPE,
      1000n, // initial capacity
    );
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message}`);
  }

  // 3. Create pool
  console.log(`\nCreating pool for task type ${TASK_TYPE}…`);
  try {
    const tx = await pool.createPool(walletClient, addrs, TASK_TYPE);
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message}`);
  }

  // 4. Read pool address
  const poolAddr = await pool
    .getPoolAddress(publicClient, addrs, TASK_TYPE)
    .catch(() => null);
  console.log(`\nPool address: ${poolAddr ?? "not found"}`);

  console.log("\nDone. Add sink addresses to your .env:");
  console.log(`OPENAI_SINK_ADDRESS=${openaiSink}`);
  console.log(`ANTHROPIC_SINK_ADDRESS=${anthropicSink}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
