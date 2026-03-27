/**
 * BPE routing algorithm — the core max-weight scheduler.
 *
 * Implements the same routing logic as BackpressurePool.sol's rebalance,
 * adapted for Nostr event-driven operation:
 *
 * 1. Collect candidates from EWMA cache by skill type
 * 2. Compute weighted scores: effective_capacity × price_factor
 * 3. Adaptive exploration: if quality score CV > threshold, double ε
 * 4. Select: with probability ε pick uniformly (explore), else pick max weight (exploit)
 * 5. Compute dynamic price via PricingCurve formula
 * 6. Return selected agent + assignment metadata
 */

import type { EWMACapacityCache, AgentCapacity } from '../capacity/cache.js';
import { computeWeight, adaptiveExplorationRate } from './scoring.js';
import { computeDynamicPrice } from './pricing.js';
import type { RoutingConfig } from './config.js';
import { ROUTING_DEFAULTS } from './config.js';

export interface QualityCache {
  /** Get quality score for an agent (0.0 - 1.0). Returns 0.5 for unknown agents. */
  getScore(pubkey: string): number;
  /** Get all known quality scores (for volatility computation). */
  allScores(): number[];
}

export interface RoutingResult {
  agent: AgentCapacity;
  explored: boolean;
  routingScore: number;
  priceMsats: number;
  alternatives: number;
}

/**
 * Route a job to the best available agent.
 *
 * Returns null if no agents are available for the requested skill type.
 */
export function routeJob(
  skillType: string,
  capacityCache: EWMACapacityCache,
  qualityCache: QualityCache,
  config: RoutingConfig = ROUTING_DEFAULTS,
): RoutingResult | null {
  // Step 1: collect candidates
  const candidates = capacityCache.getAgentsForSkill(skillType);
  if (candidates.length === 0) return null;

  // Step 2: compute weighted scores
  const scored = candidates.map((agent) => {
    const quality = qualityCache.getScore(agent.pubkey);
    const weight = computeWeight(agent, quality, config.priceNormalization);
    return { agent, quality, weight };
  });

  // Step 3: adaptive exploration
  const allQuality = qualityCache.allScores();
  const explorationRate = adaptiveExplorationRate(
    allQuality,
    config.baseExploration,
    config.maxExploration,
    config.volatilityThreshold,
  );

  // Step 4: select
  let selected: (typeof scored)[0];
  let explored: boolean;

  if (Math.random() < explorationRate) {
    // Explore: uniform random
    selected = scored[Math.floor(Math.random() * scored.length)];
    explored = true;
  } else {
    // Exploit: max weight
    selected = scored.reduce((best, curr) => curr.weight > best.weight ? curr : best);
    explored = false;
  }

  // Step 5: compute dynamic price
  const priceMsats = computeDynamicPrice({
    queueDepth: selected.agent.maxConcurrent, // approximate current load
    smoothedCapacity: selected.agent.smoothedCapacity,
    baseFeeMsats: config.pricingBaseFeeMsats,
    gamma: config.pricingGamma,
  });

  return {
    agent: selected.agent,
    explored,
    routingScore: selected.weight,
    priceMsats,
    alternatives: candidates.length,
  };
}
