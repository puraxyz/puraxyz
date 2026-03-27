/**
 * Integration test: credit + reputation flow against a local relay.
 *
 * Requires strfry at ws://localhost:7777 (skipped if unavailable).
 * Tests: credit line → credit dispatch → reputation publish.
 *
 * Run: cd nvm && npx vitest run test/integration/credit-reputation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NostrClient } from '../../src/client/NostrClient.js';
import { generateKeypair } from '../../src/client/keys.js';
import {
  buildCreditLine,
  buildCompletionReceipt,
} from '../../src/events/builders.js';
import { NVM_KINDS } from '../../src/events/kinds.js';
import { CreditGraph } from '../../src/credit/graph.js';
import { dispatchWithCredit } from '../../src/credit/dispatch.js';
import { ReputationComputer } from '../../src/reputation/computer.js';
import { finalizeEvent, type Event } from 'nostr-tools';

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

describe('credit + reputation integration', () => {
  let available = false;
  let client: NostrClient;
  const orchestrator = generateKeypair();
  const agent = generateKeypair();

  beforeAll(async () => {
    available = await relayAvailable();
    if (!available) return;
    client = new NostrClient({ relays: [RELAY_URL] });
  });

  afterAll(() => {
    if (client) client.close();
  });

  it('publishes a credit line and reads it back', async () => {
    if (!available) return;

    const unsigned = buildCreditLine(orchestrator.publicKey, {
      debtorPubkey: agent.publicKey,
      amountMsats: 50000,
      expires: Math.floor(Date.now() / 1000) + 86400,
      interestRateBps: 100,
      collateralQualityBps: 8000,
    });
    const signed = finalizeEvent(unsigned, orchestrator.privateKey);
    await client.publish(signed);

    const events = await client.list([{
      kinds: [NVM_KINDS.CREDIT_LINE],
      authors: [orchestrator.publicKey],
    }]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].pubkey).toBe(orchestrator.publicKey);
  }, 10_000);

  it('credit graph ingests relay events and dispatch uses credit', async () => {
    if (!available) return;

    const graph = new CreditGraph();
    const events = await client.list([{
      kinds: [NVM_KINDS.CREDIT_LINE],
      authors: [orchestrator.publicKey],
    }]);

    for (const e of events) {
      graph.ingest(e);
    }

    const available_credit = graph.availableCredit(
      orchestrator.publicKey,
      agent.publicKey,
    );
    expect(available_credit).toBeGreaterThan(0);

    const result = dispatchWithCredit(
      orchestrator.publicKey,
      agent.publicKey,
      1000,
      graph,
    );
    expect(result.mode).toBe('credit');
    expect(result.creditUsedMsats).toBe(1000);
  }, 10_000);

  it('reputation computer aggregates completion receipts from relay', async () => {
    if (!available) return;

    // Publish a completion receipt
    const unsigned = buildCompletionReceipt(agent.publicKey, {
      jobRequestEventId: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      jobResultEventId: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      customerPubkey: orchestrator.publicKey,
      agentPubkey: agent.publicKey,
      skillType: 'code-review',
      qualityBps: 8500,
      latencyMs: 450,
      customerSig: 'sig_placeholder',
    });
    const signed = finalizeEvent(unsigned, agent.privateKey);
    await client.publish(signed);

    // Read back and feed to reputation computer
    const receipts = await client.list([{
      kinds: [NVM_KINDS.COMPLETION_RECEIPT],
      authors: [agent.publicKey],
    }]);

    const computer = new ReputationComputer();
    for (const r of receipts) {
      computer.ingest(r);
    }

    const profile = computer.computeProfile(agent.publicKey);
    expect(profile).toBeDefined();
    expect(profile!.totalCompletions).toBeGreaterThanOrEqual(1);
    expect(profile!.avgQualityBps).toBeGreaterThan(0);
  }, 10_000);
});
