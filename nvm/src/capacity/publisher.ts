/**
 * Capacity attestation publisher — periodically broadcasts kind-31900
 * events based on local load measurements.
 *
 * Publishes every EPOCH_DURATION_S (300s, matching paper) or when
 * capacity changes by >20% from the last published value.
 */

import { finalizeEvent } from 'nostr-tools';
import type { NostrClient } from '../client/NostrClient.js';
import { buildCapacityAttestation } from '../events/builders.js';
import { measureLoad } from './metrics.js';
import type { CapacityAttestation } from '../events/kinds.js';

export interface CapacityPublisherConfig {
  /** Agent's hex private key. */
  privateKey: Uint8Array;
  /** Agent's hex public key. */
  publicKey: string;
  /** Skill types this agent offers. */
  skillTypes: string[];
  /** Publish interval in ms. Default: 300_000 (5 min = 1 epoch). */
  intervalMs?: number;
  /** Change threshold to trigger early publish (fraction, default 0.2 = 20%). */
  changeThreshold?: number;
  /** Minimum price per job in msats. */
  priceMsats?: number;
  /** Model identifier. */
  model?: string;
  /** Human-readable agent name. */
  name?: string;
  about?: string;
}

export class CapacityPublisher {
  private client: NostrClient;
  private config: Required<Pick<CapacityPublisherConfig, 'intervalMs' | 'changeThreshold' | 'priceMsats'>> & CapacityPublisherConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPublishedCapacity = new Map<string, number>();

  constructor(client: NostrClient, config: CapacityPublisherConfig) {
    this.client = client;
    this.config = {
      intervalMs: 300_000,
      changeThreshold: 0.2,
      priceMsats: 1000,
      ...config,
    };
  }

  /** Start periodic publishing. Also publishes immediately. */
  start(): void {
    this.publishAll();
    this.timer = setInterval(() => this.publishAll(), this.config.intervalMs);
  }

  /** Stop periodic publishing. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Publish capacity for all skill types. */
  async publishAll(): Promise<void> {
    const load = measureLoad();
    for (const skillType of this.config.skillTypes) {
      await this.publishOne(skillType, load.availableCapacity, load);
    }
  }

  /** Check if capacity changed enough to warrant an early publish. */
  shouldPublishEarly(skillType: string, newCapacity: number): boolean {
    const last = this.lastPublishedCapacity.get(skillType);
    if (last === undefined) return true;
    if (last === 0) return newCapacity > 0;
    return Math.abs(newCapacity - last) / last > this.config.changeThreshold;
  }

  private async publishOne(
    skillType: string,
    capacity: number,
    load: ReturnType<typeof measureLoad>,
  ): Promise<void> {
    const data: CapacityAttestation = {
      skillType,
      capacity,
      latencyMs: load.latencyP50Ms,
      errorRateBps: load.errorRateBps,
      priceMsats: this.config.priceMsats,
      maxConcurrent: load.maxConcurrent,
      model: this.config.model,
      name: this.config.name,
      about: this.config.about,
    };

    const unsigned = buildCapacityAttestation(this.config.publicKey, data);
    const signed = finalizeEvent(unsigned, this.config.privateKey);
    await this.client.publish(signed);

    this.lastPublishedCapacity.set(skillType, capacity);
  }
}
