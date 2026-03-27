/**
 * Event validators — verify structure and signatures of NVM events.
 *
 * Mirrors the dual-signature verification from CompletionTracker.sol,
 * adapted from EIP-712 typed data to Nostr Schnorr signatures.
 */

import { sha256 } from '@noble/hashes/sha256';
import { schnorr } from '@noble/curves/secp256k1.js';
import type { Event } from 'nostr-tools';
import { NVM_KINDS } from './kinds.js';

/** Extract a single tag value by name. Returns undefined if missing. */
export function getTag(event: Event, name: string): string | undefined {
  const tag = event.tags.find((t) => t[0] === name);
  return tag?.[1];
}

/** Extract all values for a tag name (for repeated tags like 'e' or 'p'). */
export function getTags(event: Event, name: string): string[] {
  return event.tags.filter((t) => t[0] === name).map((t) => t[1]);
}

/** Validate a capacity attestation event has required fields. */
export function validateCapacityAttestation(event: Event): { valid: boolean; error?: string } {
  if (event.kind !== NVM_KINDS.CAPACITY_ATTESTATION) {
    return { valid: false, error: `Wrong kind: ${event.kind}` };
  }
  const required = ['d', 'capacity', 'latency_ms', 'error_rate_bps', 'price_msats', 'max_concurrent'];
  for (const tag of required) {
    if (getTag(event, tag) === undefined) {
      return { valid: false, error: `Missing tag: ${tag}` };
    }
  }
  const capacity = Number(getTag(event, 'capacity'));
  if (!Number.isFinite(capacity) || capacity < 0) {
    return { valid: false, error: 'Invalid capacity value' };
  }
  return { valid: true };
}

/**
 * Validate a completion receipt event, including dual-signature verification.
 *
 * The receipt is signed by the agent (standard Nostr event signature).
 * The customer_sig tag contains the customer's Schnorr signature over:
 *   sha256(jobRequestId + jobResultId + agentPubkey + customerPubkey + quality + latencyMs)
 *
 * This mirrors CompletionTracker.sol's EIP-712 COMPLETION_TYPEHASH verification,
 * adapted to Schnorr/secp256k1.
 */
export function validateCompletionReceipt(event: Event): { valid: boolean; error?: string } {
  if (event.kind !== NVM_KINDS.COMPLETION_RECEIPT) {
    return { valid: false, error: `Wrong kind: ${event.kind}` };
  }

  const eRefs = getTags(event, 'e');
  if (eRefs.length < 2) {
    return { valid: false, error: 'Need at least 2 e-tags (job request + job result)' };
  }

  const customerPubkey = getTag(event, 'p');
  const quality = getTag(event, 'quality');
  const latencyMs = getTag(event, 'latency_ms');
  const customerSig = getTag(event, 'customer_sig');
  const skillType = getTag(event, 'd');

  if (!customerPubkey || !quality || !latencyMs || !customerSig || !skillType) {
    return { valid: false, error: 'Missing required tags (p, quality, latency_ms, customer_sig, d)' };
  }

  // Verify customer signature over canonical receipt data
  const jobRequestId = eRefs[0];
  const jobResultId = eRefs[1];
  const agentPubkey = event.pubkey;

  const preimage = `${jobRequestId}${jobResultId}${agentPubkey}${customerPubkey}${quality}${latencyMs}`;
  const hash = sha256(new TextEncoder().encode(preimage));

  try {
    const sigBytes = hexToBytes(customerSig);
    const pubBytes = hexToBytes(customerPubkey);
    const valid = schnorr.verify(sigBytes, hash, pubBytes);
    if (!valid) {
      return { valid: false, error: 'Invalid customer signature' };
    }
  } catch {
    return { valid: false, error: 'Signature verification failed (malformed sig or pubkey)' };
  }

  return { valid: true };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
