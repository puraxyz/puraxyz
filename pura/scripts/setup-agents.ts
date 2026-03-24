import { createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { openclaw, getAddresses } from "@puraxyz/sdk";

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

const SKILL_CODE_GEN = keccak256(toHex("code-generation"));

const AGENTS = [
  {
    id: keccak256(toHex("agent-alpha")),
    skillTypeId: SKILL_CODE_GEN,
    capacity: { throughput: 100n, latencyMs: 500n, errorRateBps: 50n },
  },
  {
    id: keccak256(toHex("agent-beta")),
    skillTypeId: SKILL_CODE_GEN,
    capacity: { throughput: 200n, latencyMs: 300n, errorRateBps: 25n },
  },
  {
    id: keccak256(toHex("agent-gamma")),
    skillTypeId: SKILL_CODE_GEN,
    capacity: { throughput: 150n, latencyMs: 400n, errorRateBps: 100n },
  },
];

async function main() {
  console.log(`Operator: ${account.address}`);
  console.log(`Skill type (code-generation): ${SKILL_CODE_GEN}`);
  for (const a of AGENTS) {
    console.log(`Registering agent ${a.id.slice(0, 10)}…`);
    try {
      const tx = await openclaw.registerAgent(
        walletClient, addrs, a.id, a.skillTypeId, a.capacity,
      );
      console.log(`  tx: ${tx}`);
    } catch (e: unknown) {
      console.log(`  skipped (may already be registered): ${(e as Error).message?.slice(0, 80)}`);
    }
  }

  console.log("Done. Agents registered on Base Sepolia.");
  console.log(`\nAdd to .env:\nAGENT_SKILL_TYPE=${SKILL_CODE_GEN}`);
}

main().catch(console.error);
