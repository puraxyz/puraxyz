/**
 * Credit graph — tracks bilateral credit lines between agents
 * and computes available credit (direct + transitive via BFS).
 *
 * Reconstructed from kind-31910 (CreditLine) events on relays.
 * The graph mirrors how Lightning payment channels compose into
 * a network: bilateral trust relationships that enable multi-hop
 * credit routing.
 */

import type { Event } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';
import { getTag } from '../events/validators.js';

export type CreditStatus = 'active' | 'settled' | 'defaulted';

export interface CreditLineEntry {
  creditor: string;
  debtor: string;
  amountMsats: number;
  usedMsats: number;
  expires: number;
  interestRateBps: number;
  collateralQualityBps: number;
  status: CreditStatus;
  eventId: string;
}

function lineKey(creditor: string, debtor: string): string {
  return `${creditor}:${debtor}`;
}

/**
 * In-memory credit graph. Fed by kind-31910 Nostr events.
 * Supports direct credit lookup and BFS-based transitive credit.
 */
export class CreditGraph {
  private lines = new Map<string, CreditLineEntry>();

  /** Ingest a kind-31910 credit line event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.CREDIT_LINE) return;

    const debtor = getTag(event, 'd');
    const amountMsats = Number(getTag(event, 'amount_msats'));
    const expires = Number(getTag(event, 'expires'));
    const interestRateBps = Number(getTag(event, 'interest_rate_bps'));
    const collateral = Number(getTag(event, 'collateral'));

    if (!debtor || !Number.isFinite(amountMsats)) return;

    const key = lineKey(event.pubkey, debtor);
    this.lines.set(key, {
      creditor: event.pubkey,
      debtor,
      amountMsats,
      usedMsats: 0,
      expires: Number.isFinite(expires) ? expires : 0,
      interestRateBps: Number.isFinite(interestRateBps) ? interestRateBps : 0,
      collateralQualityBps: Number.isFinite(collateral) ? collateral : 0,
      status: 'active',
      eventId: event.id,
    });
  }

  /** Get the direct credit line from creditor to debtor. */
  getLine(creditor: string, debtor: string): CreditLineEntry | undefined {
    return this.lines.get(lineKey(creditor, debtor));
  }

  /** Check available direct credit (amount - used, accounting for expiry). */
  directCredit(creditor: string, debtor: string): number {
    const line = this.lines.get(lineKey(creditor, debtor));
    if (!line || line.status !== 'active') return 0;
    if (line.expires > 0 && line.expires < Math.floor(Date.now() / 1000)) return 0;
    return Math.max(0, line.amountMsats - line.usedMsats);
  }

  /**
   * Compute available credit from `from` to `to`, including transitive
   * credit paths found via BFS. Returns the max flow along the
   * min-capacity path (bottleneck routing).
   */
  availableCredit(from: string, to: string): number {
    // Direct credit first (fast path)
    const direct = this.directCredit(from, to);
    if (direct > 0) return direct;

    // BFS for transitive paths
    return this.bfsMinCapacity(from, to);
  }

  /** Record credit usage (debit). Returns false if insufficient credit. */
  useCredit(creditor: string, debtor: string, amountMsats: number): boolean {
    const line = this.lines.get(lineKey(creditor, debtor));
    if (!line || line.status !== 'active') return false;
    const available = this.directCredit(creditor, debtor);
    if (available < amountMsats) return false;
    line.usedMsats += amountMsats;
    return true;
  }

  /** Mark a credit line as settled. */
  settle(creditor: string, debtor: string): void {
    const line = this.lines.get(lineKey(creditor, debtor));
    if (line) {
      line.status = 'settled';
      line.usedMsats = 0;
    }
  }

  /** Mark a credit line as defaulted. */
  markDefault(creditor: string, debtor: string): void {
    const line = this.lines.get(lineKey(creditor, debtor));
    if (line) line.status = 'defaulted';
  }

  /** Get all active lines where the given pubkey is the creditor. */
  linesExtendedBy(creditor: string): CreditLineEntry[] {
    return Array.from(this.lines.values()).filter(
      (l) => l.creditor === creditor && l.status === 'active',
    );
  }

  /** Get all active lines where the given pubkey is the debtor. */
  linesReceivedBy(debtor: string): CreditLineEntry[] {
    return Array.from(this.lines.values()).filter(
      (l) => l.debtor === debtor && l.status === 'active',
    );
  }

  /** Total credit extended by a pubkey (sum of all active lines). */
  totalExtended(creditor: string): number {
    return this.linesExtendedBy(creditor).reduce(
      (sum, l) => sum + l.amountMsats,
      0,
    );
  }

  /** Total credit received by a pubkey. */
  totalReceived(debtor: string): number {
    return this.linesReceivedBy(debtor).reduce(
      (sum, l) => sum + l.amountMsats,
      0,
    );
  }

  /** BFS through the credit graph to find transitive credit. */
  private bfsMinCapacity(from: string, to: string): number {
    // Build adjacency list from active lines
    const adj = new Map<string, Array<{ neighbor: string; capacity: number }>>();
    const now = Math.floor(Date.now() / 1000);

    for (const line of this.lines.values()) {
      if (line.status !== 'active') continue;
      if (line.expires > 0 && line.expires < now) continue;
      const available = line.amountMsats - line.usedMsats;
      if (available <= 0) continue;

      const edges = adj.get(line.creditor) ?? [];
      edges.push({ neighbor: line.debtor, capacity: available });
      adj.set(line.creditor, edges);
    }

    // BFS: track min capacity along each path
    const visited = new Set<string>();
    const queue: Array<{ node: string; minCap: number }> = [];
    queue.push({ node: from, minCap: Infinity });
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edges = adj.get(current.node) ?? [];

      for (const edge of edges) {
        if (visited.has(edge.neighbor)) continue;
        const pathMin = Math.min(current.minCap, edge.capacity);

        if (edge.neighbor === to) return pathMin;

        visited.add(edge.neighbor);
        queue.push({ node: edge.neighbor, minCap: pathMin });
      }
    }

    return 0; // no path found
  }

  /** Number of active credit lines in the graph. */
  size(): number {
    return Array.from(this.lines.values()).filter(
      (l) => l.status === 'active',
    ).length;
  }
}
