/**
 * Integration test: full NVM roundtrip against a local relay.
 *
 * Requires strfry at ws://localhost:7777 (skipped if unavailable).
 * Tests: capacity → job request → assignment → receipt flow.
 *
 * Run: cd nvm && npx vitest run test/integration/roundtrip.test.ts
 * Or with docker: docker compose up -d relay && npx vitest run ...
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NostrClient } from '../../src/client/NostrClient.js';
import { generateKeypair } from '../../src/client/keys.js';
import { buildCapacityAttestation, buildJobAssignment } from '../../src/events/builders.js';
import { NVM_KINDS } from '../../src/events/kinds.js';
import { EWMACapacityCache } from '../../src/capacity/cache.js';
import { finalizeEvent, type Event } from 'nostr-tools';

const RELAY_URL = process.env.NVM_RELAY ?? 'ws://localhost:7777';

// Check if relay is reachable before running tests
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

describe('NVM roundtrip', () => {
  let available = false;
  let client: NostrClient;
  const agent = generateKeypair();
  const customer = generateKeypair();
  const router = generateKeypair();

  beforeAll(async () => {
    available = await relayAvailable();
    if (!available) return;
    client = new NostrClient({ relays: [RELAY_URL] });
  });

  afterAll(() => {
    if (client) client.close();
  });

  it('publishes and receives a capacity attestation', async () => {
    if (!available) return; // skip if no relay

    const unsigned = buildCapacityAttestation(agent.publicKey, {
      skillType: 'nip90-5100',
      capacity: 10,
      latencyMs: 300,
      errorRateBps: 100,
      priceMsats: 1000,
      maxConcurrent: 5,
    });
    const signed = finalizeEvent(unsigned, agent.privateKey);
    await client.publish(signed);

    // Query it back
    const events = await client.list([{
      kinds: [NVM_KINDS.CAPACITY_ATTESTATION],
      authors: [agent.publicKey],
    }]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].pubkey).toBe(agent.publicKey);
  }, 10_000);

  it('capacity cache ingests relay events', async () => {
    if (!available) return;

    const cache = new EWMACapacityCache();
    const events = await client.list([{
      kinds: [NVM_KINDS.CAPACITY_ATTESTATION],
      authors: [agent.publicKey],
    }]);

    for (const e of events) {
      cache.ingest(e);
    }

    const agents = cache.getAgentsForSkill('nip90-5100');
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents[0].pubkey).toBe(agent.publicKey);
  }, 10_000);

  it('publishes a job request and receives it via subscription', async () => {
    if (!available) return;

    const received: Event[] = [];
    const sub = client.subscribe(
      [{ kinds: [5100], since: Math.floor(Date.now() / 1000) - 5 }],
      (event) => received.push(event),
    );

    // small delay for sub to connect
    await new Promise((r) => setTimeout(r, 500));

    const jobUnsigned = {
      kind: 5100,
      pubkey: customer.publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['i', 'Integration test job', 'text'],
        ['bid', '5000'],
        ['output', 'text/plain'],
      ],
      content: 'Test job for roundtrip integration',
    };
    const jobSigned = finalizeEvent(jobUnsigned, customer.privateKey);
    await client.publish(jobSigned);

    // Wait for event to arrive
    await new Promise((r) => setTimeout(r, 2000));
    sub.close();

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[0].kind).toBe(5100);
  }, 15_000);
});
