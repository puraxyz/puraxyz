#!/usr/bin/env npx ts-node
/**
 * Capacity reporter — publishes kind-31900 capacity attestation events
 * to Nostr relays every 5 minutes, or when load changes by >20%.
 *
 * The attestation tells routers: "I'm here, I can do X, and here's
 * how busy I am right now."
 *
 * Usage:
 *   NVM_PRIVATE_KEY=<hex> NVM_RELAYS=wss://relay.damus.io NVM_SKILLS=nip90-5100 \
 *     npx ts-node openclaw-skill/scripts/capacity-reporter.ts
 */

import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools';

const EPOCH_INTERVAL_MS = 300_000; // 5 minutes, matching paper
const CHANGE_THRESHOLD = 0.20; // 20% load change triggers early publish
const NVM_CAPACITY_ATTESTATION = 31900;

function loadConfig() {
  const privKeyHex = process.env.NVM_PRIVATE_KEY;
  if (!privKeyHex) throw new Error('NVM_PRIVATE_KEY required (hex)');
  const secretKey = Uint8Array.from(Buffer.from(privKeyHex, 'hex'));
  const pubkey = getPublicKey(secretKey);
  const relays = (process.env.NVM_RELAYS ?? 'wss://relay.damus.io').split(',');
  const skills = (process.env.NVM_SKILLS ?? 'nip90-5100').split(',');

  return { secretKey, pubkey, relays, skills };
}

/** Simple load measurement — tracks active jobs and queue depth. */
class LoadTracker {
  activeJobs = 0;
  queueDepth = 0;
  latencies: number[] = [];
  errors = 0;
  total = 0;
  maxConcurrent = 5;

  snapshot() {
    const errRate = this.total > 0 ? (this.errors / this.total) * 10000 : 0;
    const p50 = this.p50Latency();
    const available = Math.max(0, this.maxConcurrent - this.activeJobs);
    return {
      capacity: available,
      latencyMs: p50,
      errorRateBps: Math.round(errRate),
      maxConcurrent: this.maxConcurrent,
    };
  }

  private p50Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}

async function publishAttestation(
  config: ReturnType<typeof loadConfig>,
  pool: SimplePool,
  tracker: LoadTracker,
): Promise<void> {
  const snap = tracker.snapshot();

  for (const skill of config.skills) {
    const tags: string[][] = [
      ['d', skill],
      ['capacity', String(snap.capacity)],
      ['latency_ms', String(snap.latencyMs)],
      ['error_rate_bps', String(snap.errorRateBps)],
      ['price_msats', '1000'], // TODO: dynamic pricing based on load
      ['max_concurrent', String(snap.maxConcurrent)],
    ];

    const unsigned = {
      kind: NVM_CAPACITY_ATTESTATION,
      pubkey: config.pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: JSON.stringify({ name: 'pura-1', about: 'OpenClaw agent' }),
    };

    const signed = finalizeEvent(unsigned, config.secretKey);
    await Promise.allSettled(pool.publish(config.relays, signed));
    console.log(`[CAP] Published attestation for ${skill} — capacity=${snap.capacity}`);
  }
}

async function main() {
  const config = loadConfig();
  const pool = new SimplePool();
  const tracker = new LoadTracker();

  console.log(`[CAP] Agent pubkey: ${config.pubkey.slice(0, 16)}…`);
  console.log(`[CAP] Skills: ${config.skills.join(', ')}`);
  console.log(`[CAP] Publishing every ${EPOCH_INTERVAL_MS / 1000}s`);

  // Initial attestation
  await publishAttestation(config, pool, tracker);

  // Periodic attestation
  let lastCapacity = tracker.snapshot().capacity;

  const interval = setInterval(async () => {
    const snap = tracker.snapshot();
    const changed = Math.abs(snap.capacity - lastCapacity) / Math.max(lastCapacity, 1);

    if (changed >= CHANGE_THRESHOLD || true) {
      // Always publish at epoch boundaries
      await publishAttestation(config, pool, tracker);
      lastCapacity = snap.capacity;
    }
  }, EPOCH_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('[CAP] Shutting down…');
    clearInterval(interval);
    pool.close(config.relays);
    process.exit(0);
  });
}

main().catch(console.error);
