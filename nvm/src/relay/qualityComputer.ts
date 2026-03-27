/**
 * Quality computer service — relay-side quality scoring.
 *
 * Listens for kind-31901 completion receipts, computes composite
 * quality scores, and publishes kind-31902 events.
 *
 * Wraps the verification/quality.ts QualityComputer with
 * relay lifecycle concerns (periodic recompute, publishing).
 */

import type { Event } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools';
import { QualityComputer } from '../verification/quality.js';
import { buildQualityScore } from '../events/builders.js';
import { NVM_KINDS } from '../events/kinds.js';
import type { NostrClient } from '../client/NostrClient.js';
import type { RoutingConfig } from '../routing/config.js';
import { ROUTING_DEFAULTS } from '../routing/config.js';

export class QualityComputerService {
  private computer: QualityComputer;
  private client: NostrClient;
  private secretKey: Uint8Array;
  private config: RoutingConfig;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    client: NostrClient,
    secretKey: Uint8Array,
    config: RoutingConfig = ROUTING_DEFAULTS,
  ) {
    this.client = client;
    this.secretKey = secretKey;
    this.config = config;
    this.computer = new QualityComputer(config);
  }

  /** Process a kind-31901 completion receipt event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.COMPLETION_RECEIPT) return;
    this.computer.ingestReceipt(event);
  }

  /** Start periodic quality score recomputation and publishing. */
  start(): void {
    if (this.timer) return;
    const intervalMs = this.config.epochDurationS * 1000;

    this.timer = setInterval(async () => {
      await this.recomputeAndPublish();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Recompute scores and publish kind-31902 for all tracked agents. */
  async recomputeAndPublish(): Promise<void> {
    this.computer.recompute();

    for (const pubkey of this.computer.trackedAgents()) {
      const score = this.computer.getScore(pubkey);
      const allScores = this.computer.allScores();

      if (score === 0.5) continue; // default score, nothing to publish

      const unsigned = buildQualityScore('', {
        agentPubkey: pubkey,
        scoreBps: Math.round(score * 10000),
        totalCompletions: 0, // TODO: track per-agent completion count
        completionRateBps: Math.round(score * 10000),
        avgLatencyMs: 0,
        errorRateBps: 0,
        epoch: Math.floor(Date.now() / 1000 / this.config.epochDurationS),
        window: this.config.qualityWindowEpochs,
      });

      const signed = finalizeEvent(unsigned, this.secretKey);
      await this.client.publish(signed);
    }
  }

  /** Get the underlying QualityComputer (implements QualityCache). */
  getComputer(): QualityComputer {
    return this.computer;
  }
}
