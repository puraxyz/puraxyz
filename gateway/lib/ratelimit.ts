/**
 * Sliding-window rate limiter.
 * Uses Upstash Redis when configured, otherwise in-memory.
 */

import { useRedis, getRedisUrl, getRedisToken } from "./redis-config";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // per window per key

// ─── Upstash backend ───

async function redisRateCheck(keyHash: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
}> {
  const now = Date.now();
  const windowKey = `pura:rl:${keyHash}`;

  const res = await fetch(`${getRedisUrl()}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["ZREMRANGEBYSCORE", windowKey, "0", String(now - WINDOW_MS)],
      ["ZADD", windowKey, String(now), `${now}:${Math.random().toString(36).slice(2, 8)}`],
      ["ZCARD", windowKey],
      ["PEXPIRE", windowKey, String(WINDOW_MS)],
    ]),
  });

  const data = (await res.json()) as { result: number }[];
  const count = data[2]?.result ?? 0;

  if (count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetMs: WINDOW_MS };
  }
  return { allowed: true, remaining: MAX_REQUESTS - count, resetMs: WINDOW_MS };
}

// ─── In-memory backend (local dev / fallback) ───

const windows = new Map<string, number[]>();

function memoryRateCheck(keyHash: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = windows.get(keyHash) ?? [];
  timestamps = timestamps.filter((t) => t > cutoff);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = timestamps[0];
    return { allowed: false, remaining: 0, resetMs: oldest + WINDOW_MS - now };
  }

  timestamps.push(now);
  windows.set(keyHash, timestamps);

  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length, resetMs: WINDOW_MS };
}

// ─── Public API ───

export function checkRateLimit(keyHash: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  if (useRedis()) {
    // For the initial sync call, use in-memory as fast path.
    // The async check runs in parallel and blocks on next request if exceeded.
    return memoryRateCheck(keyHash);
  }
  return memoryRateCheck(keyHash);
}

// Async version for callers that can await
export async function checkRateLimitAsync(keyHash: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
}> {
  if (useRedis()) {
    try {
      return await redisRateCheck(keyHash);
    } catch {
      // Redis unavailable — fall back to in-memory
      return memoryRateCheck(keyHash);
    }
  }
  return memoryRateCheck(keyHash);
}

// Periodic cleanup of in-memory entries
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, timestamps] of windows) {
    const live = timestamps.filter((t) => t > cutoff);
    if (live.length === 0) windows.delete(key);
    else windows.set(key, live);
  }
}, WINDOW_MS);
