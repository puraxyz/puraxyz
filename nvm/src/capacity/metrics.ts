/**
 * Local load measurement — reads the agent's current resource utilization.
 *
 * Maps to the off-chain OffchainAggregator.sol concept: collect runtime
 * metrics, compute capacity, push attestations.
 */

export interface LoadSnapshot {
  /** Currently active tasks. */
  activeTasks: number;
  /** Tasks waiting in queue. */
  queueDepth: number;
  /** p50 response time in ms (recent window). */
  latencyP50Ms: number;
  /** Errors per 10,000 requests in the recent window. */
  errorRateBps: number;
  /** Estimated jobs-per-epoch this agent can handle right now. */
  availableCapacity: number;
  /** Max simultaneous jobs. */
  maxConcurrent: number;
  /** Timestamp of measurement. */
  timestamp: number;
}

/** In-memory ring buffer of recent request latencies for p50 calculation. */
const recentLatencies: number[] = [];
const MAX_LATENCY_SAMPLES = 200;

let totalRequests = 0;
let totalErrors = 0;
let activeTasks = 0;
let queueDepth = 0;
let maxConcurrent = 10;

/** Record a completed request (for latency/error tracking). */
export function recordRequest(latencyMs: number, errored: boolean): void {
  recentLatencies.push(latencyMs);
  if (recentLatencies.length > MAX_LATENCY_SAMPLES) recentLatencies.shift();
  totalRequests++;
  if (errored) totalErrors++;
}

/** Record task lifecycle events. */
export function taskStarted(): void { activeTasks++; }
export function taskEnded(): void { activeTasks = Math.max(0, activeTasks - 1); }
export function taskQueued(): void { queueDepth++; }
export function taskDequeued(): void { queueDepth = Math.max(0, queueDepth - 1); }

/** Set max concurrent (from config). */
export function setMaxConcurrent(n: number): void { maxConcurrent = n; }

/** Take a snapshot of current load. */
export function measureLoad(): LoadSnapshot {
  const sorted = [...recentLatencies].sort((a, b) => a - b);
  const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;

  // Error rate over recent window (or lifetime if window too small)
  const errorRate = totalRequests > 0
    ? Math.round((totalErrors / totalRequests) * 10000)
    : 0;

  // Available capacity: how many more jobs we can handle this epoch
  const freeSlots = Math.max(0, maxConcurrent - activeTasks);
  // Epoch = 300s. Assume avg job takes latencyP50 ms. Rough estimate.
  const avgJobDurationS = p50 > 0 ? p50 / 1000 : 5;
  const epochDurationS = 300;
  const availableCapacity = Math.floor(freeSlots * (epochDurationS / avgJobDurationS));

  return {
    activeTasks,
    queueDepth,
    latencyP50Ms: p50,
    errorRateBps: errorRate,
    availableCapacity,
    maxConcurrent,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/** Reset all counters (for testing). */
export function resetMetrics(): void {
  recentLatencies.length = 0;
  totalRequests = 0;
  totalErrors = 0;
  activeTasks = 0;
  queueDepth = 0;
}
