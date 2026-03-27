/**
 * Quality computer — scans completion receipts, computes and publishes
 * kind-31902 quality score events for all agents.
 *
 * Runs every epoch (300s). Maintains a rolling window of receipts
 * (default: 12 epochs = 1 hour).
 *
 * CompletionTracker.sol reference:
 *   - advanceEpoch() computes completion rate per sink
 *   - SLASH_THRESHOLD_BPS = 5000 for under-performance detection
 *   - consecutiveBelow tracking for auto-slash
 *
 * Here we compute quality scores (not slash), since slashing is
 * handled by the optional on-chain layer.
 */

import type { Event } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';
import { getTag, getTags } from '../events/validators.js';
import { SmoothedScores, normalizeLatency, normalizeErrorRate } from './scoring.js';
import type { QualityCache } from '../routing/router.js';
import type { RoutingConfig } from '../routing/config.js';
import { ROUTING_DEFAULTS } from '../routing/config.js';

interface ReceiptRecord {
  agentPubkey: string;
  qualityBps: number;
  latencyMs: number;
  timestamp: number;
}

/**
 * Computes and caches quality scores from completion receipts.
 * Implements the QualityCache interface consumed by the router.
 */
export class QualityComputer implements QualityCache {
  private receipts: ReceiptRecord[] = [];
  private scores = new Map<string, SmoothedScores>();
  private compositeCache = new Map<string, number>();
  private config: RoutingConfig;

  /** Default score for unknown agents (neutral). */
  private defaultScore = 0.5;

  constructor(config: RoutingConfig = ROUTING_DEFAULTS) {
    this.config = config;
  }

  /** Ingest a kind-31901 completion receipt event. */
  ingestReceipt(event: Event): void {
    if (event.kind !== NVM_KINDS.COMPLETION_RECEIPT) return;

    const quality = Number(getTag(event, 'quality'));
    const latencyMs = Number(getTag(event, 'latency_ms'));
    if (!Number.isFinite(quality) || !Number.isFinite(latencyMs)) return;

    this.receipts.push({
      agentPubkey: event.pubkey,
      qualityBps: quality,
      latencyMs,
      timestamp: event.created_at,
    });
  }

  /**
   * Recompute quality scores for all agents from receipt history.
   * Call this every epoch. Prunes receipts outside the window.
   */
  recompute(): void {
    const windowS = this.config.epochDurationS * this.config.qualityWindowEpochs;
    const cutoff = Math.floor(Date.now() / 1000) - windowS;

    // Prune old receipts
    this.receipts = this.receipts.filter((r) => r.timestamp >= cutoff);

    // Group by agent
    const byAgent = new Map<string, ReceiptRecord[]>();
    for (const r of this.receipts) {
      const list = byAgent.get(r.agentPubkey) ?? [];
      list.push(r);
      byAgent.set(r.agentPubkey, list);
    }

    // Compute scores per agent
    for (const [pubkey, records] of byAgent) {
      let tracker = this.scores.get(pubkey);
      if (!tracker) {
        tracker = new SmoothedScores(this.config.ewmaAlpha);
        this.scores.set(pubkey, tracker);
      }

      const completionRate = 1.0; // All receipts represent completions
      const avgLatency = records.reduce((s, r) => s + r.latencyMs, 0) / records.length;
      const avgSatisfaction = records.reduce((s, r) => s + r.qualityBps, 0) / records.length / 10000;

      // Error rate: receipts with quality < 5000 bps count as errors
      const errorCount = records.filter((r) => r.qualityBps < 5000).length;
      const errorRateBps = Math.round((errorCount / records.length) * 10000);

      tracker.update(
        completionRate,
        normalizeLatency(avgLatency),
        normalizeErrorRate(errorRateBps),
        avgSatisfaction,
      );

      this.compositeCache.set(pubkey, tracker.composite(this.config.qualityWeights));
    }
  }

  // -- QualityCache interface --

  getScore(pubkey: string): number {
    return this.compositeCache.get(pubkey) ?? this.defaultScore;
  }

  allScores(): number[] {
    return Array.from(this.compositeCache.values());
  }

  /** Get score in basis points (for kind-31902 events). */
  getScoreBps(pubkey: string): number {
    return Math.round(this.getScore(pubkey) * 10000);
  }

  /** Get total completions for an agent in the current window. */
  getCompletionCount(pubkey: string): number {
    return this.receipts.filter((r) => r.agentPubkey === pubkey).length;
  }

  /** Get all tracked agent pubkeys. */
  trackedAgents(): string[] {
    return Array.from(this.scores.keys());
  }
}
