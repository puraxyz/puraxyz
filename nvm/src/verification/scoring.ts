/**
 * Quality scoring — composite score from completion receipt history.
 *
 * Composite formula (matching ReputationLedger.sol's weighted average concept):
 *   score = w_completion × completionRate
 *         + w_latency   × latencyScore
 *         + w_error     × errorScore
 *         + w_satisfaction × satisfactionScore
 *
 * Default weights: [0.4, 0.2, 0.2, 0.2]
 * All components normalized to [0, 1] and EWMA-smoothed with α=0.3.
 *
 * CompletionTracker.sol reference:
 *   rate = completions / declaredCapacity (capped at 100%)
 *   SLASH_THRESHOLD_BPS = 5000 (50%)
 */

import { ewma, DEFAULT_ALPHA } from '../capacity/ewma.js';

/**
 * Normalize latency to a [0, 1] quality score.
 * Lower latency = higher score.
 *
 * score = max(0, 1 − latencyMs / maxLatencyMs)
 * maxLatencyMs = 30_000 (30s ceiling — anything slower is effectively zero quality).
 */
export function normalizeLatency(latencyMs: number, maxLatencyMs = 30_000): number {
  if (latencyMs <= 0) return 1;
  return Math.max(0, 1 - latencyMs / maxLatencyMs);
}

/**
 * Normalize error rate (in basis points) to a [0, 1] quality score.
 * Lower error rate = higher score.
 *
 * score = max(0, 1 − errorRateBps / 10000)
 */
export function normalizeErrorRate(errorRateBps: number): number {
  return Math.max(0, 1 - errorRateBps / 10000);
}

/**
 * Compute composite quality score from individual components.
 * All inputs should be [0, 1]. Output is [0, 1].
 */
export function compositeScore(
  completionRate: number,
  latencyScore: number,
  errorScore: number,
  satisfactionScore: number,
  weights: [number, number, number, number] = [0.4, 0.2, 0.2, 0.2],
): number {
  return (
    weights[0] * completionRate +
    weights[1] * latencyScore +
    weights[2] * errorScore +
    weights[3] * satisfactionScore
  );
}

/**
 * EWMA-smoothed score tracker for a single agent.
 * Maintains smoothed values for each component.
 */
export class SmoothedScores {
  completionRate: number | undefined;
  latencyScore: number | undefined;
  errorScore: number | undefined;
  satisfactionScore: number | undefined;
  private alpha: number;

  constructor(alpha = DEFAULT_ALPHA) {
    this.alpha = alpha;
  }

  update(
    rawCompletionRate: number,
    rawLatencyScore: number,
    rawErrorScore: number,
    rawSatisfactionScore: number,
  ): void {
    this.completionRate = ewma(rawCompletionRate, this.completionRate, this.alpha);
    this.latencyScore = ewma(rawLatencyScore, this.latencyScore, this.alpha);
    this.errorScore = ewma(rawErrorScore, this.errorScore, this.alpha);
    this.satisfactionScore = ewma(rawSatisfactionScore, this.satisfactionScore, this.alpha);
  }

  composite(weights?: [number, number, number, number]): number {
    return compositeScore(
      this.completionRate ?? 0.5,
      this.latencyScore ?? 0.5,
      this.errorScore ?? 0.5,
      this.satisfactionScore ?? 0.5,
      weights,
    );
  }
}
