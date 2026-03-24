import { NextResponse } from "next/server";
import { getAddresses, lightning } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";

export const runtime = "nodejs";

export async function GET() {
  const addrs = getAddresses(chainId);

  const { pubkeys, capacities } = await lightning
    .getAllNodes(publicClient, addrs)
    .catch(() => ({ pubkeys: [] as `0x${string}`[], capacities: [] as bigint[] }));

  const nodes = await Promise.all(
    pubkeys.map(async (pubkey, i) => {
      const fee = await lightning
        .getRoutingFee(publicClient, addrs, pubkey)
        .catch(() => 0n);
      return {
        pubkey,
        capacity: capacities[i].toString(),
        fee: fee.toString(),
        active: capacities[i] > 0n,
      };
    }),
  );

  return NextResponse.json({
    nodes: nodes.filter((n) => n.active),
    totalNodes: nodes.filter((n) => n.active).length,
    chainId,
  });
}
