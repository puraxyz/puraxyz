/**
 * Bridge attestation — creates kind-31921 (ReputationAttestation)
 * events that vouch for an agent's cross-network reputation.
 *
 * When a bridge forwards a job result, it publishes an attestation
 * so the receiving network can factor in the agent's track record.
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { ReputationAttestation } from '../events/kinds.js';
import { buildReputationAttestation } from '../events/builders.js';
import { finalizeEvent, type UnsignedEvent } from 'nostr-tools';
import type { NostrClient } from '../client/NostrClient.js';

export interface AttestationRecord extends ReputationAttestation {
  attestorPubkey: string;
  createdAt: number;
}

export class AttestationStore {
  private records = new Map<string, AttestationRecord[]>();

  /** Store an attestation from a kind-31921 event. */
  ingestAttestation(event: { pubkey: string; created_at: number; content: string; kind: number }): void {
    if (event.kind !== NVM_KINDS.REPUTATION_ATTESTATION) return;

    const content = JSON.parse(event.content) as ReputationAttestation;
    const list = this.records.get(content.agentPubkey) ?? [];
    list.push({
      ...content,
      attestorPubkey: event.pubkey,
      createdAt: event.created_at,
    });
    this.records.set(content.agentPubkey, list);
  }

  /** Get all attestations for a subject. */
  attestationsFor(subjectPubkey: string): AttestationRecord[] {
    return this.records.get(subjectPubkey) ?? [];
  }

  /** Compute average attested quality for a subject. */
  avgAttestedQuality(subjectPubkey: string): number | null {
    const atts = this.records.get(subjectPubkey);
    if (!atts || atts.length === 0) return null;
    const sum = atts.reduce((s, a) => s + a.privateAvgQualityBps, 0);
    return Math.round(sum / atts.length);
  }
}

/** Publish a reputation attestation for an agent. */
export async function publishAttestation(
  bridgeSecretKey: Uint8Array,
  bridgePubkey: string,
  subject: ReputationAttestation,
  client: NostrClient,
): Promise<void> {
  const unsigned = buildReputationAttestation(bridgePubkey, subject);
  const signed = finalizeEvent(unsigned as UnsignedEvent, bridgeSecretKey);
  await client.publish(signed);
}
