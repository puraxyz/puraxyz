/**
 * Reputation computer — aggregates completion receipts into
 * kind-31913 AgentProfile data.
 *
 * The profile is a deterministic summary of an agent's on-relay
 * event history. Anyone can verify it by replaying the receipts.
 */

import type { Event } from 'nostr-tools';
import { NVM_KINDS } from '../events/kinds.js';
import type { AgentProfile } from '../events/kinds.js';
import { getTag } from '../events/validators.js';

interface ReceiptRecord {
  agentPubkey: string;
  customerPubkey: string;
  qualityBps: number;
  latencyMs: number;
  skillType: string;
  /** Estimated payment (from the job assignment dynamic price, if available). */
  paymentMsats: number;
  timestamp: number;
}

/**
 * Computes AgentProfile from completion receipt history.
 * Fed by kind-31901 events from relay subscriptions.
 */
export class ReputationComputer {
  private receipts: ReceiptRecord[] = [];

  /** Ingest a kind-31901 completion receipt event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.COMPLETION_RECEIPT) return;

    const quality = Number(getTag(event, 'quality'));
    const latencyMs = Number(getTag(event, 'latency_ms'));
    const skillType = getTag(event, 'd') ?? '';
    const customerPubkey = getTag(event, 'p') ?? '';
    if (!Number.isFinite(quality)) return;

    this.receipts.push({
      agentPubkey: event.pubkey,
      customerPubkey,
      qualityBps: quality,
      latencyMs: Number.isFinite(latencyMs) ? latencyMs : 0,
      skillType,
      paymentMsats: 0, // filled when cross-referenced with job assignments
      timestamp: event.created_at,
    });
  }

  /** Compute an AgentProfile from all ingested receipts for a given agent. */
  computeProfile(agentPubkey: string): AgentProfile | null {
    const agentReceipts = this.receipts.filter(
      (r) => r.agentPubkey === agentPubkey,
    );
    if (agentReceipts.length === 0) return null;

    const totalCompletions = agentReceipts.length;
    const totalEarnedMsats = agentReceipts.reduce(
      (sum, r) => sum + r.paymentMsats,
      0,
    );
    const avgQualityBps = Math.round(
      agentReceipts.reduce((sum, r) => sum + r.qualityBps, 0) / totalCompletions,
    );
    const skillSet = new Set(agentReceipts.map((r) => r.skillType).filter(Boolean));
    const activeSince = Math.min(...agentReceipts.map((r) => r.timestamp));

    return {
      totalCompletions,
      totalEarnedMsats,
      avgQualityBps,
      skillTypes: Array.from(skillSet),
      activeSince,
      creditExtendedMsats: 0,
      creditReceivedMsats: 0,
      childrenSpawned: 0,
      guildMemberships: [],
      futuresFulfilled: 0,
      futuresDefaulted: 0,
    };
  }

  /** Return all agent pubkeys that have at least one receipt. */
  trackedAgents(): string[] {
    const agents = new Set(this.receipts.map((r) => r.agentPubkey));
    return Array.from(agents);
  }

  /** Get raw receipt count for an agent. */
  receiptCount(agentPubkey: string): number {
    return this.receipts.filter((r) => r.agentPubkey === agentPubkey).length;
  }
}
