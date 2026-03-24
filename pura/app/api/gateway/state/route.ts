import { NextResponse } from "next/server";
import { getAddresses, pool, pricing, completion } from "@puraxyz/sdk";
import { publicClient, chainId } from "@/lib/shared/chain";
import { GATEWAY_TASK_TYPE } from "@/lib/gateway/routing";
import { listKeys } from "@/lib/gateway/keys";
import { getProviderConfigs } from "@/lib/gateway/providers";

export const runtime = "nodejs";

export async function GET() {
  const addrs = getAddresses(chainId);
  const providers = getProviderConfigs();

  const openaiAddr = process.env.OPENAI_SINK_ADDRESS as `0x${string}` | undefined;
  const anthropicAddr = process.env.ANTHROPIC_SINK_ADDRESS as `0x${string}` | undefined;

  const sinks = [
    { name: "openai", address: openaiAddr },
    { name: "anthropic", address: anthropicAddr },
  ];

  const sinkStates = await Promise.all(
    sinks.map(async (s) => {
      if (!s.address) return { name: s.name, configured: false };
      const [units, compRate, comps, price] = await Promise.all([
        pool.getMemberUnits(publicClient, addrs, GATEWAY_TASK_TYPE, s.address).catch(() => 0n),
        completion.getCompletionRate(publicClient, addrs, GATEWAY_TASK_TYPE, s.address).catch(() => 0n),
        completion.getCompletions(publicClient, addrs, GATEWAY_TASK_TYPE, s.address).catch(() => 0n),
        pricing.getPrice(publicClient, addrs, GATEWAY_TASK_TYPE, s.address).catch(() => 0n),
      ]);
      return {
        name: s.name,
        configured: true,
        address: s.address,
        units: units.toString(),
        completionRate: compRate.toString(),
        completions: comps.toString(),
        price: price.toString(),
      };
    }),
  );

  const poolAddress = await pool
    .getPoolAddress(publicClient, addrs, GATEWAY_TASK_TYPE)
    .catch(() => null);

  const baseFee = await pricing
    .getBaseFee(publicClient, addrs, GATEWAY_TASK_TYPE)
    .catch(() => 0n);

  const keys = listKeys();
  const totalRequests = keys.reduce((sum, k) => sum + k.requests, 0);

  return NextResponse.json({
    providers: providers.map((p) => p.name),
    sinks: sinkStates,
    pool: poolAddress,
    baseFee: baseFee.toString(),
    chainId,
    keys: {
      total: keys.length,
      totalRequests,
      withWallet: keys.filter((k) => k.wallet).length,
    },
  });
}
