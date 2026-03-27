/**
 * Genome tracker — ingests kind-31917 (AgentGenome) events and
 * maintains an in-memory registry of all known agent genomes.
 *
 * A genome records an agent's lineage (parent, generation) and
 * current fitness score (quality-adjusted net earnings per epoch).
 */

import { NVM_KINDS } from '../events/kinds.js';
import type { AgentGenome } from '../events/kinds.js';
import type { Event } from 'nostr-tools';
import { getTag } from '../events/validators.js';

export interface TrackedGenome extends AgentGenome {
  agentPubkey: string;
  lastUpdated: number;
}

export class GenomeTracker {
  private genomes = new Map<string, TrackedGenome>();

  /** Process a kind-31917 genome event. */
  ingest(event: Event): void {
    if (event.kind !== NVM_KINDS.AGENT_GENOME) return;

    const agentPubkey = event.pubkey;
    const parentPubkey = getTag(event, 'parent') ?? null;
    const generation = Number(getTag(event, 'generation')) || 0;
    const mutationDescription = getTag(event, 'mutation_description') ?? '';
    const fitness = Number(getTag(event, 'fitness')) || 0;
    const skillConfigHash = getTag(event, 'skill_config_hash') ?? '';

    const existing = this.genomes.get(agentPubkey);
    if (existing && existing.lastUpdated >= event.created_at) return;

    this.genomes.set(agentPubkey, {
      parentPubkey,
      generation,
      mutationDescription,
      fitness,
      skillConfigHash,
      agentPubkey,
      lastUpdated: event.created_at,
    });
  }

  get(pubkey: string): TrackedGenome | undefined {
    return this.genomes.get(pubkey);
  }

  /** All tracked genomes. */
  all(): TrackedGenome[] {
    return Array.from(this.genomes.values());
  }

  /** Get all children of a given parent. */
  childrenOf(parentPubkey: string): TrackedGenome[] {
    return this.all().filter((g) => g.parentPubkey === parentPubkey);
  }

  /** Get the full ancestry chain from an agent to the root. */
  ancestry(pubkey: string): TrackedGenome[] {
    const chain: TrackedGenome[] = [];
    let current = this.genomes.get(pubkey);
    while (current) {
      chain.push(current);
      if (!current.parentPubkey) break;
      current = this.genomes.get(current.parentPubkey);
    }
    return chain;
  }

  /** Top N agents by fitness score. */
  topByFitness(n: number): TrackedGenome[] {
    return this.all()
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, n);
  }

  size(): number {
    return this.genomes.size;
  }
}
