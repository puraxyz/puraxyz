/**
 * Keypair management — generate, load, and encode Nostr keys.
 *
 * Uses @noble/secp256k1 for key generation and nostr-tools for NIP-19 encoding.
 */

import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

export interface Keypair {
  privateKey: Uint8Array;
  publicKey: string; // hex
}

/** Generate a fresh Nostr keypair. */
export function generateKeypair(): Keypair {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return { privateKey: sk, publicKey: pk };
}

/** Load a keypair from a hex-encoded private key (64 chars). */
export function loadKeypair(hexPrivateKey: string): Keypair {
  if (hexPrivateKey.length !== 64) {
    throw new Error('Private key must be 64 hex characters');
  }
  const sk = hexToBytes(hexPrivateKey);
  const pk = getPublicKey(sk);
  return { privateKey: sk, publicKey: pk };
}

/** Load from environment variable, falling back to key generation. */
export function loadOrGenerateKeypair(envVar = 'NVM_PRIVATE_KEY'): Keypair {
  const hex = process.env[envVar];
  if (hex) return loadKeypair(hex);
  const kp = generateKeypair();
  console.warn(`No ${envVar} set — generated ephemeral keypair: ${npubEncode(kp.publicKey)}`);
  return kp;
}

/** Encode a hex pubkey as npub (NIP-19). */
export function npubEncode(hexPubkey: string): string {
  return nip19.npubEncode(hexPubkey);
}

/** Encode a private key as nsec (NIP-19). */
export function nsecEncode(privateKey: Uint8Array): string {
  return nip19.nsecEncode(privateKey);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
