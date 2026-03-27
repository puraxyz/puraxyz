/**
 * Credit settlement — publishes kind-31918 (settlement) or
 * kind-31919 (default) events when credit lines reach expiry.
 *
 * Settlement is cooperative: the creditor publishes a settlement
 * event after receiving Lightning payment from the debtor.
 * Default is adversarial: the creditor publishes a default event
 * that damages the debtor's quality score (equivalent to 3
 * consecutive failing epochs per the paper's slashing rules).
 */

import type { Event } from 'nostr-tools';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { buildCreditSettlement, buildCreditDefault } from '../events/builders.js';
import type { CreditGraph, CreditLineEntry } from './graph.js';
import type { NostrClient } from '../client/NostrClient.js';

/** Default quality-score penalty for credit default (bps). */
const DEFAULT_PENALTY_BPS = 3000;

export class CreditSettler {
  private client: NostrClient;
  private secretKey: Uint8Array;
  private graph: CreditGraph;

  constructor(opts: {
    client: NostrClient;
    secretKey: Uint8Array;
    graph: CreditGraph;
  }) {
    this.client = opts.client;
    this.secretKey = opts.secretKey;
    this.graph = opts.graph;
  }

  /**
   * Settle a credit line after receiving Lightning payment.
   * Marks the line as settled in the local graph and publishes
   * a kind-31918 event.
   */
  async settle(
    line: CreditLineEntry,
    paymentPreimage: string,
  ): Promise<Event> {
    const interestMsats = Math.round(
      (line.usedMsats * line.interestRateBps) / 10000,
    );

    const unsigned = buildCreditSettlement('', {
      debtorPubkey: line.debtor,
      creditLineEventId: line.eventId,
      principalMsats: line.usedMsats,
      interestMsats,
      paymentPreimage,
      status: 'settled',
    });

    const signed = finalizeEvent(unsigned, this.secretKey);
    await this.client.publish(signed);
    this.graph.settle(line.creditor, line.debtor);
    return signed;
  }

  /**
   * Publish a credit default for a line that expired without settlement.
   * The debtor's quality score takes a severe penalty.
   */
  async publishDefault(
    line: CreditLineEntry,
    penaltyBps = DEFAULT_PENALTY_BPS,
  ): Promise<Event> {
    const unsigned = buildCreditDefault('', {
      debtorPubkey: line.debtor,
      creditLineEventId: line.eventId,
      outstandingMsats: line.usedMsats,
      penaltyBps,
    });

    const signed = finalizeEvent(unsigned, this.secretKey);
    await this.client.publish(signed);
    this.graph.markDefault(line.creditor, line.debtor);
    return signed;
  }

  /**
   * Scan all active credit lines and publish defaults for those
   * that have expired with outstanding debt.
   */
  async checkExpired(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    let defaults = 0;

    // Iterate all lines extended by the relay operator
    // (the relay can only publish defaults for lines it extended)
    for (const line of this.graph.linesExtendedBy(this.getCreditorPubkey())) {
      if (line.expires > 0 && line.expires < now && line.usedMsats > 0) {
        await this.publishDefault(line);
        defaults++;
      }
    }

    return defaults;
  }

  private getCreditorPubkey(): string {
    return getPublicKey(this.secretKey);
  }
}
