/**
 * Capacity index — in-memory index of agent capacity attestations.
 *
 * The relay's equivalent of a database table for kind-31900 events.
 * Wraps EWMACapacityCache with relay-specific concerns:
 *   - Tracks total registered agents
 *   - Prunes stale entries (3× epoch = 15 min)
 *   - Provides aggregate stats for relay health monitoring
 */

import { EWMACapacityCache } from '../capacity/cache.js';
import type { AgentCapacity } from '../capacity/cache.js';
import type { Event } from 'nostr-tools';

const STALE_THRESHOLD_S = 900; // 3 epochs × 300s = 15 minutes

export interface CapacityStats {
  totalAgents: number;
  totalSkills: number;
  agentsBySkill: Record<string, number>;
}

export class CapacityIndex {
  private cache: EWMACapacityCache;
  private knownSkills = new Set<string>();

  constructor(ewmaAlpha = 0.3) {
    this.cache = new EWMACapacityCache(ewmaAlpha);
  }

  /** Ingest a kind-31900 event. */
  ingest(event: Event): void {
    this.cache.ingest(event);
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    if (dTag) this.knownSkills.add(dTag);
  }

  /** Get candidates for a skill type. */
  getAgentsForSkill(skillType: string): AgentCapacity[] {
    return this.cache.getAgentsForSkill(skillType);
  }

  /** Get a single agent's capacity for a skill. */
  get(pubkey: string, skillType: string): AgentCapacity | undefined {
    return this.cache.get(pubkey, skillType);
  }

  /** Prune entries that haven't been updated in 15 minutes. */
  pruneStale(): number {
    return this.cache.prune(STALE_THRESHOLD_S);
  }

  /** Aggregate statistics for monitoring. */
  stats(): CapacityStats {
    const bySkill: Record<string, number> = {};
    let total = 0;

    for (const skill of this.knownSkills) {
      const agents = this.cache.getAgentsForSkill(skill);
      bySkill[skill] = agents.length;
      total += agents.length;
    }

    return {
      totalAgents: total,
      totalSkills: this.knownSkills.size,
      agentsBySkill: bySkill,
    };
  }

  /** Access the underlying cache (for routing). */
  getCache(): EWMACapacityCache {
    return this.cache;
  }
}
