/**
 * Quality scoring from provider metrics.
 * Combines success rate and latency into a 0–1 score per provider.
 * Used by routing.ts to weight capacity units before selection.
 */

import { getProviderStatuses } from "./metrics";

/**
 * Returns a quality score between 0 and 1 for the given provider.
 *
 * Score = 0.6 * successRate_1h + 0.4 * (1 - normalizedLatency_1h)
 *
 * When no data exists (cold start), returns 1.0 so the provider
 * is treated as fully capable until proven otherwise.
 */
export function getQualityScore(provider: string): number {
  const statuses = getProviderStatuses();
  const status = statuses.find((s) => s.provider === provider);
  if (!status) return 1.0;

  const hourBucket = status.buckets.find((b) => b.window === "1h");
  if (!hourBucket || hourBucket.requests === 0) return 1.0;

  const successRate = hourBucket.successRate;

  // Normalize latency: anything under 500ms is perfect (1.0),
  // anything over 10s is terrible (0.0), linear between.
  const latencyScore = Math.max(0, Math.min(1, 1 - (hourBucket.avgLatencyMs - 500) / 9500));

  return 0.6 * successRate + 0.4 * latencyScore;
}
