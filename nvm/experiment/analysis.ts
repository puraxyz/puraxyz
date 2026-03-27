/**
 * Experiment analysis — reads recorded JSONL files and produces
 * aggregate metrics, routing distribution charts (text), and
 * convergence analysis.
 *
 * Usage:
 *   npx ts-node nvm/experiment/analysis.ts <path-to-jsonl>
 */

import { readFileSync } from 'fs';
import { NVM_KINDS } from '../src/events/kinds.js';
import type { Event } from 'nostr-tools';

interface RecordedLine {
  recorded_at: number;
  event: Event;
}

interface RoutingStats {
  /** Agent pubkey → number of jobs assigned. */
  assignmentsByAgent: Record<string, number>;
  /** Total explore vs exploit selections. */
  explored: number;
  exploited: number;
  /** Average routing score. */
  avgRoutingScore: number;
  /** Average price in msats. */
  avgPriceMsats: number;
}

interface CapacityTimeline {
  /** Agent pubkey → array of (timestamp, smoothedCapacity). */
  series: Record<string, Array<[number, number]>>;
}

interface QualityTimeline {
  /** Agent pubkey → array of (timestamp, scoreBps). */
  series: Record<string, Array<[number, number]>>;
}

export function analyzeExperiment(jsonlPath: string) {
  const lines = readFileSync(jsonlPath, 'utf-8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RecordedLine);

  console.log(`Loaded ${lines.length} events from ${jsonlPath}\n`);

  const events = lines.map((l) => l.event);

  // Categorize
  const capacity = events.filter((e) => e.kind === NVM_KINDS.CAPACITY_ATTESTATION);
  const receipts = events.filter((e) => e.kind === NVM_KINDS.COMPLETION_RECEIPT);
  const quality = events.filter((e) => e.kind === NVM_KINDS.QUALITY_SCORE);
  const assignments = events.filter((e) => e.kind === NVM_KINDS.JOB_ASSIGNMENT);
  const pipelineSpecs = events.filter((e) => e.kind === NVM_KINDS.PIPELINE_SPEC);
  const pipelineStates = events.filter((e) => e.kind === NVM_KINDS.PIPELINE_STATE);
  const jobRequests = events.filter((e) => e.kind >= 5000 && e.kind < 6000);
  const jobResults = events.filter((e) => e.kind >= 6000 && e.kind < 7000);

  console.log('Event counts:');
  console.log(`  Capacity attestations: ${capacity.length}`);
  console.log(`  Completion receipts:   ${receipts.length}`);
  console.log(`  Quality scores:        ${quality.length}`);
  console.log(`  Job assignments:       ${assignments.length}`);
  console.log(`  Pipeline specs:        ${pipelineSpecs.length}`);
  console.log(`  Pipeline states:       ${pipelineStates.length}`);
  console.log(`  Job requests:          ${jobRequests.length}`);
  console.log(`  Job results:           ${jobResults.length}`);
  console.log();

  // Routing analysis
  const routing = analyzeRouting(assignments);
  console.log('Routing distribution:');
  for (const [agent, count] of Object.entries(routing.assignmentsByAgent)) {
    const pct = ((count / assignments.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / 2));
    console.log(`  ${agent.slice(0, 12)}…  ${count} jobs (${pct}%) ${bar}`);
  }
  console.log();
  console.log(`  Explore/Exploit ratio: ${routing.explored}/${routing.exploited}`);
  console.log(`  Avg routing score:     ${routing.avgRoutingScore.toFixed(4)}`);
  console.log(`  Avg price:             ${routing.avgPriceMsats.toFixed(0)} msats`);
  console.log();

  // Completion rate
  const completionRate =
    jobResults.length > 0
      ? ((jobResults.length / jobRequests.length) * 100).toFixed(1)
      : 'N/A';
  console.log(`Completion rate: ${completionRate}%`);
  console.log(`  Requests: ${jobRequests.length}, Results: ${jobResults.length}`);
}

function analyzeRouting(assignments: Event[]): RoutingStats {
  const byAgent: Record<string, number> = {};
  let explored = 0;
  let exploited = 0;
  let totalScore = 0;
  let totalPrice = 0;

  for (const event of assignments) {
    const agent = event.tags.find((t) => t[0] === 'p')?.[1] ?? 'unknown';
    byAgent[agent] = (byAgent[agent] ?? 0) + 1;

    const isExplored = event.tags.find((t) => t[0] === 'explored')?.[1] === 'true';
    if (isExplored) explored++;
    else exploited++;

    const score = parseFloat(event.tags.find((t) => t[0] === 'routing_score')?.[1] ?? '0');
    totalScore += score;

    const price = parseInt(event.tags.find((t) => t[0] === 'price_msats')?.[1] ?? '0', 10);
    totalPrice += price;
  }

  return {
    assignmentsByAgent: byAgent,
    explored,
    exploited,
    avgRoutingScore: assignments.length > 0 ? totalScore / assignments.length : 0,
    avgPriceMsats: assignments.length > 0 ? totalPrice / assignments.length : 0,
  };
}

// Run directly
const inputFile = process.argv[2];
if (inputFile) {
  analyzeExperiment(inputFile);
} else {
  console.log('Usage: npx ts-node nvm/experiment/analysis.ts <path-to-jsonl>');
}
