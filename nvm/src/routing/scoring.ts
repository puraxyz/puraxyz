/**
 * Scoring functions for the BPE routing algorithm.
 *
 * Mirrors BackpressurePool.sol's unit weight calculation:
 *   units(K) = C_smooth(K) × SCALE / totalCapacity
 *
 * And the exploration blending:
 *   blended = (1 − ε) × boltzmann + ε × uniform
 * where ε adapts based on quality score volatility (CV).
 */

import type { AgentCapacity } from '../capacity/cache.js';

/**
 * Compute the BPE routing weight for a single agent.
 *
 * weight = effective_capacity × price_factor
 * effective_capacity = smoothedCapacity × qualityScore
 * price_factor = 1 / (1 + priceMsats / priceNormalization)
 */
export function computeWeight(
  agent: AgentCapacity,
  qualityScore: number,
  priceNormalization: number,
): number {
  const effectiveCapacity = agent.smoothedCapacity * qualityScore;
  const priceFactor = 1.0 / (1.0 + agent.priceMsats / priceNormalization);
  return effectiveCapacity * priceFactor;
}

/**
 * Coefficient of variation — std_dev / mean.
 * Used to measure volatility in quality scores for adaptive exploration.
 *
 * When CV > volatilityThreshold, exploration rate doubles.
 * Matches BackpressurePool.sol's exploration rate adaptation.
 */
export function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Compute effective exploration rate based on quality score volatility.
 *
 * base rate: 0.05 (5%), matching BackpressurePool.explorationRate
 * if CV > threshold: rate = min(maxRate, base × 2)
 * max rate: 0.20 (20%), matching BackpressurePool.MAX_EXPLORATION_RATE
 */
export function adaptiveExplorationRate(
  qualityScores: number[],
  baseRate: number,
  maxRate: number,
  volatilityThreshold: number,
): number {
  const cv = coefficientOfVariation(qualityScores);
  if (cv > volatilityThreshold) {
    return Math.min(maxRate, baseRate * 2);
  }
  return baseRate;
}
