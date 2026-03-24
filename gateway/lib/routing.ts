import { type Hash } from "viem";
import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId } from "./chain";
import { getProviderConfigs, type Provider } from "./providers";

/** Task type ID used for the gateway pool (bytes32) */
export const GATEWAY_TASK_TYPE: Hash =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

/** Provider addresses in the pool (set during setup) */
export interface ProviderSink {
  provider: Provider;
  address: `0x${string}`;
}

// Provider sink mapping — populated by setup script, hardcoded for MVP
// These are the operator-controlled addresses representing each provider in the pool.
// In production these would come from config/chain state.
const PROVIDER_SINKS: ProviderSink[] = [
  {
    provider: "openai",
    address: (process.env.OPENAI_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000001") as `0x${string}`,
  },
  {
    provider: "anthropic",
    address: (process.env.ANTHROPIC_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000002") as `0x${string}`,
  },
  {
    provider: "groq",
    address: (process.env.GROQ_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000003") as `0x${string}`,
  },
];

/**
 * Select a provider based on pool capacity.
 * Reads member units (capacity weight) for each provider sink from BackpressurePool.
 * Returns the provider with the highest available units.
 * Falls back to round-robin if chain reads fail.
 */
export async function selectProvider(requestModel?: string): Promise<Provider> {
  // If user explicitly requests a model, route directly
  if (requestModel) {
    if (requestModel.startsWith("gpt") || requestModel.startsWith("o")) return "openai";
    if (requestModel.startsWith("claude")) return "anthropic";
    if (requestModel.startsWith("llama") || requestModel.startsWith("mixtral") || requestModel.startsWith("gemma")) return "groq";
  }

  // Check which providers are actually configured
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

    // Filter to only configured providers
    const configuredNames = new Set(available.map((c) => c.name));
    const eligible = units.filter((u) => configuredNames.has(u.provider));

    if (eligible.length === 0) return available[0].name;

    // Pick provider with highest units (most spare capacity)
    eligible.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
    return eligible[0].provider;
  } catch {
    // Chain read failed — simple round-robin fallback
    const idx = Math.floor(Date.now() / 1000) % available.length;
    return available[idx].name;
  }
}

/**
 * Pick the first available provider that isn't the one that just failed.
 */
export function getFallbackProvider(failed: Provider): Provider {
  const available = getProviderConfigs();
  const alt = available.find((c) => c.name !== failed);
  return alt?.name ?? "openai";
}
