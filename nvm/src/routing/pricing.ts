/**
 * Dynamic pricing — price rises with congestion, matching PricingCurve.sol.
 *
 * PricingCurve.sol formula:
 *   congestion = 1 + γ × u / (1 − u)
 *   where u = load / capacity (utilization), γ = GAMMA_BPS / BPS
 *
 * Base fee adjustment (EIP-1559 style):
 *   if epochDemand > totalCapacity → baseFee += baseFee × 12.5%
 *   else → baseFee -= baseFee × 12.5% (floored at MIN_BASE_FEE)
 */

export interface PricingInputs {
  /** Current queue depth for this agent. */
  queueDepth: number;
  /** Smoothed capacity from EWMA cache. */
  smoothedCapacity: number;
  /** Base fee in msats. */
  baseFeeMsats: number;
  /** Price sensitivity. PricingCurve: GAMMA_BPS/BPS = 1.0 */
  gamma: number;
}

/**
 * Compute the dynamic price for a single job.
 *
 * price = baseFee × (1 + γ × utilization / (1 − utilization))
 *
 * Utilization is capped at 0.99 to avoid division by zero,
 * matching PricingCurve.sol's MAX_UTILIZATION = 99e16.
 */
export function computeDynamicPrice(inputs: PricingInputs): number {
  const { queueDepth, smoothedCapacity, baseFeeMsats, gamma } = inputs;

  if (smoothedCapacity <= 0) return baseFeeMsats;

  let utilization = queueDepth / smoothedCapacity;
  if (utilization > 0.99) utilization = 0.99; // MAX_UTILIZATION cap

  const congestionMultiplier = 1 + gamma * utilization / (1 - utilization);
  return Math.round(baseFeeMsats * congestionMultiplier);
}

/**
 * Adjust base fee for next epoch (EIP-1559 style).
 *
 * PricingCurve.sol: ADJUSTMENT_RATE_BPS = 1250 (12.5%)
 * MIN_BASE_FEE = 1 msat (avoid zero).
 */
export function adjustBaseFee(
  currentFeeMsats: number,
  epochDemand: number,
  totalCapacity: number,
  adjustmentDelta = 0.125,
): number {
  const minFee = 1;
  if (epochDemand > totalCapacity && totalCapacity > 0) {
    // Congested — increase
    return Math.round(currentFeeMsats * (1 + adjustmentDelta));
  }
  // Under capacity — decrease
  const decreased = Math.round(currentFeeMsats * (1 - adjustmentDelta));
  return Math.max(minFee, decreased);
}
