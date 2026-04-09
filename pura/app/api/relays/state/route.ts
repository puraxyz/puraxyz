import { NextResponse } from "next/server";
import { getAddresses, relay } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";

export const runtime = "nodejs";

const TIMEOUT_MS = 5_000;

export async function GET() {
  const addrs = getAddresses(chainId);

  const rpcResult = await Promise.race([
    (async () => {
      const { pubkeys, capacities } = await relay
        .getAllRelays(publicClient, addrs)
        .catch(() => ({ pubkeys: [] as `0x${string}`[], capacities: [] as bigint[] }));

      const relays = await Promise.all(
        pubkeys.map(async (pubkey, i) => {
          const operator = await relay
            .getRelayOperator(publicClient, addrs, pubkey)
            .catch(() => null);
          return {
            pubkey,
            operator,
            capacity: capacities[i].toString(),
            registered: operator !== null,
          };
        }),
      );

      const [writeMin, readMin, storeMin] = await Promise.all([
        relay.getAntiSpamMinimum(publicClient, addrs, 0).catch(() => 0n),
        relay.getAntiSpamMinimum(publicClient, addrs, 1).catch(() => 0n),
        relay.getAntiSpamMinimum(publicClient, addrs, 2).catch(() => 0n),
      ]);

      return { relays, writeMin, readMin, storeMin };
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("rpc timeout")), TIMEOUT_MS),
    ),
  ]).catch(() => null);

  if (!rpcResult) {
    return NextResponse.json(
      { error: "rpc timeout", seed: true },
      { status: 503 },
    );
  }

  const { relays, writeMin, readMin, storeMin } = rpcResult;

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
