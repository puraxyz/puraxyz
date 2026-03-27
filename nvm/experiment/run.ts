/**
 * Experiment runner — single script that bootstraps a local agent economy,
 * runs a scenario, records events, and prints analysis.
 *
 * Usage:
 *   npx tsx nvm/experiment/run.ts [scenario]
 *
 * Scenarios: steady (default), spike, degradation, pipeline
 * Requires: strfry at ws://localhost:7777 (docker compose up relay)
 */

import { setupExperiment } from './setup.js';
import {
  runScenario,
  STEADY_STATE,
  FLASH_SPIKE,
  QUALITY_DEGRADATION,
  PIPELINE,
  type ScenarioConfig,
} from './scenarios.js';
import { EventRecorder } from './recorder.js';
import { analyzeExperiment } from './analysis.js';
import { AgentRelay } from '../src/relay/index.js';
import { generateKeypair } from '../src/client/keys.js';
import { bytesToHex } from '@noble/hashes/utils';

const scenarios: Record<string, ScenarioConfig> = {
  steady: STEADY_STATE,
  spike: FLASH_SPIKE,
  degradation: QUALITY_DEGRADATION,
  pipeline: PIPELINE,
};

async function main() {
  const scenarioName = process.argv[2] ?? 'steady';
  const scenario = scenarios[scenarioName];
  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.error(`Available: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n=== NVM Experiment: ${scenarioName} ===\n`);

  // 1. Start the Agent Relay
  const relayKey = generateKeypair();
  const relay = new AgentRelay({
    relays: [process.env.NVM_RELAY ?? 'ws://localhost:7777'],
    privateKeyHex: bytesToHex(relayKey.privateKey),
    jobKinds: [5100, 5001, 5002, 5050],
  });
  await relay.start();
  console.log('[RUN] Agent Relay started\n');

  // 2. Bootstrap agents
  const agents = await setupExperiment();
  console.log();

  // Wait for capacity events to propagate
  await sleep(2000);
  console.log(`[RUN] Relay stats: ${JSON.stringify(relay.stats())}\n`);

  // 3. Start recording
  const recorder = new EventRecorder({
    outputDir: 'experiment/results',
    experimentName: scenarioName,
  });
  recorder.start();

  // 4. Run scenario
  const customerKey = generateKeypair();
  const eventIds = await runScenario(
    scenario,
    customerKey.privateKey,
    customerKey.publicKey,
    agents,
  );
  console.log();

  // 5. Wait for routing and results to settle
  console.log('[RUN] Waiting 5s for events to settle...');
  await sleep(5000);

  // 6. Stop recording
  recorder.stop();
  console.log();

  // 7. Analyze
  console.log('=== Analysis ===\n');
  analyzeExperiment(recorder.path());

  // 8. Cleanup
  relay.stop();
  console.log(`\n[RUN] Done. Results: ${recorder.path()}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('Experiment failed:', err);
  process.exit(1);
});
