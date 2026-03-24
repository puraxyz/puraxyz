import { type Hash } from "viem";
import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId } from "./chain";
import { getProviderConfigs, type Provider } from "./providers";
import { scoreComplexity, tierToProviders, type ComplexityTier } from "./complexity";
import type { ChatMessage } from "./providers";

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
  {
    provider: "gemini",
    address: (process.env.GEMINI_SINK_ADDRESS ?? "0x0000000000000000000000000000000000000004") as `0x${string}`,
  },
];

/**
 * Select a provider based on task complexity and pool capacity.
 * 1. If user explicitly requests a model, route directly.
 * 2. Score task complexity (cheap/mid/premium) from messages.
 * 3. Read on-chain capacity weights and prefer providers that match the tier.
 * Falls back to round-robin if chain reads fail.
 */
export async function selectProvider(requestModel?: string, messages?: ChatMessage[]): Promise<{ provider: Provider; tier: ComplexityTier }> {
  // If user explicitly requests a model, route directly
  if (requestModel) {
    if (requestModel.startsWith("gpt") || requestModel.startsWith("o")) return { provider: "openai", tier: "premium" };
    if (requestModel.startsWith("claude")) return { provider: "anthropic", tier: "premium" };
    if (requestModel.startsWith("llama") || requestModel.startsWith("mixtral") || requestModel.startsWith("gemma")) return { provider: "groq", tier: "cheap" };
    if (requestModel.startsWith("gemini")) return { provider: "gemini", tier: "mid" };
  }

  // Check which providers are actually configured
  const available = getProviderConfigs();
  if (available.length === 0) throw new Error("No LLM providers configured");

  const configuredNames = new Set(available.map((c) => c.name));

  // Score complexity
  const tier = messages ? scoreComplexity(messages) : "mid";
  const preferred = tierToProviders(tier).filter((p) => configuredNames.has(p as Provider));

  if (preferred.length === 0) return { provider: available[0].name, tier };

  try {
    const addrs = getAddresses(chainId);

    const units = await Promise.all(
      PROVIDER_SINKS.filter((s) => configuredNames.has(s.provider)).map(async (sink) => {
        const u = await pool
          .getMemberUnits(publicClient, addrs, GATEWAY_TASK_TYPE, sink.address)
          .catch(() => 0n);
        return { provider: sink.provider, units: u };
      }),
    );

    // Among preferred providers, pick the one with highest capacity
    const preferredSet = new Set(preferred);
    const eligible = units.filter((u) => preferredSet.has(u.provider));

    if (eligible.length > 0) {
      eligible.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
      return { provider: eligible[0].provider, tier };
    }

    // Fall back to any configured provider with highest capacity
    units.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
    return { provider: units[0]?.provider ?? (preferred[0] as Provider), tier };
  } catch {
    // Chain read failed — use first preferred provider
    return { provider: preferred[0] as Provider, tier };
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
