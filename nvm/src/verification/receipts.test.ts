import { describe, it, expect } from 'vitest';
import { receiptHash, createReceipt, verifyReceipt } from './receipts.js';
import type { ReceiptData } from './receipts.js';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

function makeReceiptData(customerPubkey: string): ReceiptData {
  return {
    jobRequestEventId: 'a'.repeat(64),
    jobResultEventId: 'b'.repeat(64),
    agentPubkey: 'c'.repeat(64),
    customerPubkey,
    qualityBps: 8500,
    latencyMs: 450,
  };
}

describe('receiptHash', () => {
  it('returns 32-byte Uint8Array', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const hash = receiptHash(makeReceiptData(pk));
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);
  });

  it('produces different hashes for different data', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const data1 = makeReceiptData(pk);
    const data2 = { ...data1, qualityBps: 5000 };
    const h1 = bytesToHex(receiptHash(data1));
    const h2 = bytesToHex(receiptHash(data2));
    expect(h1).not.toBe(h2);
  });

  it('is deterministic', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const data = makeReceiptData(pk);
    const h1 = bytesToHex(receiptHash(data));
    const h2 = bytesToHex(receiptHash(data));
    expect(h1).toBe(h2);
  });
});

describe('createReceipt + verifyReceipt', () => {
  it('creates a verifiable signature', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const data = makeReceiptData(pk);
    const sig = createReceipt(data, sk);

    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(128); // 64-byte Schnorr sig in hex

    const valid = verifyReceipt(data, sig);
    expect(valid).toBe(true);
  });

  it('fails verification with wrong pubkey', () => {
    const sk1 = generateSecretKey();
    const pk1 = getPublicKey(sk1);
    const sk2 = generateSecretKey();
    const pk2 = getPublicKey(sk2);

    const data = makeReceiptData(pk2); // data says pk2
    const sig = createReceipt(data, sk1); // signed by sk1
    const valid = verifyReceipt(data, sig);
    expect(valid).toBe(false);
  });

  it('fails verification with tampered data', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const data = makeReceiptData(pk);
    const sig = createReceipt(data, sk);

    const tampered = { ...data, qualityBps: 1000 };
    const valid = verifyReceipt(tampered, sig);
    expect(valid).toBe(false);
  });

  it('fails verification with garbage signature', () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    const data = makeReceiptData(pk);
    const valid = verifyReceipt(data, 'ff'.repeat(64));
    expect(valid).toBe(false);
  });
});
