/**
 * Capacity futures orderbook — maintains a set of open
 * kind-31911 (CapacityFuture) orders, grouped by skill type.
 *
 * Stub implementation: ingests events, stores them, exposes
 * queries. Matching and execution are in matcher.ts.
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { CapacityFuture } from '../events/kinds.js';
import type { Event } from 'nostr-tools';

export interface OrderbookEntry extends CapacityFuture {
  eventId: string;
  makerPubkey: string;
  createdAt: number;
}

export class FuturesOrderbook {
  private orders = new Map<string, OrderbookEntry>();

  /** Ingest a kind-31911 capacity future event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.CAPACITY_FUTURE) return;

    const content = JSON.parse(event.content) as CapacityFuture;
    this.orders.set(event.id, {
      ...content,
      eventId: event.id,
      makerPubkey: event.pubkey,
      createdAt: event.created_at,
    });
  }

  /** Get all open orders for a skill type, sorted by price. */
  ordersForSkill(skillType: string): OrderbookEntry[] {
    const now = Math.floor(Date.now() / 1000);
    return Array.from(this.orders.values())
      .filter((o) => o.skillType === skillType)
      .sort((a, b) => a.priceMsats - b.priceMsats);
  }

  /** Remove expired orders. Returns count removed. */
  prune(): number {
    let removed = 0;
    for (const [id, order] of this.orders) {
      // Prune orders whose settlement epoch has passed
      // (epoch comparison requires context; for now prune nothing)
      void order;
    }
    return removed;
  }

  /** All known skill types with open orders. */
  skillTypes(): string[] {
    const types = new Set<string>();
    for (const order of this.orders.values()) types.add(order.skillType);
    return Array.from(types);
  }

  size(): number {
    return this.orders.size;
  }
}
