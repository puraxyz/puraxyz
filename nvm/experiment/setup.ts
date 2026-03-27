/**
 * Experiment setup — bootstrap a local 5-agent test economy.
 *
 * Creates agents with different skill profiles and capacities,
 * starts an Agent Relay, and connects everything to a local
 * Nostr relay (or nostr-relay-tray for dev).
 *
 * Usage:
 *   npx ts-node nvm/experiment/setup.ts
 *
 * Requires a local Nostr relay at ws://localhost:7777.
 * Use `nostr-relay-tray` or `nostream` for development.
 */

import { generateKeypair } from '../src/client/keys.js';
import { NostrClient } from '../src/client/NostrClient.js';
import { buildCapacityAttestation } from '../src/events/builders.js';
import type { CapacityAttestation } from '../src/events/kinds.js';
import { finalizeEvent } from 'nostr-tools';

const LOCAL_RELAY = process.env.NVM_RELAY ?? 'ws://localhost:7777';

/** Agent profiles for the 5-agent economy proof. */
const AGENT_PROFILES: Array<{
  name: string;
  skills: CapacityAttestation[];
}> = [
  {
    name: 'agent-fast',
    skills: [
      {
        skillType: 'nip90-5100',
        capacity: 20,
        latencyMs: 200,
        errorRateBps: 100,
        priceMsats: 500,
        maxConcurrent: 10,
        model: 'llama-3.3-70b',
        name: 'Fast LLM',
        about: 'Low-latency, cheap inference',
      },
    ],
  },
  {
    name: 'agent-quality',
    skills: [
      {
        skillType: 'nip90-5100',
        capacity: 5,
        latencyMs: 2000,
        errorRateBps: 50,
        priceMsats: 5000,
        maxConcurrent: 3,
        model: 'claude-sonnet-4-20250514',
        name: 'Quality LLM',
        about: 'High quality, slower, expensive',
      },
    ],
  },
  {
    name: 'agent-coder',
    skills: [
      {
        skillType: 'nip90-5100',
        capacity: 8,
        latencyMs: 1000,
        errorRateBps: 200,
        priceMsats: 3000,
        maxConcurrent: 5,
        model: 'gpt-4o',
        name: 'Code Agent',
        about: 'Code generation and review',
      },
      {
        skillType: 'nip90-5050',
        capacity: 15,
        latencyMs: 500,
        errorRateBps: 100,
        priceMsats: 1000,
        maxConcurrent: 8,
        name: 'Code Review',
        about: 'Automated code review',
      },
    ],
  },
  {
    name: 'agent-translator',
    skills: [
      {
        skillType: 'nip90-5002',
        capacity: 30,
        latencyMs: 300,
        errorRateBps: 50,
        priceMsats: 200,
        maxConcurrent: 15,
        name: 'Translator',
        about: 'Multi-language translation',
      },
    ],
  },
  {
    name: 'agent-summarizer',
    skills: [
      {
        skillType: 'nip90-5001',
        capacity: 12,
        latencyMs: 800,
        errorRateBps: 150,
        priceMsats: 1500,
        maxConcurrent: 6,
        name: 'Summarizer',
        about: 'Text summarization and extraction',
      },
    ],
  },
];

export interface ExperimentAgent {
  name: string;
  pubkey: string;
  secretKey: Uint8Array;
  skills: string[];
}

/**
 * Bootstrap the experiment: generate keys, publish initial capacity
 * attestations, return agent handles for scenario execution.
 */
export async function setupExperiment(): Promise<ExperimentAgent[]> {
  console.log(`[SETUP] Connecting to relay: ${LOCAL_RELAY}`);

  const agents: ExperimentAgent[] = [];

  for (const profile of AGENT_PROFILES) {
    const { secretKey, publicKey } = generateKeypair();

    const client = new NostrClient({
      relays: [LOCAL_RELAY],
    });

    // Publish capacity attestations for each skill
    for (const skill of profile.skills) {
      const unsigned = buildCapacityAttestation(publicKey, skill);
      const signed = finalizeEvent(unsigned, secretKey);
      await client.publish(signed);
      console.log(`[SETUP] ${profile.name} → published ${skill.skillType} capacity`);
    }

    client.close();

    agents.push({
      name: profile.name,
      pubkey: publicKey,
      secretKey,
      skills: profile.skills.map((s) => s.skillType),
    });
  }

  console.log(`[SETUP] ${agents.length} agents bootstrapped`);
  return agents;
}

// Run directly
if (process.argv[1]?.endsWith('setup.ts') || process.argv[1]?.endsWith('setup.js')) {
  setupExperiment()
    .then((agents) => {
      console.log('\nAgent summary:');
      for (const a of agents) {
        console.log(`  ${a.name}: ${a.pubkey.slice(0, 16)}… skills=[${a.skills.join(',')}]`);
      }
    })
    .catch(console.error);
}
