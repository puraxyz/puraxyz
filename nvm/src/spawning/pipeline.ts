/**
 * Spawning pipeline — the 5-stage process an agent goes through
 * when spawning a child agent.
 *
 * 1. Opportunity detection (see detector.ts)
 * 2. Eligibility check (reputation threshold, capital minimum)
 * 3. Key generation (new Nostr keypair for child)
 * 4. Genome publication (kind-31917 with parent lineage)
 * 5. Spawning event publication (kind-31912 announcement)
 *
 * Each stage returns a result or throws, so failures are easy to
 * trace back to the responsible step.
 */

import { generateKeypair } from '../client/keys.js';
import { bytesToHex } from '@noble/hashes/utils';
import type { SpawningEvent, AgentGenome } from '../events/kinds.js';
import { buildSpawningEvent, buildAgentGenome } from '../events/builders.js';
import { finalizeEvent, type UnsignedEvent } from 'nostr-tools';
import type { NostrClient } from '../client/NostrClient.js';
import type { ReputationComputer } from '../reputation/computer.js';
import type { MarketOpportunity } from './detector.js';

export interface SpawnConfig {
  /** Minimum composite reputation score (0-10000 bps) to be eligible as parent. */
  minReputationBps: number;
  /** Minimum investment (msats). */
  minInvestmentMsats: number;
  /** Parent's revenue share from child (bps). Default: 1500 (15%). */
  defaultRevenueShareBps: number;
}

export const SPAWN_DEFAULTS: SpawnConfig = {
  minReputationBps: 5000,
  minInvestmentMsats: 10_000,
  defaultRevenueShareBps: 1500,
};

export interface SpawnResult {
  childPubkey: string;
  childPrivateKeyHex: string;
  opportunity: MarketOpportunity;
  investmentMsats: number;
  revenueShareBps: number;
}

/** Check if an agent meets the parent eligibility requirements. */
export function checkEligibility(
  parentPubkey: string,
  reputation: ReputationComputer,
  config: SpawnConfig,
): { eligible: boolean; reason?: string } {
  const profile = reputation.computeProfile(parentPubkey);
  if (!profile) {
    return { eligible: false, reason: 'no reputation data' };
  }

  if (profile.avgQualityBps < config.minReputationBps) {
    return {
      eligible: false,
      reason: `quality ${profile.avgQualityBps} < minimum ${config.minReputationBps}`,
    };
  }

  if (profile.totalCompletions < 10) {
    return { eligible: false, reason: `only ${profile.totalCompletions} completions (need 10+)` };
  }

  return { eligible: true };
}

/**
 * Execute the full spawning pipeline. Returns the child's keypair
 * and publishes both the genome and spawning events.
 */
export async function executeSpawn(
  parentPubkey: string,
  parentSecretKey: Uint8Array,
  opportunity: MarketOpportunity,
  investmentMsats: number,
  client: NostrClient,
  reputation: ReputationComputer,
  config: SpawnConfig = SPAWN_DEFAULTS,
): Promise<SpawnResult> {
  // 1. Eligibility check
  const check = checkEligibility(parentPubkey, reputation, config);
  if (!check.eligible) {
    throw new Error(`Parent ineligible: ${check.reason}`);
  }

  if (investmentMsats < config.minInvestmentMsats) {
    throw new Error(`Investment ${investmentMsats} < minimum ${config.minInvestmentMsats}`);
  }

  // 2. Generate child keypair
  const child = generateKeypair();

  // 3. Determine parent's generation from its own genome (default 0 if unknown)
  const parentGeneration = 0; // TODO: look up parent genome event

  // 4. Publish genome event (kind-31917)
  const genomeUnsigned = buildAgentGenome(child.publicKey, {
    parentPubkey,
    generation: parentGeneration + 1,
    mutationDescription: `Spawned for ${opportunity.skillType} — ${opportunity.providerCount} providers, avg price ${opportunity.avgPriceMsats}ms`,
    fitness: 0, // no track record yet
    skillConfigHash: '', // child hasn't configured skills yet
  });
  const genomeSigned = finalizeEvent(genomeUnsigned as UnsignedEvent, parentSecretKey);
  await client.publish(genomeSigned);

  // 5. Publish spawning event (kind-31912)
  const spawnUnsigned = buildSpawningEvent(parentPubkey, {
    childPubkey: child.publicKey,
    investmentMsats,
    revenueShareBps: config.defaultRevenueShareBps,
    skillType: opportunity.skillType,
    rationale: `Market opportunity: ${opportunity.providerCount} providers, score ${opportunity.score.toFixed(2)}`,
  });
  const spawnSigned = finalizeEvent(spawnUnsigned as UnsignedEvent, parentSecretKey);
  await client.publish(spawnSigned);

  return {
    childPubkey: child.publicKey,
    childPrivateKeyHex: bytesToHex(child.privateKey),
    opportunity,
    investmentMsats,
    revenueShareBps: config.defaultRevenueShareBps,
  };
}
