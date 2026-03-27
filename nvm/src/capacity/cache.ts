/**
 * EWMA capacity cache — subscribes to kind-31900 events and maintains
 * smoothed capacity per (agent, skill) pair.
 *
 * Mirrors the in-memory equivalent of CapacityRegistry.sol's on-chain state,
 * using the same EWMA formula (α=0.3) and rebalance threshold (5%).
 */

import { ewma, DEFAULT_ALPHA } from './ewma.js';
import { getTag } from '../events/validators.js';
import type { Event } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';

export interface AgentCapacity {
  pubkey: string;
  skillType: string;
  rawCapacity: number;
  smoothedCapacity: number;
  latencyMs: number;
  errorRateBps: number;
  priceMsats: number;
  maxConcurrent: number;
  model?: string;
  lastSeen: number; // unix timestamp
}

/** Composite key for the cache. */
function cacheKey(pubkey: string, skillType: string): string {
  return `${pubkey}:${skillType}`;
}

/**
 * In-memory cache of EWMA-smoothed agent capacity.
 * Fed by kind-31900 Nostr events from relay subscriptions.
 */
export class EWMACapacityCache {
  private entries = new Map<string, AgentCapacity>();
  private alpha: number;

  /** Threshold for "significant change" in capacity (matching REBALANCE_THRESHOLD_BPS = 500). */
  private rebalanceThresholdBps = 500;

  constructor(alpha = DEFAULT_ALPHA) {
    this.alpha = alpha;
  }

  /** Process a kind-31900 capacity attestation event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.CAPACITY_ATTESTATION) return;

    const skillType = getTag(event, 'd');
    const rawCap = Number(getTag(event, 'capacity'));
    if (!skillType || !Number.isFinite(rawCap)) return;

    const key = cacheKey(event.pubkey, skillType);
    const existing = this.entries.get(key);

    const smoothed = ewma(rawCap, existing?.smoothedCapacity, this.alpha);

    this.entries.set(key, {
      pubkey: event.pubkey,
      skillType,
      rawCapacity: rawCap,
      smoothedCapacity: smoothed,
      latencyMs: Number(getTag(event, 'latency_ms')) || 0,
      errorRateBps: Number(getTag(event, 'error_rate_bps')) || 0,
      priceMsats: Number(getTag(event, 'price_msats')) || 0,
      maxConcurrent: Number(getTag(event, 'max_concurrent')) || 1,
      model: getTag(event, 'model'),
      lastSeen: event.created_at,
    });
  }

  /** Get all agents offering a given skill, sorted by smoothed capacity descending. */
  getAgentsForSkill(skillType: string): AgentCapacity[] {
    const results: AgentCapacity[] = [];
    for (const entry of this.entries.values()) {
      if (entry.skillType === skillType) {
        results.push(entry);
      }
    }
    return results.sort((a, b) => b.smoothedCapacity - a.smoothedCapacity);
  }

  /** Get a specific agent's capacity for a skill. */
  get(pubkey: string, skillType: string): AgentCapacity | undefined {
    return this.entries.get(cacheKey(pubkey, skillType));
  }

  /** Get all entries (for debugging / metrics). */
  all(): AgentCapacity[] {
    return Array.from(this.entries.values());
  }

  /** Check if a capacity change exceeds the rebalance threshold (5%). */
  isSignificantChange(oldSmoothed: number, newSmoothed: number): boolean {
    if (oldSmoothed === 0) return newSmoothed > 0;
    if (newSmoothed === 0) return oldSmoothed > 0;
    const diff = Math.abs(newSmoothed - oldSmoothed);
    return (diff * 10000) / oldSmoothed >= this.rebalanceThresholdBps;
  }

  /** Remove stale entries older than maxAge seconds. */
  prune(maxAgeSeconds: number): number {
    const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.lastSeen < cutoff) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.entries.size;
  }
}
