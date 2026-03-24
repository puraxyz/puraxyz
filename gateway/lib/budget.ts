/**
 * Per-key budget enforcement.
 * Tracks daily spend per API key in Redis (or in-memory for dev).
 * Returns 402 when budget is exhausted.
 */

import type { Provider } from "./providers";

// Approximate cost per 1K tokens by provider (USD)
const COST_PER_1K: Record<string, number> = {
  openai: 0.005, // gpt-4o
  anthropic: 0.003, // claude-sonnet
  groq: 0.0003, // llama-3.3-70b
  gemini: 0.0005, // gemini-2.0-flash
};

const DEFAULT_DAILY_CAP_USD = 10;
const DAY_MS = 86_400_000;

interface DailyBudget {
  spentUsd: number;
  windowStart: number;
  perModel: Record<string, number>;
  requestCount: number;
}

// In-memory fallback for dev
const memBudgets = new Map<string, DailyBudget>();

function todayWindow(): number {
  return Math.floor(Date.now() / DAY_MS) * DAY_MS;
}

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  });
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string, exSeconds?: number): Promise<void> {
  const cmd = exSeconds ? ["SET", key, value, "EX", String(exSeconds)] : ["SET", key, value];
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
}

function freshBudget(): DailyBudget {
  return { spentUsd: 0, windowStart: todayWindow(), perModel: {}, requestCount: 0 };
}

async function loadBudget(keyHash: string): Promise<DailyBudget> {
  const window = todayWindow();

  if (useRedis()) {
    const raw = await redisGet(`pura:budget:${keyHash}`);
    if (raw) {
      const b = JSON.parse(raw) as DailyBudget;
      if (b.windowStart === window) return b;
    }
    return freshBudget();
  }

  const b = memBudgets.get(keyHash);
  if (b && b.windowStart === window) return b;
  return freshBudget();
}

async function saveBudget(keyHash: string, budget: DailyBudget): Promise<void> {
  if (useRedis()) {
    // Expire at end of day + 1 hour buffer
    const ttl = Math.ceil((budget.windowStart + DAY_MS + 3_600_000 - Date.now()) / 1000);
    await redisSet(`pura:budget:${keyHash}`, JSON.stringify(budget), Math.max(ttl, 3600));
  } else {
    memBudgets.set(keyHash, budget);
  }
}

export function estimateCostUsd(provider: Provider | string, totalTokens: number): number {
  const rate = COST_PER_1K[provider] ?? COST_PER_1K.openai;
  return (totalTokens / 1000) * rate;
}

export interface BudgetCheck {
  allowed: boolean;
  spentUsd: number;
  remainingUsd: number;
  capUsd: number;
}

/**
 * Check if a key has remaining budget for today.
 */
export async function checkBudget(keyHash: string): Promise<BudgetCheck> {
  const cap = Number(process.env.PURA_DAILY_CAP_USD ?? DEFAULT_DAILY_CAP_USD);
  const budget = await loadBudget(keyHash);
  const remaining = Math.max(0, cap - budget.spentUsd);
  return {
    allowed: remaining > 0,
    spentUsd: budget.spentUsd,
    remainingUsd: remaining,
    capUsd: cap,
  };
}

/**
 * Record spend after a completed request.
 */
export async function recordSpend(
  keyHash: string,
  provider: Provider | string,
  totalTokens: number,
): Promise<void> {
  const cost = estimateCostUsd(provider, totalTokens);
  const budget = await loadBudget(keyHash);
  budget.spentUsd += cost;
  budget.requestCount++;
  budget.perModel[provider] = (budget.perModel[provider] ?? 0) + cost;
  await saveBudget(keyHash, budget);
}

/**
 * Get the full daily report for a key.
 */
export async function getDailyReport(keyHash: string): Promise<DailyBudget> {
  return loadBudget(keyHash);
}
