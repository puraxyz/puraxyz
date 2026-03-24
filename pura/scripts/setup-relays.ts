import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { relay, getAddresses } from "@puraxyz/sdk";

const pk = process.env.OPERATOR_PRIVATE_KEY;
if (!pk) {
  console.error("Set OPERATOR_PRIVATE_KEY in your environment.");
  process.exit(1);
}

const account = privateKeyToAccount(pk as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(process.env.RPC_URL ?? "https://sepolia.base.org"),
});
const addrs = getAddresses(84532);

const RELAYS = [
  {
    pubkey: "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
    capacity: { eventsPerSecond: 500n, storageGB: 100n, bandwidthMbps: 200n },
  },
  {
    pubkey: "0x2222222222222222222222222222222222222222222222222222222222222222" as `0x${string}`,
    capacity: { eventsPerSecond: 300n, storageGB: 50n, bandwidthMbps: 100n },
  },
  {
    pubkey: "0x3333333333333333333333333333333333333333333333333333333333333333" as `0x${string}`,
    capacity: { eventsPerSecond: 800n, storageGB: 200n, bandwidthMbps: 500n },
  },
];

async function main() {
  console.log(`Operator: ${account.address}`);
  for (const r of RELAYS) {
    console.log(`Registering relay ${r.pubkey.slice(0, 10)}…`);
    try {
      const tx = await relay.registerRelay(walletClient, addrs, r.pubkey, r.capacity);
      console.log(`  tx: ${tx}`);
    } catch (e: unknown) {
      console.log(`  skipped (may already be registered): ${(e as Error).message?.slice(0, 80)}`);
    }

    console.log(`  Joining write pool…`);
    try {
      const tx = await relay.joinRelayPool(walletClient, addrs, 0, r.pubkey);
      console.log(`  tx: ${tx}`);
    } catch (e: unknown) {
      console.log(`  skipped: ${(e as Error).message?.slice(0, 80)}`);
    }
  }

  console.log("Done. Relays registered on Base Sepolia.");
}

main().catch(console.error);
