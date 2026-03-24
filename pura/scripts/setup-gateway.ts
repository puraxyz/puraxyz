import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { getAddresses, sink, pool } from "@puraxyz/sdk";

const rpcUrl = process.env.RPC_URL ?? "https://sepolia.base.org";

async function main() {
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  if (!pk) {
    console.error("Set OPERATOR_PRIVATE_KEY in .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const addrs = getAddresses(84532);
  const TASK_TYPE =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

  console.log(`Operator: ${account.address}`);

  // Register OpenAI sink
  console.log("Registering OpenAI sink…");
  try {
    const tx = await sink.registerSink(walletClient, addrs, TASK_TYPE, 1000n);
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message?.slice(0, 80)}`);
  }

  // Register Anthropic sink
  console.log("Registering Anthropic sink…");
  try {
    const tx = await sink.registerSink(walletClient, addrs, TASK_TYPE, 1000n);
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message?.slice(0, 80)}`);
  }

  // Create pool
  console.log("Creating pool…");
  try {
    const tx = await pool.createPool(walletClient, addrs, TASK_TYPE);
    console.log(`  tx: ${tx}`);
  } catch (e) {
    console.log(`  skipped (may already exist): ${(e as Error).message?.slice(0, 80)}`);
  }

  const poolAddr = await pool
    .getPoolAddress(publicClient, addrs, TASK_TYPE)
    .catch(() => null);
  console.log(`Pool address: ${poolAddr ?? "not found"}`);

  console.log("\nDone. Set these in Vercel env vars:");
  console.log("OPENAI_SINK_ADDRESS=<your openai sink wallet address>");
  console.log("ANTHROPIC_SINK_ADDRESS=<your anthropic sink wallet address>");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
