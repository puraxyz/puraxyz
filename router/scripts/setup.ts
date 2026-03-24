/**
 * One-time setup script for the router demo.
 * Registers task type, creates pool, stakes + registers agents, starts stream.
 *
 * Usage: cd router && npx tsx scripts/setup.ts
 * Requires .env with ATLAS_PRIVATE_KEY, BEACON_PRIVATE_KEY, CIPHER_PRIVATE_KEY, DISPATCH_PRIVATE_KEY
 */
import "dotenv/config";
import {
  getAddresses,
  source,
  sink,
  pool,
  stake as stakeModule,
} from "@puraxyz/sdk";
import { publicClient, chainId } from "../lib/chain";
import { getWallets } from "../lib/wallets";
import { agents, agentList, TASK_TYPE_ID } from "../lib/agents";

const addrs = getAddresses(chainId);
const wallets = getWallets();

async function main() {
  console.log(`Setting up router on chain ${chainId}`);
  console.log(`Task type: ${TASK_TYPE_ID}`);

  // 1. Register task type (Dispatch is the source/owner)
  console.log("\n1. Registering task type...");
  try {
    const tx = await source.registerTaskType(wallets.dispatch, addrs, TASK_TYPE_ID, 10n);
    console.log(`   Task type registered: ${tx}`);
  } catch (e) {
    console.log(`   Already registered or error: ${(e as Error).message}`);
  }

  // 2. Create pool
  console.log("\n2. Creating pool...");
  try {
    const tx = await pool.createPool(wallets.dispatch, addrs, TASK_TYPE_ID);
    console.log(`   Pool created: ${tx}`);
  } catch (e) {
    console.log(`   Already exists or error: ${(e as Error).message}`);
  }

  const poolAddress = await pool.getPoolAddress(publicClient, addrs, TASK_TYPE_ID);
  console.log(`   Pool address: ${poolAddress}`);

  // 3. Stake + register each agent
  for (const name of agentList) {
    const persona = agents[name];
    const wallet = wallets[name];
    const addr = wallet.account!.address;
    console.log(`\n3-${name}. Setting up ${persona.label} (${addr})...`);

    // Stake
    try {
      const stakeAmount = 100n * 10n ** 18n; // 100 tokens
      const tx = await stakeModule.stake(wallet, addrs, stakeAmount);
      console.log(`   Staked: ${tx}`);
    } catch (e) {
      console.log(`   Stake error: ${(e as Error).message}`);
    }

    // Register as sink
    try {
      const tx = await sink.registerSink(wallet, addrs, TASK_TYPE_ID, persona.declaredCapacity);
      console.log(`   Registered sink (cap=${persona.declaredCapacity}): ${tx}`);
    } catch (e) {
      console.log(`   Register error: ${(e as Error).message}`);
    }
  }

  // 4. Start stream from Dispatch → Pool
  console.log("\n4. Starting initial stream...");
  try {
    const initialFlowRate = 500000000000000n; // 5e14 wei/sec (ramp phase)
    const tx = await source.startStream(wallets.dispatch, addrs, poolAddress, initialFlowRate);
    console.log(`   Stream started: ${tx}`);
  } catch (e) {
    console.log(`   Stream error: ${(e as Error).message}`);
  }

  console.log("\n✓ Setup complete. Start the CRON or run locally.");
}

main().catch(console.error);
