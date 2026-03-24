import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { lightning, getAddresses } from "@puraxyz/sdk";

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

const DEMO_NODES = [
  {
    pubkey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
    capacitySats: 5_000_000n,
  },
  {
    pubkey: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
    capacitySats: 2_000_000n,
  },
  {
    pubkey: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`,
    capacitySats: 8_000_000n,
  },
];

async function main() {
  for (const n of DEMO_NODES) {
    console.log(`Registering node ${n.pubkey.slice(0, 10)}…`);
    try {
      const tx = await lightning.registerNode(walletClient, addrs, n.pubkey, n.capacitySats);
      console.log(`  tx: ${tx}`);
    } catch (e: unknown) {
      console.log(`  skipped (may already be registered): ${(e as Error).message?.slice(0, 80)}`);
    }

    console.log(`  Joining routing pool…`);
    try {
      const tx = await lightning.joinRoutingPool(walletClient, addrs, n.pubkey);
      console.log(`  tx: ${tx}`);
    } catch (e: unknown) {
      console.log(`  skipped: ${(e as Error).message?.slice(0, 80)}`);
    }
  }

  console.log("Done. Lightning nodes registered on Base Sepolia.");
}

main().catch(console.error);
