import { NextResponse } from "next/server";
import { getAddresses, lightning } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const amountStr = searchParams.get("amount") ?? "100000";
  const maxNodesStr = searchParams.get("maxNodes") ?? "5";

  const amount = BigInt(amountStr);
  const maxNodes = BigInt(maxNodesStr);
  const addrs = getAddresses(chainId);

  const route = await lightning
    .getOptimalRoute(publicClient, addrs, amount, maxNodes)
    .catch(() => ({ nodePubkeys: [], allocations: [], fees: [] }));

  return NextResponse.json({
    route: {
      nodes: route.nodePubkeys,
      allocations: route.allocations.map((a) => a.toString()),
      fees: route.fees.map((f) => f.toString()),
    },
    amountSats: amountStr,
    maxNodes: maxNodesStr,
    chainId,
  });
}
