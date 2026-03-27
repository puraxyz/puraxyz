/**
 * Reputation publisher — periodically computes and publishes
 * kind-31913 AgentProfile events for all tracked agents.
 *
 * Wires the ReputationComputer into the relay lifecycle,
 * similar to how QualityComputerService wraps QualityComputer.
 */

import type { Event } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';
import { buildAgentProfile } from '../events/builders.js';
import { ReputationComputer } from './computer.js';
import type { NostrClient } from '../client/NostrClient.js';

/** How many epochs between profile publications. */
const DEFAULT_PUBLISH_INTERVAL_EPOCHS = 10;

export class ReputationPublisher {
  private computer: ReputationComputer;
  private client: NostrClient;
  private secretKey: Uint8Array;
  private epochDurationS: number;
  private publishIntervalEpochs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: {
    client: NostrClient;
    secretKey: Uint8Array;
    epochDurationS?: number;
    publishIntervalEpochs?: number;
  }) {
    this.computer = new ReputationComputer();
    this.client = opts.client;
    this.secretKey = opts.secretKey;
    this.epochDurationS = opts.epochDurationS ?? 300;
    this.publishIntervalEpochs =
      opts.publishIntervalEpochs ?? DEFAULT_PUBLISH_INTERVAL_EPOCHS;
  }

  /** Process a kind-31901 completion receipt. */
  ingest(event: Event): void {
    this.computer.ingest(event);
  }

  /** Start periodic profile publication. */
  start(): void {
    if (this.timer) return;
    const intervalMs = this.epochDurationS * this.publishIntervalEpochs * 1000;
    this.timer = setInterval(async () => {
      await this.publishAll();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Publish kind-31913 profiles for all tracked agents. */
  async publishAll(): Promise<void> {
    for (const pubkey of this.computer.trackedAgents()) {
      const profile = this.computer.computeProfile(pubkey);
      if (!profile || profile.totalCompletions === 0) continue;

      const unsigned = buildAgentProfile('', profile);
      const signed = finalizeEvent(unsigned, this.secretKey);
      await this.client.publish(signed);
    }
  }

  /** Access the underlying computer. */
  getComputer(): ReputationComputer {
    return this.computer;
  }
}
