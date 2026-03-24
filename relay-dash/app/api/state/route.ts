import { NextResponse } from "next/server";
import { getAddresses, relay } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/chain";

export const runtime = "nodejs";

const DEMO_RELAYS: `0x${string}`[] = [
  "0x1111111111111111111111111111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333333333333333333333333333",
];

export async function GET() {
  const addrs = getAddresses(chainId);

  const relays = await Promise.all(
    DEMO_RELAYS.map(async (pubkey) => {
      const [operator, capacity] = await Promise.all([
        relay.getRelayOperator(publicClient, addrs, pubkey).catch(() => null),
        relay.getCompositeCapacity(publicClient, addrs, pubkey).catch(() => 0n),
      ]);
      return {
        pubkey,
        operator,
        capacity: capacity.toString(),
        registered: operator !== null,
      };
    }),
  );

  const [writeMin, readMin, storeMin] = await Promise.all([
    relay.getAntiSpamMinimum(publicClient, addrs, 0).catch(() => 0n),
    relay.getAntiSpamMinimum(publicClient, addrs, 1).catch(() => 0n),
    relay.getAntiSpamMinimum(publicClient, addrs, 2).catch(() => 0n),
  ]);

  return NextResponse.json({
    relays: relays.filter((r) => r.registered),
    antiSpamMinimums: {
      write: writeMin.toString(),
      read: readMin.toString(),
      store: storeMin.toString(),
    },
    totalRelays: relays.filter((r) => r.registered).length,
    chainId,
  });
}
