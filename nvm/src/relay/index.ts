/**
 * Agent Relay — a specialized Nostr relay for the agent economy.
 *
 * Combines capacity indexing, BPE routing, and quality scoring
 * into a single process that earns routing fees for every job
 * it successfully assigns.
 *
 * Architecture:
 *   1. Subscribe to kind-31900 (capacity attestations) → CapacityIndex
 *   2. Subscribe to kind-31901 (completion receipts) → QualityComputerService
 *   3. Subscribe to NIP-90 job requests (kind 5xxx) → RoutingService
 *   4. Publish kind-31903 assignments, collect routing fee via NIP-57 zap
 *
 * This is an application-layer relay — it connects to standard Nostr
 * relays as a client, adding routing intelligence on top.
 */

import { NVM_KINDS } from '../events/kinds.js';
import { NostrClient } from '../client/NostrClient.js';
import { loadKeypair } from '../client/keys.js';
import type { RoutingConfig } from '../routing/config.js';
import { ROUTING_DEFAULTS } from '../routing/config.js';
import { CapacityIndex } from './capacityIndex.js';
import { QualityComputerService } from './qualityComputer.js';
import { RoutingService } from './routingService.js';
import { ReputationPublisher } from '../reputation/publisher.js';
import { CreditGraph } from '../credit/graph.js';
import type { Event, Filter } from 'nostr-tools';

export interface AgentRelayConfig {
  relays: string[];
  /** Hex private key. Auto-generated if omitted. */
  privateKeyHex?: string;
  routingConfig?: RoutingConfig;
  /** NIP-90 job kinds to route. Default: [5100]. */
  jobKinds?: number[];
  /** Interval to prune stale capacity entries (ms). Default: 300000. */
  pruneIntervalMs?: number;
}

export class AgentRelay {
  private client: NostrClient;
  private capacityIndex: CapacityIndex;
  private qualityService: QualityComputerService;
  private routingService: RoutingService;
  private reputationPublisher: ReputationPublisher;
  private creditGraph: CreditGraph;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private subs: Array<{ close: () => void }> = [];

  constructor(config: AgentRelayConfig) {
    const { privateKey: secretKey } = loadKeypair(config.privateKeyHex ?? '');
    const routingConfig = config.routingConfig ?? ROUTING_DEFAULTS;

    this.client = new NostrClient({
      relays: config.relays,
      privateKey: config.privateKeyHex,
    });

    this.capacityIndex = new CapacityIndex(routingConfig.ewmaAlpha);
    this.qualityService = new QualityComputerService(
      this.client,
      secretKey,
      routingConfig,
    );
    this.reputationPublisher = new ReputationPublisher({
      client: this.client,
      secretKey,
    });
    this.creditGraph = new CreditGraph();

    this.routingService = new RoutingService({
      client: this.client,
      secretKey,
      capacityIndex: this.capacityIndex,
      qualityService: this.qualityService,
      creditGraph: this.creditGraph,
      routingConfig,
      jobKinds: config.jobKinds,
    });

    // Prune stale capacity entries periodically
    const pruneMs = config.pruneIntervalMs ?? 300_000;
    this.pruneTimer = setInterval(() => {
      const pruned = this.capacityIndex.pruneStale();
      if (pruned > 0) {
        console.log(`[RELAY] Pruned ${pruned} stale capacity entries`);
      }
    }, pruneMs);
  }

  /** Start all relay services. */
  async start(): Promise<void> {
    // 1. Subscribe to capacity attestations
    const capFilter: Filter = {
      kinds: [NVM_KINDS.CAPACITY_ATTESTATION],
    };
    const capSub = this.client.subscribe(
      [capFilter],
      (event: Event) => { this.capacityIndex.ingest(event); },
    );
    this.subs.push(capSub);

    // 2. Subscribe to completion receipts
    const receiptFilter: Filter = {
      kinds: [NVM_KINDS.COMPLETION_RECEIPT],
    };
    const receiptSub = this.client.subscribe(
      [receiptFilter],
      (event: Event) => {
        this.qualityService.ingest(event);
        this.reputationPublisher.ingest(event);
      },
    );
    this.subs.push(receiptSub);

    // 3. Subscribe to credit lines
    const creditFilter: Filter = {
      kinds: [NVM_KINDS.CREDIT_LINE],
    };
    const creditSub = this.client.subscribe(
      [creditFilter],
      (event: Event) => { this.creditGraph.ingest(event); },
    );
    this.subs.push(creditSub);

    // 4. Start quality computer (periodic recompute & publish)
    this.qualityService.start();

    // 5. Start reputation publisher (periodic profile publish)
    this.reputationPublisher.start();

    // 6. Start routing service (listens for job requests)
    this.routingService.start();

    console.log('[RELAY] Agent Relay started');
    console.log(`[RELAY] Capacity: ${JSON.stringify(this.capacityIndex.stats())}`);
  }

  /** Stop all services and close connections. */
  stop(): void {
    for (const sub of this.subs) sub.close();
    this.subs = [];
    this.qualityService.stop();
    this.reputationPublisher.stop();
    this.routingService.stop();
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    this.client.close();
    console.log('[RELAY] Agent Relay stopped');
  }

  /** Aggregate stats. */
  stats() {
    return {
      capacity: this.capacityIndex.stats(),
      routing: this.routingService.stats(),
    };
  }
}
