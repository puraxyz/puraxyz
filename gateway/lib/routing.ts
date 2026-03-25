import { type Hash } from "viem";
import { getAddresses, pool } from "@puraxyz/sdk";
import { publicClient, chainId } from "./chain";
import { getProviderConfigs, type Provider } from "./providers";
import { scoreComplexity, tierToProviders, adjustTier, type ComplexityTier } from "./complexity";
import { getQualityScore } from "./quality";
import { getProviderStatuses } from "./metrics";
import type { ChatMessage } from "./providers";
import { log } from "./log";

// Cost per 1K tokens — mirrors budget.ts, used for maxCost filter
const COST_PER_1K: Record<string, number> = {
  openai: 0.005,
  anthropic: 0.003,
  groq: 0.0003,
  gemini: 0.0005,
};

/** Task type ID used for the gateway pool (bytes32) */
export const GATEWAY_TASK_TYPE: Hash =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

/** Optional routing hints from the request body */
export interface RoutingHints {
  quality?: "low" | "balanced" | "high";
  prefer?: string;
  maxCost?: number;
  maxLatency?: number;
  excludeProviders?: string[];
}

/** Provider addresses in the pool (set during setup) */
export interface ProviderSink {
  provider: Provider;
  address: `0x${string}`;
}

// Provider sink mapping — populated by setup script, hardcoded for MVP
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

/** Base exploration rate — 5% of requests try a non-preferred provider */
const BASE_EPSILON = 0.05;

/**
 * Decide whether this request should explore a non-preferred provider.
 * Doubles the exploration rate when any provider shows >20% error rate
 * or avg latency >5s in the 5-minute window.
 */
function shouldExplore(): { explore: boolean; epsilon: number } {
  const statuses = getProviderStatuses();
  let epsilon = BASE_EPSILON;

  const volatile = statuses.some((s) => {
    const bucket = s.buckets.find((b) => b.window === "5m");
    if (!bucket || bucket.requests === 0) return false;
    return bucket.successRate < 0.8 || bucket.avgLatencyMs > 5000;
  });
  if (volatile) epsilon = BASE_EPSILON * 2;

  return { explore: Math.random() < epsilon, epsilon };
}

/**
 * Apply experimental pre-filters to a candidate set.
 * Returns the filtered set, or the original set if filtering removes everything.
 */
function applyExperimentalFilters(
  candidates: { provider: Provider; units: bigint }[],
  hints: RoutingHints,
): { filtered: { provider: Provider; units: bigint }[]; usedFields: string[] } {
  const usedFields: string[] = [];
  let result = [...candidates];

  if (hints.maxCost !== undefined) {
    usedFields.push("maxCost");
    result = result.filter((c) => (COST_PER_1K[c.provider] ?? 1) <= hints.maxCost!);
  }

  if (hints.maxLatency !== undefined) {
    usedFields.push("maxLatency");
    const statuses = getProviderStatuses();
    result = result.filter((c) => {
      const status = statuses.find((s) => s.provider === c.provider);
      const bucket = status?.buckets.find((b) => b.window === "5m");
      if (!bucket || bucket.requests === 0) return true; // no data = allow
      return bucket.avgLatencyMs <= hints.maxLatency!;
    });
  }

  if (hints.excludeProviders && hints.excludeProviders.length > 0) {
    usedFields.push("excludeProviders");
    const excluded = new Set(hints.excludeProviders);
    result = result.filter((c) => !excluded.has(c.provider));
  }

  // If all candidates were filtered out, fall back to the original set
  if (result.length === 0) return { filtered: candidates, usedFields };
  return { filtered: result, usedFields };
}

export interface SelectResult {
  provider: Provider;
  tier: ComplexityTier;
  explored: boolean;
  experimentalFields: string[];
}

