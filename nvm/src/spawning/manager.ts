/**
 * Spawning manager — watches the market and triggers agent spawning
 * when profitable opportunities exist.
 *
 * Runs on a timer: detect opportunities → check eligibility →
 * spawn if worthwhile. Each cycle publishes at most one spawn
 * to avoid flooding the network.
 */

import type { NostrClient } from '../client/NostrClient.js';
import type { EWMACapacityCache } from '../capacity/cache.js';
import type { ReputationComputer } from '../reputation/computer.js';
import { detectOpportunities } from './detector.js';
import { executeSpawn, checkEligibility, SPAWN_DEFAULTS, type SpawnConfig } from './pipeline.js';

export class SpawningManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private spawnsExecuted = 0;

  constructor(
    private agentPubkey: string,
    private agentSecretKey: Uint8Array,
    private client: NostrClient,
    private capacityCache: EWMACapacityCache,
    private reputation: ReputationComputer,
    private config: SpawnConfig = SPAWN_DEFAULTS,
    private scanIntervalMs = 600_000, // 10 minutes
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      this.scan().catch((err) =>
        console.error('[SPAWNING] Scan error:', err),
      );
    }, this.scanIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async scan(): Promise<void> {
    // 1. Check parent eligibility first (avoid wasted work)
    const eligible = checkEligibility(this.agentPubkey, this.reputation, this.config);
    if (!eligible.eligible) return;

    // 2. Detect market opportunities
    const opportunities = detectOpportunities(this.capacityCache);
    if (opportunities.length === 0) return;

    // 3. Take the top opportunity
    const best = opportunities[0]!;

    // Compute investment as 2× average market price (seed capital)
    const investmentMsats = Math.max(
      this.config.minInvestmentMsats,
      best.avgPriceMsats * 2,
    );

    // 4. Execute spawn
    const result = await executeSpawn(
      this.agentPubkey,
      this.agentSecretKey,
      best,
      investmentMsats,
      this.client,
      this.reputation,
      this.config,
    );

    this.spawnsExecuted++;
    console.log(
      `[SPAWNING] Spawned child ${result.childPubkey.slice(0, 12)}… ` +
        `for ${best.skillType} (investment=${investmentMsats}ms, ` +
        `share=${result.revenueShareBps}bps)`,
    );
  }

  stats(): { spawnsExecuted: number } {
    return { spawnsExecuted: this.spawnsExecuted };
  }
}
