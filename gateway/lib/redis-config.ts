/**
 * Centralized Redis/KV configuration.
 * Supports both UPSTASH_REDIS_REST_* and Vercel KV_REST_API_* env var names.
 */

export function getRedisUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

export function getRedisToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export function useRedis(): boolean {
  return !!(getRedisUrl() && getRedisToken());
}
