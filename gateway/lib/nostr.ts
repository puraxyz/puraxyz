/**
 * NVM integration — subscribe to agent capacity attestations on Nostr,
 * expose a provider selection function that uses BPE weights.
 *
 * Active only when NVM_ENABLED=true. Connects to NVM_RELAY_URL.
 *
 * This module runs on the server side. It opens a single persistent
 * WebSocket to the NVM relay and keeps a local capacity cache.
 * When the gateway needs to route a request, it checks this cache
 * first and picks the best agent based on capacity × quality / price.
 */

import type { Provider } from "./providers";
import type { ComplexityTier } from "./complexity";
import { scoreComplexity } from "./complexity";
import type { ChatMessage } from "./providers";
import { log } from "./log";

// ---------------------------------------------------------------
// Config
// ---------------------------------------------------------------

const NVM_ENABLED = process.env.NVM_ENABLED === "true";
const NVM_RELAY_URL = process.env.NVM_RELAY_URL ?? "ws://localhost:7777";

/** Stale threshold — ignore capacity older than 10 minutes. */
const STALE_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------
// Capacity cache
// ---------------------------------------------------------------

interface AgentEntry {
  pubkey: string;
  skill: string;
  capacity: number;
  latencyMs: number;
  priceMsats: number;
  model: string;
  lastSeen: number; // unix seconds
}

const agents = new Map<string, AgentEntry>();

function cacheKey(pubkey: string, skill: string): string {
  return `${pubkey}:${skill}`;
}

// ---------------------------------------------------------------
// Model → Provider mapping
// ---------------------------------------------------------------

function modelToProvider(model: string): Provider | null {
  const m = model.toLowerCase();
  if (m.includes("gpt") || m.includes("o1-") || m.includes("o3-") || m.includes("o4-")) return "openai";
  if (m.includes("claude")) return "anthropic";
  if (m.includes("llama") || m.includes("mixtral") || m.includes("gemma")) return "groq";
  if (m.includes("gemini")) return "gemini";
  return null;
}

// ---------------------------------------------------------------
// WebSocket lifecycle
// ---------------------------------------------------------------

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getTag(tags: string[][], name: string): string | undefined {
  return tags.find((t: string[]) => t[0] === name)?.[1];
}

function connectRelay(): void {
  if (!NVM_ENABLED) return;
  if (ws && ws.readyState === WebSocket.OPEN) return;

  try {
    ws = new WebSocket(NVM_RELAY_URL);
  } catch (err) {
    log.warn("nvm.connect_failed", { error: String(err) });
    scheduleReconnect();
    return;
  }

  ws.addEventListener("open", () => {
    log.info("nvm.connected", { relay: NVM_RELAY_URL });
    // Subscribe to capacity attestations (kind 31900)
    ws!.send(JSON.stringify(["REQ", "gw-cap", { kinds: [31900] }]));
  });

  ws.addEventListener("message", (msg) => {
    try {
      const parsed = JSON.parse(String(msg.data));
      if (!Array.isArray(parsed) || parsed[0] !== "EVENT" || !parsed[2]) return;

      const event = parsed[2] as {
        kind: number;
        pubkey: string;
        created_at: number;
        tags: string[][];
      };

      if (event.kind !== 31900) return;

      const skill = getTag(event.tags, "d");
      if (!skill) return;

      const key = cacheKey(event.pubkey, skill);
      agents.set(key, {
        pubkey: event.pubkey,
        skill,
        capacity: Number(getTag(event.tags, "capacity")) || 0,
        latencyMs: Number(getTag(event.tags, "latency_ms")) || 0,
        priceMsats: Number(getTag(event.tags, "price_msats")) || 0,
        model: getTag(event.tags, "model") ?? "",
        lastSeen: event.created_at,
      });
    } catch {
      // ignore parse errors
    }
  });

  ws.addEventListener("close", () => {
    log.info("nvm.disconnected", { relay: NVM_RELAY_URL });
    ws = null;
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    // close event will fire after this
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectRelay();
  }, 5_000);
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export function isNvmEnabled(): boolean {
  return NVM_ENABLED;
}

/** Lazy-init the relay connection on first use. */
function ensureConnected(): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    connectRelay();
  }
}

export interface NvmSelectResult {
  provider: Provider;
  tier: ComplexityTier;
  explored: boolean;
  experimentalFields: string[];
  /** NVM agent pubkey that won the selection. */
  nvmAgent: string;
}

/**
 * Select a provider via NVM agent capacity data.
 *
 * Returns null if NVM is disabled, no agents are available,
 * or agent data is stale.
 */
export function selectNvmProvider(
  messages?: ChatMessage[],
): NvmSelectResult | null {
  if (!NVM_ENABLED) return null;
  ensureConnected();

  const nowSec = Math.floor(Date.now() / 1000);
  const staleThresholdSec = nowSec - STALE_MS / 1000;

  // Filter to fresh agents with a known model mapping
  const candidates: Array<AgentEntry & { provider: Provider }> = [];
  for (const entry of agents.values()) {
    if (entry.lastSeen < staleThresholdSec) continue;
    if (entry.capacity <= 0) continue;
    const provider = modelToProvider(entry.model);
    if (!provider) continue;
    candidates.push({ ...entry, provider });
  }

  if (candidates.length === 0) return null;

  // BPE weight: capacity / (1 + price_normalized) weighted by inverse latency
  const maxLatency = Math.max(...candidates.map((c) => c.latencyMs), 1);
  const maxPrice = Math.max(...candidates.map((c) => c.priceMsats), 1);

  let best = candidates[0];
  let bestWeight = -1;

  for (const c of candidates) {
    const latencyScore = 1 - c.latencyMs / (maxLatency + 1);
    const priceFactor = 1 / (1 + c.priceMsats / maxPrice);
    const weight = c.capacity * priceFactor * (0.7 + 0.3 * latencyScore);
    if (weight > bestWeight) {
      bestWeight = weight;
      best = c;
    }
  }

  const tier: ComplexityTier = messages ? scoreComplexity(messages) : "mid";

  log.info("nvm.selected", {
    agent: best.pubkey.slice(0, 12),
    provider: best.provider,
    capacity: best.capacity,
    weight: bestWeight.toFixed(3),
  });

  return {
    provider: best.provider,
    tier,
    explored: false,
    experimentalFields: ["nvm"],
    nvmAgent: best.pubkey,
  };
}

/**
 * How many fresh NVM agents are currently tracked.
 */
export function nvmAgentCount(): number {
  const staleThresholdSec = Math.floor(Date.now() / 1000) - STALE_MS / 1000;
  let count = 0;
  for (const entry of agents.values()) {
    if (entry.lastSeen >= staleThresholdSec && entry.capacity > 0) count++;
  }
  return count;
}
