import { type Hash } from "viem";
import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId } from "../shared/chain";
import { getProviderConfigs, type Provider } from "./providers";

export const GATEWAY_TASK_TYPE: Hash =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export interface ProviderSink {
  provider: Provider;
  address: `0x${string}`;
}

const PROVIDER_SINKS: ProviderSink[] = [
  {
    provider: "openai",
    address: (process.env.OPENAI_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000001") as `0x${string}`,
  },
  {
    provider: "anthropic",
    address: (process.env.ANTHROPIC_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000002") as `0x${string}`,
  },
];

export async function selectProvider(requestModel?: string): Promise<Provider> {
  if (requestModel) {
    if (requestModel.startsWith("gpt") || requestModel.startsWith("o")) return "openai";
    if (requestModel.startsWith("claude")) return "anthropic";
  }

  const available = getProviderConfigs();
  if (available.length === 0) throw new Error("No LLM providers configured");
  if (available.length === 1) return available[0].name;

  try {
    const addrs = getAddresses(chainId);

    const units = await Promise.all(
      PROVIDER_SINKS.map(async (sink) => {
        const u = await pool
          .getMemberUnits(publicClient, addrs, GATEWAY_TASK_TYPE, sink.address)
          .catch(() => 0n);
        return { provider: sink.provider, units: u };
      }),
    );

    const configuredNames = new Set(available.map((c) => c.name));
    const eligible = units.filter((u) => configuredNames.has(u.provider));

    if (eligible.length === 0) return available[0].name;

    eligible.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
    return eligible[0].provider;
  } catch {
    const idx = Math.floor(Date.now() / 1000) % available.length;
    return available[idx].name;
  }
}
