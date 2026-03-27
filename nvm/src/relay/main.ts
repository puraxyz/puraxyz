/**
 * NVM Agent Relay — CLI entry point.
 *
 * Reads configuration from environment variables, starts the AgentRelay,
 * and handles graceful shutdown on SIGINT/SIGTERM.
 *
 * Environment variables:
 *   NVM_RELAYS           — comma-separated relay WebSocket URLs (default: ws://localhost:7777)
 *   NVM_PRIVATE_KEY      — 64-char hex private key (auto-generated if omitted)
 *   NVM_JOB_KINDS        — comma-separated NIP-90 job kinds to route (default: 5100)
 *   NVM_PRUNE_INTERVAL_MS — stale capacity prune interval in ms (default: 300000)
 */

import { AgentRelay } from './index.js';
import { loadOrGenerateKeypair, npubEncode } from '../client/keys.js';
import { bytesToHex } from '@noble/hashes/utils';

const relays = (process.env.NVM_RELAYS ?? 'ws://localhost:7777')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

const jobKinds = (process.env.NVM_JOB_KINDS ?? '5100')
  .split(',')
  .map((k) => parseInt(k.trim(), 10))
  .filter((k) => !isNaN(k));

const pruneIntervalMs = parseInt(
  process.env.NVM_PRUNE_INTERVAL_MS ?? '300000',
  10,
);

const keypair = loadOrGenerateKeypair('NVM_PRIVATE_KEY');
const privateKeyHex = bytesToHex(keypair.privateKey);

console.log('[NVM] Starting Agent Relay');
console.log(`[NVM] Relays: ${relays.join(', ')}`);
console.log(`[NVM] Pubkey: ${npubEncode(keypair.publicKey)}`);
console.log(`[NVM] Job kinds: ${jobKinds.join(', ')}`);

const relay = new AgentRelay({
  relays,
  privateKeyHex,
  jobKinds,
  pruneIntervalMs,
});

relay.start().then(() => {
  console.log('[NVM] Agent Relay running. Press Ctrl+C to stop.');
});

function shutdown() {
  console.log('\n[NVM] Shutting down...');
  relay.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
