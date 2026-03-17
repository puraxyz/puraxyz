import { NextResponse } from "next/server";
import { getAddresses } from "@backproto/sdk";
import { publicClient, chainId } from "@/lib/chain";
import { getWallets, type AgentName } from "@/lib/wallets";
import { agentList } from "@/lib/agents";

export const runtime = "nodejs";
export const maxDuration = 60;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
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
] as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addrs = getAddresses(chainId);
  const wallets = getWallets();
  const dispatchAddr = wallets.dispatch.account!.address;

  const results: Record<string, string> = {};

  for (const name of agentList) {
    const wallet = wallets[name as AgentName];
    const addr = wallet.account!.address;

    try {
      const balance = (await publicClient.readContract({
        address: addrs.paymentSuperToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [addr],
      })) as bigint;

      if (balance > 0n) {
        const tx = await wallet.writeContract({
          address: addrs.paymentSuperToken,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [dispatchAddr, balance],
          chain: wallet.chain ?? null,
          account: wallet.account!,
        });
        results[name] = `swept ${balance} → ${tx}`;
      } else {
        results[name] = "0 balance";
      }
    } catch (e) {
      results[name] = `error: ${(e as Error).message}`;
    }
  }

  return NextResponse.json({ swept: results, dispatch: dispatchAddr });
}
