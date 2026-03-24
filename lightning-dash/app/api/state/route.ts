import { NextResponse } from "next/server";
import { getAddresses, lightning } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/chain";

export const runtime = "nodejs";

const DEMO_NODES: `0x${string}`[] = [
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
];

export async function GET() {
  const addrs = getAddresses(chainId);

  const nodes = await Promise.all(
    DEMO_NODES.map(async (pubkey) => {
      const [capacity, fee] = await Promise.all([
        lightning.getSmoothedCapacity(publicClient, addrs, pubkey).catch(() => 0n),
        lightning.getRoutingFee(publicClient, addrs, pubkey).catch(() => 0n),
      ]);
      return {
        pubkey,
        capacity: capacity.toString(),
        fee: fee.toString(),
        active: capacity > 0n,
      };
    }),
  );

  return NextResponse.json({
    nodes: nodes.filter((n) => n.active),
    totalNodes: nodes.filter((n) => n.active).length,
    chainId,
  });
}
