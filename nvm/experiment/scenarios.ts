/**
 * Experiment scenarios — predefined workloads to test BPE routing behavior.
 *
 * Each scenario generates a stream of NIP-90 job requests with specific
 * patterns to exercise different aspects of the routing algorithm.
 */

import { finalizeEvent } from 'nostr-tools';
import { NostrClient } from '../src/client/NostrClient.js';
import type { ExperimentAgent } from './setup.js';

const LOCAL_RELAY = process.env.NVM_RELAY ?? 'ws://localhost:7777';

export interface ScenarioConfig {
  /** Total number of job requests to generate. */
  totalJobs: number;
  /** Target jobs per second. */
  ratePerSecond: number;
  /** Which NIP-90 kind to request. */
  jobKind: number;
}

/**
 * Scenario 1: Steady-state load
 * Constant request rate, single skill, all agents compete.
 * Tests: basic max-weight selection, price convergence.
 */
export const STEADY_STATE: ScenarioConfig = {
  totalJobs: 100,
  ratePerSecond: 2,
  jobKind: 5100,
};

/**
 * Scenario 2: Flash spike
 * Sudden 10× burst for 10 seconds, then back to normal.
 * Tests: congestion pricing, capacity exhaustion behavior.
 */
export const FLASH_SPIKE: ScenarioConfig = {
  totalJobs: 200,
  ratePerSecond: 20, // burst rate
  jobKind: 5100,
};

/**
 * Scenario 3: Quality degradation
 * One agent starts returning errors at 50% rate midway through.
 * Tests: exploration rate increase, quality-weighted re-routing.
 */
export const QUALITY_DEGRADATION: ScenarioConfig = {
  totalJobs: 150,
  ratePerSecond: 3,
  jobKind: 5100,
};

/**
 * Scenario 4: Multi-skill pipeline
 * Submits pipeline specs (kind-31904) that chain translation → summarization.
 * Tests: DAG execution, cross-skill routing, budget tracking.
 */
export const PIPELINE: ScenarioConfig = {
  totalJobs: 20,
  ratePerSecond: 0.5,
  jobKind: 5002, // starts with translation
};

/**
 * Run a scenario by generating job requests at the specified rate.
 * Returns the published event IDs for correlation with results.
 */
export async function runScenario(
  scenario: ScenarioConfig,
  customerSecretKey: Uint8Array,
  customerPubkey: string,
  agents: ExperimentAgent[],
): Promise<string[]> {
  const client = new NostrClient({ relays: [LOCAL_RELAY] });
  const delayMs = 1000 / scenario.ratePerSecond;
  const eventIds: string[] = [];

  console.log(
    `[SCENARIO] Starting: ${scenario.totalJobs} jobs at ${scenario.ratePerSecond}/s, kind=${scenario.jobKind}`,
  );

  for (let i = 0; i < scenario.totalJobs; i++) {
    const unsigned = {
      kind: scenario.jobKind,
      pubkey: customerPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['i', `Test job ${i + 1}/${scenario.totalJobs}`, 'text'],
        ['bid', '10000'], // 10 sats max
        ['output', 'text/plain'],
      ],
      content: `Experiment job request #${i + 1}`,
    };

    const signed = finalizeEvent(unsigned, customerSecretKey);
    await client.publish(signed);
    eventIds.push(signed.id);

    if (i % 10 === 0) {
      console.log(`[SCENARIO] Published ${i + 1}/${scenario.totalJobs}`);
    }

    await sleep(delayMs);
  }

  client.close();
  console.log(`[SCENARIO] Complete: ${eventIds.length} jobs published`);
  return eventIds;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
