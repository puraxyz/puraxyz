/**
 * EWMA — Exponential Weighted Moving Average.
 *
 * Identical to CapacityRegistry.sol:
 *   C_smooth = α * C_raw + (1 − α) * C_smooth_prev
 *   α = 0.3 (EWMA_ALPHA_BPS = 3000, BPS = 10000)
 *
 * Reference: Jacobson (1988), "Congestion avoidance and control" — same
 * smoothing parameter used in TCP RTT estimation.
 */

/** Default smoothing factor matching CapacityRegistry.sol's EWMA_ALPHA_BPS / BPS. */
export const DEFAULT_ALPHA = 0.3;

/**
 * Compute one EWMA step.
 * If prev is undefined (first observation), returns raw.
 */
export function ewma(raw: number, prev: number | undefined, alpha = DEFAULT_ALPHA): number {
  if (prev === undefined) return raw;
  return alpha * raw + (1 - alpha) * prev;
}
