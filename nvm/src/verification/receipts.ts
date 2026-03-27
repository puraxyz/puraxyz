/**
 * Completion receipts — dual-signed proof of work, Nostr-native.
 *
 * Mirrors CompletionTracker.sol's EIP-712 typed data verification,
 * adapted from ECDSA/EIP-712 to Schnorr/Nostr:
 *
 * Solidity:
 *   structHash = keccak256(abi.encode(COMPLETION_TYPEHASH, taskTypeId, sink, source, taskId, timestamp))
 *   digest = _hashTypedDataV4(structHash)
 *   recoveredSink = digest.recover(sinkSig)
 *   recoveredSource = digest.recover(sourceSig)
 *
 * Nostr equivalent:
 *   preimage = jobRequestId + jobResultId + agentPubkey + customerPubkey + quality + latencyMs
 *   hash = sha256(preimage)
 *   verify schnorr(customerSig, hash, customerPubkey)
 */

import { sha256 } from '@noble/hashes/sha256';
import { schnorr } from '@noble/curves/secp256k1.js';
import { bytesToHex } from '@noble/hashes/utils';

export interface ReceiptData {
  jobRequestEventId: string;
  jobResultEventId: string;
  agentPubkey: string;
  customerPubkey: string;
  qualityBps: number;
  latencyMs: number;
}

/** Compute the canonical receipt hash that both parties sign. */
export function receiptHash(data: ReceiptData): Uint8Array {
  const preimage = [
    data.jobRequestEventId,
    data.jobResultEventId,
    data.agentPubkey,
    data.customerPubkey,
    String(data.qualityBps),
    String(data.latencyMs),
  ].join('');

  return sha256(new TextEncoder().encode(preimage));
}

/**
 * Create a customer signature over the receipt hash.
 * The customer calls this to produce the `customer_sig` tag value.
 */
export function createReceipt(
  data: ReceiptData,
  customerPrivateKey: Uint8Array,
): string {
  const hash = receiptHash(data);
  const sig = schnorr.sign(hash, customerPrivateKey);
  return bytesToHex(sig);
}

/**
 * Verify a customer's signature over the receipt hash.
 * Returns true if the signature is valid.
 */
export function verifyReceipt(
  data: ReceiptData,
  customerSigHex: string,
): boolean {
  const hash = receiptHash(data);
  try {
    const sigBytes = hexToBytes(customerSigHex);
    const pubBytes = hexToBytes(data.customerPubkey);
    return schnorr.verify(sigBytes, hash, pubBytes);
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
