/**
 * Bridge agent — translates job requests between NVM networks.
 *
 * A bridge connects to two (or more) relay pools. When it sees a
 * job request on one network that can be better served on another,
 * it re-publishes the request with proper attestation (kind-31914).
 *
 * Stub: defines the bridge config and a passthrough relay function.
 * Real implementation would manage dual NostrClient connections.
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { BridgeConfig } from '../events/kinds.js';
import type { Event } from 'nostr-tools';

export interface TrackedBridge extends BridgeConfig {
  bridgePubkey: string;
  lastUpdated: number;
}

export class BridgeRegistry {
  private bridges = new Map<string, TrackedBridge>();

  /** Ingest a kind-31914 bridge config event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.BRIDGE_CONFIG) return;

    const content = JSON.parse(event.content) as BridgeConfig;
    const existing = this.bridges.get(event.pubkey);
    if (existing && existing.lastUpdated >= event.created_at) return;

    this.bridges.set(event.pubkey, {
      ...content,
      bridgePubkey: event.pubkey,
      lastUpdated: event.created_at,
    });
  }

  /** Find bridges that connect two specific relay pools. */
  findBridge(sourceRelay: string, targetRelay: string): TrackedBridge | undefined {
    for (const bridge of this.bridges.values()) {
      if (
        bridge.privateRelay === sourceRelay &&
        bridge.publicRelay === targetRelay
      ) {
        return bridge;
      }
    }
    return undefined;
  }

  /** All registered bridges. */
  all(): TrackedBridge[] {
    return Array.from(this.bridges.values());
  }

  size(): number {
    return this.bridges.size;
  }
}
