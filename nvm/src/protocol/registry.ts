/**
 * Protocol registry — tracks which protocol extensions have
 * been activated (kind-31922) and which are available for use.
 *
 * Activated protocols are those that received enough endorsements
 * and had an activation event published.
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { ProtocolActivation } from '../events/kinds.js';
import type { Event } from 'nostr-tools';

export interface ActiveProtocol extends ProtocolActivation {
  activatedBy: string;
  activatedAt: number;
}

export class ProtocolRegistry {
  private active = new Map<string, ActiveProtocol>();

  /** Ingest a kind-31922 protocol activation event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.PROTOCOL_ACTIVATION) return;

    const content = JSON.parse(event.content) as ProtocolActivation;
    // Only accept first activation per proposal
    if (this.active.has(content.proposalEventId)) return;

    this.active.set(content.proposalEventId, {
      ...content,
      activatedBy: event.pubkey,
      activatedAt: event.created_at,
    });
  }

  /** Check if a protocol proposal has been activated. */
  isActive(proposalEventId: string): boolean {
    return this.active.has(proposalEventId);
  }

  /** Get an active protocol by its proposal event ID. */
  get(proposalEventId: string): ActiveProtocol | undefined {
    return this.active.get(proposalEventId);
  }

  /** All active protocols. */
  all(): ActiveProtocol[] {
    return Array.from(this.active.values());
  }

  size(): number {
    return this.active.size;
  }
}
