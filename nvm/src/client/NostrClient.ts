/**
 * Nostr client — relay pool connection, event publishing, subscription filters.
 *
 * Wraps nostr-tools SimplePool with NVM-specific conveniences:
 * reconnection, event dedup, and typed subscriptions.
 */

import { SimplePool, type Event, type Filter } from 'nostr-tools';
import type { SubCloser, SubscribeManyParams } from 'nostr-tools/pool';

export interface NostrClientConfig {
  relays: string[];
  /** Keypair hex (64-char private key). If omitted, client is read-only. */
  privateKey?: string;
}

export interface RelayStatus {
  url: string;
  connected: boolean;
}

export class NostrClient {
  private pool: SimplePool;
  private relays: string[];
  private privkey: string | undefined;

  constructor(config: NostrClientConfig) {
    this.pool = new SimplePool();
    this.relays = config.relays;
    this.privkey = config.privateKey;
  }

  /** Publish a signed event to all connected relays. */
  async publish(event: Event): Promise<void> {
    await Promise.allSettled(this.pool.publish(this.relays, event));
  }

  /** Subscribe to events matching filters. */
  subscribe(
    filters: Filter[],
    onEvent: (event: Event) => void,
    opts?: { oneose?: () => void },
  ): SubCloser {
    // SimplePool.subscribeMany takes a single Filter, so merge them
    const merged: Filter = Object.assign({}, ...filters);
    return this.pool.subscribeMany(this.relays, merged, {
      onevent: onEvent,
      oneose: opts?.oneose,
    });
  }

  /** Fetch events matching filters (waits for EOSE from all relays). */
  async list(filters: Filter[]): Promise<Event[]> {
    const merged: Filter = Object.assign({}, ...filters);
    return this.pool.querySync(this.relays, merged);
  }

  /** Get a single event by ID. */
  async get(filter: Filter): Promise<Event | null> {
    return this.pool.get(this.relays, filter);
  }

  /** Close all relay connections. */
  close(): void {
    this.pool.close(this.relays);
  }

  getRelays(): string[] {
    return [...this.relays];
  }

  getPrivateKey(): string | undefined {
    return this.privkey;
  }
}
