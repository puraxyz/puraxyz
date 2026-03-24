/**
 * Provider performance metrics.
 * Time-bucketed counters for latency and success/failure per provider.
 * The gateway IS the monitoring system — every routed request feeds these counters.
 */

import type { Provider } from "./providers";

interface Bucket {
  requests: number;
  failures: number;
  totalLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  updatedAt: number;
}

interface ProviderMetrics {
  "1m": Bucket;
  "5m": Bucket;
  "1h": Bucket;
  "24h": Bucket;
}

type BucketKey = keyof ProviderMetrics;

const BUCKET_DURATIONS: Record<BucketKey, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "1h": 3_600_000,
  "24h": 86_400_000,
};

function freshBucket(): Bucket {
  return { requests: 0, failures: 0, totalLatencyMs: 0, minLatencyMs: Infinity, maxLatencyMs: 0, updatedAt: Date.now() };
}

function freshMetrics(): ProviderMetrics {
  return { "1m": freshBucket(), "5m": freshBucket(), "1h": freshBucket(), "24h": freshBucket() };
}

// In-memory metrics store (works for single-instance; Redis version below for prod)
const metricsStore = new Map<string, ProviderMetrics>();

function getMetrics(provider: string): ProviderMetrics {
  let m = metricsStore.get(provider);
  if (!m) {
    m = freshMetrics();
    metricsStore.set(provider, m);
  }
  return m;
}

function maybeRollBucket(bucket: Bucket, durationMs: number): Bucket {
  const age = Date.now() - bucket.updatedAt;
  if (age > durationMs) return freshBucket();
  return bucket;
}

/**
 * Record a completed request to a provider.
 */
export function recordRequest(provider: Provider | string, latencyMs: number, success: boolean): void {
  const m = getMetrics(provider);
  for (const key of Object.keys(BUCKET_DURATIONS) as BucketKey[]) {
    m[key] = maybeRollBucket(m[key], BUCKET_DURATIONS[key]);
    m[key].requests++;
    if (!success) m[key].failures++;
    m[key].totalLatencyMs += latencyMs;
    m[key].minLatencyMs = Math.min(m[key].minLatencyMs, latencyMs);
    m[key].maxLatencyMs = Math.max(m[key].maxLatencyMs, latencyMs);
    m[key].updatedAt = Date.now();
  }

  // Also persist to Redis if available
  if (process.env.UPSTASH_REDIS_REST_URL) {
    persistToRedis(provider, m).catch(() => {});
  }
}

async function persistToRedis(provider: string, metrics: ProviderMetrics): Promise<void> {
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", `pura:metrics:${provider}`, JSON.stringify(metrics), "EX", "90000"]),
  });
}

export interface ProviderStatus {
  provider: string;
  available: boolean;
  buckets: {
    window: string;
    requests: number;
    failures: number;
    successRate: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
  }[];
}

/**
 * Get status for all tracked providers.
 */
export function getProviderStatuses(): ProviderStatus[] {
  const providers = ["openai", "anthropic", "groq", "gemini"];
  return providers.map((p) => {
    const m = getMetrics(p);
    const buckets = (Object.keys(BUCKET_DURATIONS) as BucketKey[]).map((key) => {
      const b = maybeRollBucket(m[key], BUCKET_DURATIONS[key]);
      return {
        window: key,
        requests: b.requests,
        failures: b.failures,
        successRate: b.requests > 0 ? (b.requests - b.failures) / b.requests : 1,
        avgLatencyMs: b.requests > 0 ? Math.round(b.totalLatencyMs / b.requests) : 0,
        minLatencyMs: b.minLatencyMs === Infinity ? 0 : b.minLatencyMs,
        maxLatencyMs: b.maxLatencyMs,
      };
    });

    const recent = buckets.find((b) => b.window === "5m");
    const available = !recent || recent.requests === 0 || recent.successRate > 0.5;

    return { provider: p, available, buckets };
  });
}