/**
 * Select a provider based on task complexity, pool capacity, quality scores,
 * and optional routing hints.
 *
 * Pipeline:
 * 1. Explicit model → route directly.
 * 2. Score complexity → adjust tier by quality preference.
 * 3. Check exploration (adaptive epsilon).
 * 4. Read on-chain capacity weights → multiply by quality score.
 * 5. Apply prefer hint (2x weight) and experimental filters.
 * 6. Pick highest weighted-capacity provider in the preferred tier.
 */
export async function selectProvider(
  requestModel?: string,
  messages?: ChatMessage[],
  hints?: RoutingHints,
): Promise<SelectResult> {
  const noopResult = (provider: Provider, tier: ComplexityTier): SelectResult => ({
    provider, tier, explored: false, experimentalFields: [],
  });

  // If user explicitly requests a model, route directly
  if (requestModel) {
    if (requestModel.startsWith("gpt") || requestModel.startsWith("o")) return noopResult("openai", "premium");
    if (requestModel.startsWith("claude")) return noopResult("anthropic", "premium");
    if (requestModel.startsWith("llama") || requestModel.startsWith("mixtral") || requestModel.startsWith("gemma")) return noopResult("groq", "cheap");
    if (requestModel.startsWith("gemini")) return noopResult("gemini", "mid");
  }

  const available = getProviderConfigs();
  if (available.length === 0) throw new Error("No LLM providers configured");

  const configuredNames = new Set(available.map((c) => c.name));

  // Score complexity and adjust for quality preference
  const rawTier = messages ? scoreComplexity(messages) : "mid";
  const tier = adjustTier(rawTier, hints?.quality);
  const preferred = tierToProviders(tier).filter((p) => configuredNames.has(p as Provider));

  if (preferred.length === 0) return noopResult(available[0].name, tier);

  // Adaptive exploration
  const { explore } = shouldExplore();
  if (explore) {
    const nonPreferred = Array.from(configuredNames).filter((p) => !preferred.includes(p));
    if (nonPreferred.length > 0) {
      const pick = nonPreferred[Math.floor(Math.random() * nonPreferred.length)] as Provider;
      log.info("routing.explore", { provider: pick, tier, reason: "epsilon" });
      return { provider: pick, tier, explored: true, experimentalFields: [] };
    }
  }

  try {
    const addrs = getAddresses(chainId);

    let units = await Promise.all(
      PROVIDER_SINKS.filter((s) => configuredNames.has(s.provider)).map(async (sink) => {
        const u = await pool
          .getMemberUnits(publicClient, addrs, GATEWAY_TASK_TYPE, sink.address)
          .catch(() => 0n);

        // Multiply capacity by quality score (converts bigint to number, back to bigint)
        const quality = getQualityScore(sink.provider);
        const weighted = BigInt(Math.floor(Number(u) * quality));

        return { provider: sink.provider, units: weighted };
      }),
    );

    // Apply prefer hint: 2x weight for the named provider
    if (hints?.prefer && configuredNames.has(hints.prefer as Provider)) {
      units = units.map((u) =>
        u.provider === hints.prefer ? { ...u, units: u.units * 2n } : u,
      );
    }

    // Apply experimental filters
    let experimentalFields: string[] = [];
    if (hints) {
      const result = applyExperimentalFilters(units, hints);
      units = result.filtered;
      experimentalFields = result.usedFields;
    }

    // Among preferred providers, pick the one with highest weighted capacity
    const preferredSet = new Set(preferred);
    const eligible = units.filter((u) => preferredSet.has(u.provider));

    if (eligible.length > 0) {
      eligible.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
      return { provider: eligible[0].provider as Provider, tier, explored: false, experimentalFields };
    }

    // Fall back to any configured provider with highest capacity
    units.sort((a, b) => (b.units > a.units ? 1 : b.units < a.units ? -1 : 0));
    return {
      provider: (units[0]?.provider ?? preferred[0]) as Provider,
      tier,
      explored: false,
      experimentalFields,
    };
  } catch {
    return noopResult(preferred[0] as Provider, tier);
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
