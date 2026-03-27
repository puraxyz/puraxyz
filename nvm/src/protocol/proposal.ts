/**
 * Protocol proposal — manages kind-31915 (ProtocolProposal) and
 * kind-31916 (ProtocolEndorsement) events for emergent protocol
 * negotiation between agents.
 *
 * Agents propose protocol extensions (new tag schemas, pricing
 * conventions, routing rules). Other agents endorse proposals they
 * support. When endorsement count reaches a threshold, the protocol
 * activates (kind-31922).
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { ProtocolProposal, ProtocolEndorsement } from '../events/kinds.js';
import type { Event } from 'nostr-tools';

export interface TrackedProposal extends ProtocolProposal {
  proposerPubkey: string;
  eventId: string;
  createdAt: number;
  endorsements: Set<string>; // pubkeys that endorsed
}

export class ProposalRegistry {
  private proposals = new Map<string, TrackedProposal>();

  /** Ingest a kind-31915 proposal event. */
  ingestProposal(event: Event): void {
    if (event.kind !== NVM_KINDS.PROTOCOL_PROPOSAL) return;

    const content = JSON.parse(event.content) as ProtocolProposal;
    const existing = this.proposals.get(event.id);
    if (existing) return; // proposals are immutable

    this.proposals.set(event.id, {
      ...content,
      proposerPubkey: event.pubkey,
      eventId: event.id,
      createdAt: event.created_at,
      endorsements: new Set(),
    });
  }

  /** Ingest a kind-31916 endorsement event. */
  ingestEndorsement(event: Event): void {
    if (event.kind !== NVM_KINDS.PROTOCOL_ENDORSEMENT) return;

    const content = JSON.parse(event.content) as ProtocolEndorsement;
    const proposal = this.proposals.get(content.proposalEventId);
    if (!proposal) return;

    proposal.endorsements.add(event.pubkey);
  }

  /** Get a proposal by event ID. */
  get(eventId: string): TrackedProposal | undefined {
    return this.proposals.get(eventId);
  }

  /** Check if a proposal has reached the activation threshold. */
  isActivatable(eventId: string, threshold: number): boolean {
    const proposal = this.proposals.get(eventId);
    if (!proposal) return false;
    return proposal.endorsements.size >= threshold;
  }

  /** All proposals sorted by endorsement count (descending). */
  ranked(): TrackedProposal[] {
    return Array.from(this.proposals.values()).sort(
      (a, b) => b.endorsements.size - a.endorsements.size,
    );
  }

  /** Proposals that have reached the activation threshold. */
  activatable(threshold: number): TrackedProposal[] {
    return this.ranked().filter((p) => p.endorsements.size >= threshold);
  }

  size(): number {
    return this.proposals.size;
  }
}
