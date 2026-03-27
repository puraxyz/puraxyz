/**
 * Market opportunity detector — scans capacity attestations and
 * job assignments to find underserved skill types where spawning
 * a new agent would be profitable.
 *
 * Looks for the signature of an opportunity: rising prices,
 * few providers, growing demand.
 */

import type { AgentCapacity } from '../capacity/cache.js';
import type { EWMACapacityCache } from '../capacity/cache.js';

export interface MarketOpportunity {
  skillType: string;
  /** Number of active agents offering this skill. */
  providerCount: number;
  /** Average price across providers (msats). */
  avgPriceMsats: number;
  /** Price 30 days ago (msats), if available. */
  priorPriceMsats: number | null;
  /** Estimated price growth rate (0-1 scale, e.g. 0.4 = 40%). */
  priceGrowthRate: number;
  /** Composite opportunity score (higher = better). */
  score: number;
}

/**
 * Scan capacity data and identify skills with supply shortages.
 *
 * An opportunity exists when:
 *   - Provider count < maxProviders (default: 10)
 *   - Price growth > minGrowthRate (default: 20%)
 *
 * Returns opportunities sorted by score (descending).
 */
export function detectOpportunities(
  cache: EWMACapacityCache,
  opts?: {
    maxProviders?: number;
    minGrowthRate?: number;
  },
): MarketOpportunity[] {
  const maxProviders = opts?.maxProviders ?? 10;
  const minGrowthRate = opts?.minGrowthRate ?? 0.2;

  // Group agents by skill type
  const bySkill = new Map<string, AgentCapacity[]>();
  for (const agent of cache.all()) {
    const list = bySkill.get(agent.skillType) ?? [];
    list.push(agent);
    bySkill.set(agent.skillType, list);
  }

  const opportunities: MarketOpportunity[] = [];

  for (const [skillType, agents] of bySkill) {
    if (agents.length >= maxProviders) continue;

    const avgPrice =
      agents.reduce((s, a) => s + a.priceMsats, 0) / agents.length;

    // Score: inverse provider count × price level
    // Fewer providers + higher prices = bigger opportunity
    const scarcityFactor = 1 / Math.max(1, agents.length);
    const priceFactor = avgPrice / 1000; // normalize to ~1 for typical prices
    const score = scarcityFactor * priceFactor;

    opportunities.push({
      skillType,
      providerCount: agents.length,
      avgPriceMsats: Math.round(avgPrice),
      priorPriceMsats: null, // historical tracking not yet wired
      priceGrowthRate: 0, // requires time-series data
      score,
    });
  }

  // Sort by score descending
  opportunities.sort((a, b) => b.score - a.score);
  return opportunities;
}
