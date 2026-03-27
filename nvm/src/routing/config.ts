/**
 * Routing configuration — all parameters from the paper with env-var overrides.
 *
 * Defaults match:
 *   - CapacityRegistry.sol  (EWMA_ALPHA_BPS = 3000)
 *   - BackpressurePool.sol  (explorationRate = 5e16, MAX_EXPLORATION_RATE = 2e17)
 *   - PricingCurve.sol      (GAMMA_BPS = 10000, ADJUSTMENT_RATE_BPS = 1250)
 *   - CompletionTracker.sol (EPOCH_DURATION = 300)
 */

export interface RoutingConfig {
  /** EWMA smoothing factor. CapacityRegistry: EWMA_ALPHA_BPS/BPS = 0.3 */
  ewmaAlpha: number;
  /** Base exploration rate. BackpressurePool: explorationRate = 5e16 = 5% */
  baseExploration: number;
  /** Max exploration rate. BackpressurePool: MAX_EXPLORATION_RATE = 2e17 = 20% */
  maxExploration: number;
  /** CV threshold for doubling exploration. */
  volatilityThreshold: number;
  /** Epoch duration in seconds. CompletionTracker: EPOCH_DURATION = 300 */
  epochDurationS: number;
  /** Quality score window in epochs. */
  qualityWindowEpochs: number;
  /** Quality weight vector: [completion, latency, error, satisfaction]. */
  qualityWeights: [number, number, number, number];
  /** Price sensitivity. PricingCurve: GAMMA_BPS = 10000. Normalized here to 1.0. */
  pricingGamma: number;
  /** Base fee per job in msats. PricingCurve: DEFAULT_BASE_FEE. */
  pricingBaseFeeMsats: number;
  /** Base fee adjustment per epoch. PricingCurve: ADJUSTMENT_RATE_BPS = 1250 = 12.5% */
  pricingAdjustmentDelta: number;
  /** Pipeline retry count. */
  pipelineMaxRetries: number;
  /** Pipeline node timeout in seconds. */
  pipelineNodeTimeoutS: number;
  /** Routing fee in basis points for the Agent Relay. */
  routingFeeBps: number;
  /** Normalization constant for price factor computation. */
  priceNormalization: number;
}

/** Load config from env vars, falling back to defaults that match the Solidity contracts. */
function loadConfig(): RoutingConfig {
  const env = (key: string, fallback: string) => process.env[key] ?? fallback;
  return {
    ewmaAlpha: parseFloat(env('EWMA_ALPHA', '0.3')),
    baseExploration: parseFloat(env('BASE_EXPLORATION_RATE', '0.05')),
    maxExploration: parseFloat(env('MAX_EXPLORATION_RATE', '0.20')),
    volatilityThreshold: parseFloat(env('VOLATILITY_THRESHOLD', '0.30')),
    epochDurationS: parseInt(env('EPOCH_DURATION_S', '300'), 10),
    qualityWindowEpochs: parseInt(env('QUALITY_WINDOW_EPOCHS', '12'), 10),
    qualityWeights: parseWeights(env('QUALITY_WEIGHTS', '0.4,0.2,0.2,0.2')),
    pricingGamma: parseFloat(env('PRICING_GAMMA', '1.0')),
    pricingBaseFeeMsats: parseInt(env('PRICING_BASE_FEE_MSATS', '1000'), 10),
    pricingAdjustmentDelta: parseFloat(env('PRICING_ADJUSTMENT_DELTA', '0.125')),
    pipelineMaxRetries: parseInt(env('PIPELINE_MAX_RETRIES', '3'), 10),
    pipelineNodeTimeoutS: parseInt(env('PIPELINE_NODE_TIMEOUT_S', '600'), 10),
    routingFeeBps: parseInt(env('ROUTING_FEE_BPS', '100'), 10),
    priceNormalization: parseFloat(env('PRICE_NORMALIZATION', '10000')),
  };
}

function parseWeights(s: string): [number, number, number, number] {
  const parts = s.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return [0.4, 0.2, 0.2, 0.2];
  }
  return parts as [number, number, number, number];
}

export const ROUTING_DEFAULTS: RoutingConfig = loadConfig();
