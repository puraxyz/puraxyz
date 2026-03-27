/**
 * Integration test: spawning + genome tracker against a local relay.
 *
 * Requires strfry at ws://localhost:7777 (skipped if unavailable).
 * Tests: spawn event publish → genome publish → tracker ingestion → phylogeny.
 *
 * Run: cd nvm && npx vitest run test/integration/spawning-genome.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NostrClient } from '../../src/client/NostrClient.js';
import { generateKeypair } from '../../src/client/keys.js';
import {
  buildSpawningEvent,
  buildAgentGenome,
} from '../../src/events/builders.js';
import { NVM_KINDS } from '../../src/events/kinds.js';
import { GenomeTracker } from '../../src/genome/tracker.js';
import { finalizeEvent } from 'nostr-tools';

const RELAY_URL = process.env.NVM_RELAY ?? 'ws://localhost:7777';

async function relayAvailable(): Promise<boolean> {
  try {
    const ws = new WebSocket(RELAY_URL);
    return new Promise((resolve) => {
      const timer = setTimeout(() => { ws.close(); resolve(false); }, 2000);
      ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(true); };
      ws.onerror = () => { clearTimeout(timer); resolve(false); };
    });
  } catch {
    return false;
  }
}

describe('spawning + genome integration', () => {
  let available = false;
  let client: NostrClient;
  const parent = generateKeypair();
  const child = generateKeypair();

  beforeAll(async () => {
    available = await relayAvailable();
    if (!available) return;
    client = new NostrClient({ relays: [RELAY_URL] });
  });

  afterAll(() => {
    if (client) client.close();
  });

  it('publishes a spawning event and reads it back', async () => {
    if (!available) return;

    const unsigned = buildSpawningEvent(parent.publicKey, {
      childPubkey: child.publicKey,
      investmentMsats: 10000,
      revenueShareBps: 1500,
      skillType: 'summarization',
      rationale: 'integration-test spawn',
    });
    const signed = finalizeEvent(unsigned, parent.privateKey);
    await client.publish(signed);

    const events = await client.list([{
      kinds: [NVM_KINDS.SPAWNING_EVENT],
      authors: [parent.publicKey],
    }]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].pubkey).toBe(parent.publicKey);
  }, 10_000);

  it('publishes parent and child genomes, tracker builds phylogeny', async () => {
    if (!available) return;

    // Parent genome (generation 0, no parent)
    const parentGenome = buildAgentGenome(parent.publicKey, {
      parentPubkey: null,
      generation: 0,
      mutationDescription: 'root agent',
      fitness: 7500,
      skillConfigHash: 'abc123',
    });
    const signedParent = finalizeEvent(parentGenome, parent.privateKey);
    await client.publish(signedParent);

    // Child genome (generation 1, parent link)
    const childGenome = buildAgentGenome(child.publicKey, {
      parentPubkey: parent.publicKey,
      generation: 1,
      mutationDescription: 'mutated from parent',
      fitness: 6200,
      skillConfigHash: 'def456',
    });
    const signedChild = finalizeEvent(childGenome, child.privateKey);
    await client.publish(signedChild);

    // Read back from relay
    const events = await client.list([{
      kinds: [NVM_KINDS.AGENT_GENOME],
    }]);
    expect(events.length).toBeGreaterThanOrEqual(2);

    // Feed into tracker
    const tracker = new GenomeTracker();
    for (const e of events) {
      tracker.ingest(e);
    }

    expect(tracker.size()).toBeGreaterThanOrEqual(2);

    // Check parent
    const parentRecord = tracker.get(parent.publicKey);
    expect(parentRecord).toBeDefined();
    expect(parentRecord!.parentPubkey).toBeNull();
    expect(parentRecord!.generation).toBe(0);

    // Check child
    const childRecord = tracker.get(child.publicKey);
    expect(childRecord).toBeDefined();
    expect(childRecord!.parentPubkey).toBe(parent.publicKey);
    expect(childRecord!.generation).toBe(1);

    // Phylogeny: child ancestry should include both
    const ancestry = tracker.ancestry(child.publicKey);
    expect(ancestry.length).toBe(2);
    expect(ancestry[0].agentPubkey).toBe(child.publicKey);
    expect(ancestry[1].agentPubkey).toBe(parent.publicKey);

    // Children of parent
    const children = tracker.childrenOf(parent.publicKey);
    expect(children.length).toBeGreaterThanOrEqual(1);
    expect(children.some((c) => c.agentPubkey === child.publicKey)).toBe(true);
  }, 15_000);
});
