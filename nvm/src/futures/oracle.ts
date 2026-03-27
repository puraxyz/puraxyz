/**
 * Capacity price oracle — computes reference prices for
 * capacity futures from recent completion receipts and
 * capacity attestations.
 *
 * The oracle publishes no events itself; it provides price
 * data that the matcher uses to validate execution prices.
 */

import type { EWMACapacityCache } from '../capacity/cache.js';

export interface PriceSnapshot {
  skillType: string;
  /** Weighted average price across all providers (msats). */
  avgPriceMsats: number;
  /** Min price among active providers. */
  minPriceMsats: number;
  /** Max price among active providers. */
  maxPriceMsats: number;
  /** Number of providers sampled. */
  providerCount: number;
  /** Timestamp of snapshot. */
  timestamp: number;
}

/** Compute a price snapshot for a skill type from capacity data. */
export function priceSnapshot(
  cache: EWMACapacityCache,
  skillType: string,
): PriceSnapshot | null {
  const agents = cache.getAgentsForSkill(skillType);
  if (agents.length === 0) return null;

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const a of agents) {
    sum += a.priceMsats;
    if (a.priceMsats < min) min = a.priceMsats;
    if (a.priceMsats > max) max = a.priceMsats;
  }

  return {
    skillType,
    avgPriceMsats: Math.round(sum / agents.length),
    minPriceMsats: min,
    maxPriceMsats: max,
    providerCount: agents.length,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/** Compute price snapshots for all known skill types. */
export function allPriceSnapshots(cache: EWMACapacityCache): PriceSnapshot[] {
  const seen = new Set<string>();
  const snapshots: PriceSnapshot[] = [];

  for (const agent of cache.all()) {
    if (seen.has(agent.skillType)) continue;
    seen.add(agent.skillType);
    const snap = priceSnapshot(cache, agent.skillType);
    if (snap) snapshots.push(snap);
  }

  return snapshots;
}
