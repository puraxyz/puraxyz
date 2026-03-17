/**
 * Sweep script: transfer accumulated tokens from agent wallets back to Dispatch.
 * Keeps the closed-loop economy running.
 *
 * Usage: cd router && npx tsx scripts/sweep.ts
 */
import "dotenv/config";
import { getAddresses } from "@backproto/sdk";
import { publicClient, chainId } from "../lib/chain";
import { getWallets } from "../lib/wallets";
import { agentList } from "../lib/agents";

const addrs = getAddresses(chainId);
const wallets = getWallets();

async function main() {
  const dispatchAddr = wallets.dispatch.account!.address;
  console.log(`Sweeping to Dispatch: ${dispatchAddr}`);

  for (const name of agentList) {
    const wallet = wallets[name];
    const addr = wallet.account!.address;

    // Check SuperToken balance
    const balance = (await publicClient.readContract({
      address: addrs.paymentSuperToken,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [addr],
    })) as bigint;

    if (balance > 0n) {
      console.log(`  ${name}: ${balance} → transferring to Dispatch...`);
      try {
        const tx = await wallet.writeContract({
          address: addrs.paymentSuperToken,
          abi: [
            {
              name: "transfer",
              type: "function",
              stateMutability: "nonpayable",
              inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "transfer",
          args: [dispatchAddr, balance],
          chain: wallet.chain ?? null,
          account: wallet.account!,
        });
        console.log(`  ${name}: swept ${balance} → ${tx}`);
      } catch (e) {
        console.log(`  ${name}: sweep error: ${(e as Error).message}`);
      }
    } else {
      console.log(`  ${name}: 0 balance, skipping`);
    }
  }

  console.log("\n✓ Sweep complete.");
}

main().catch(console.error);
