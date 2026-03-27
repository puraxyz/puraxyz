/**
 * Routing service — listens for NIP-90 job requests and runs
 * BPE routing to assign them to agents.
 *
 * This is the relay's core value: it watches for incoming job
 * requests (kind 5xxx), runs the routing algorithm, publishes
 * a kind-31903 assignment event, and collects a routing fee.
 */

import type { Event, Filter } from 'nostr-tools';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { routeJob } from '../routing/router.js';
import type { RoutingConfig } from '../routing/config.js';
import { ROUTING_DEFAULTS } from '../routing/config.js';
import { buildJobAssignment } from '../events/builders.js';
import { dispatchWithCredit } from '../credit/dispatch.js';
import type { NostrClient } from '../client/NostrClient.js';
import type { CapacityIndex } from './capacityIndex.js';
import type { QualityComputerService } from './qualityComputer.js';
import type { CreditGraph } from '../credit/graph.js';

export interface RoutingServiceConfig {
  client: NostrClient;
  secretKey: Uint8Array;
  capacityIndex: CapacityIndex;
  qualityService: QualityComputerService;
  creditGraph?: CreditGraph;
  routingConfig?: RoutingConfig;
  /** NIP-90 job kinds to listen for. Default: [5100] (text generation). */
  jobKinds?: number[];
}

export class RoutingService {
  private config: RoutingServiceConfig;
  private routingConfig: RoutingConfig;
  private jobsRouted = 0;
  private sub: { close: () => void } | null = null;

  constructor(config: RoutingServiceConfig) {
    this.config = config;
    this.routingConfig = config.routingConfig ?? ROUTING_DEFAULTS;
  }

  /** Start listening for job requests. */
  start(): void {
    const jobKinds = this.config.jobKinds ?? [5100];

    const filter: Filter = {
      kinds: jobKinds,
      since: Math.floor(Date.now() / 1000),
    };

    this.sub = this.config.client.subscribe(
      [filter],
      (event: Event) => {
        this.handleJobRequest(event).catch((err) =>
          console.error('[ROUTING] Error handling job request:', err),
        );
      },
    );
  }

  stop(): void {
    this.sub?.close();
    this.sub = null;
  }

  private async handleJobRequest(event: Event): Promise<void> {
    // Map job kind to skill type (e.g., 5100 → "nip90-5100")
    const skillType = `nip90-${event.kind}`;

    const result = routeJob(
      skillType,
      this.config.capacityIndex.getCache(),
      this.config.qualityService.getComputer(),
      this.routingConfig,
    );

    if (!result) {
      console.log(`[ROUTING] No agents for ${skillType} — dropping job ${event.id.slice(0, 8)}…`);
      return;
    }

    // Publish assignment
    const orchestratorPubkey = getPublicKey(this.config.secretKey);

    // Check credit availability before dispatching
    let paymentMode: 'credit' | 'atomic' = 'atomic';
    if (this.config.creditGraph) {
      const dispatch = dispatchWithCredit(
        orchestratorPubkey,
        result.agent.pubkey,
        result.priceMsats,
        this.config.creditGraph,
      );
      paymentMode = dispatch.mode;
    }

    const unsigned = buildJobAssignment('', {
      jobRequestEventId: event.id,
      assignedAgentPubkey: result.agent.pubkey,
      customerPubkey: event.pubkey,
      routingScore: result.routingScore,
      explored: result.explored,
      priceMsats: result.priceMsats,
      alternatives: result.alternatives,
    });

    const signed = finalizeEvent(unsigned, this.config.secretKey);
    await this.config.client.publish(signed);

    this.jobsRouted++;
    const tag = result.explored ? 'EXPLORE' : 'EXPLOIT';
    console.log(
      `[ROUTING] ${tag} job ${event.id.slice(0, 8)}… → ${result.agent.pubkey.slice(0, 12)}… ` +
        `(score=${result.routingScore.toFixed(2)}, price=${result.priceMsats}ms, ` +
        `pay=${paymentMode}, ${result.alternatives} candidates)`,
    );
  }

  /** Stats for monitoring. */
  stats(): { jobsRouted: number } {
    return { jobsRouted: this.jobsRouted };
  }
}
