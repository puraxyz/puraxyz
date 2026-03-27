/**
 * Pipeline executor — runs a DAG by dispatching NIP-90 job requests
 * and collecting results, cascading outputs through the dependency graph.
 *
 * Execution loop:
 *   1. Start with root nodes (no dependencies)
 *   2. For each ready node, route via BPE and publish NIP-90 job request
 *   3. Wait for kind-6xxx result events
 *   4. On completion, mark node done, check budget/deadline, cascade to children
 *   5. Retry failed nodes up to 3× with different agents via re-routing
 *   6. Publish kind-31905 state updates at each step change
 */

import type { Event } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools';
import type { DAG, DAGNode } from './dag.js';
import type { PipelineSpec, PipelineState } from '../events/kinds.js';
import type { NostrClient } from '../client/NostrClient.js';
import { routeJob } from '../routing/router.js';
import type { RoutingConfig } from '../routing/config.js';
import { ROUTING_DEFAULTS } from '../routing/config.js';
import type { EWMACapacityCache } from '../capacity/cache.js';
import type { QualityCache } from '../routing/router.js';
import { PipelineStatePublisher } from './state.js';

export interface ExecutorConfig {
  /** Nostr client for publishing/subscribing. */
  client: NostrClient;
  /** Private key bytes (Uint8Array) for signing events. */
  secretKey: Uint8Array;
  /** Relays for subscriptions. */
  relays: string[];
  /** Capacity cache for routing decisions. */
  capacityCache: EWMACapacityCache;
  /** Quality cache for routing decisions. */
  qualityCache: QualityCache;
  /** Routing configuration. */
  routingConfig?: RoutingConfig;
}

interface NodeExecution {
  node: DAGNode;
  attempts: number;
  assignedAgent?: string;
  priceMsats?: number;
}

/**
 * Execute a pipeline DAG to completion.
 *
 * Returns the final PipelineState. The executor publishes state events
 * after each status transition.
 */
export class PipelineExecutor {
  private config: ExecutorConfig;
  private routingConfig: RoutingConfig;
  private statePublisher: PipelineStatePublisher;

  constructor(config: ExecutorConfig) {
    this.config = config;
    this.routingConfig = config.routingConfig ?? ROUTING_DEFAULTS;
    this.statePublisher = new PipelineStatePublisher(
      config.client,
      config.secretKey,
    );
  }

  async execute(spec: PipelineSpec, dag: DAG): Promise<PipelineState> {
    const startTime = Math.floor(Date.now() / 1000);
    const completed = new Set<string>();
    const failed = new Set<string>();
    let spentMsats = 0;
    const maxRetries = this.routingConfig.pipelineMaxRetries;
    const nodeTimeoutMs = this.routingConfig.pipelineNodeTimeoutS * 1000;
    const executions = new Map<string, NodeExecution>();

    // Initialize execution tracking
    for (const node of dag.allNodes()) {
      executions.set(node.id, { node, attempts: 0 });
    }

    // Publish initial state
    let state = this.buildState(spec, dag, completed, failed, spentMsats, startTime);
    await this.statePublisher.publish(state);

    // Main loop: process ready nodes until all done or all failed
    while (completed.size + failed.size < dag.size()) {
      const readyNodes = dag.ready(completed).filter((n) => !failed.has(n.id));
      if (readyNodes.length === 0) {
        // Deadlocked — remaining nodes have unmet dependencies from failed nodes
        break;
      }

      // Check deadline
      if (spec.deadline > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (now > spec.deadline) {
          state = this.buildState(spec, dag, completed, failed, spentMsats, startTime);
          state.status = 'failed';
          await this.statePublisher.publish(state);
          return state;
        }
      }

      // Execute ready nodes in parallel
      const results = await Promise.allSettled(
        readyNodes.map((node) =>
          this.executeNode(node, spec, executions, maxRetries, nodeTimeoutMs),
        ),
      );

      for (let i = 0; i < results.length; i++) {
        const nodeId = readyNodes[i].id;
        const result = results[i];

        if (result.status === 'fulfilled' && result.value) {
          completed.add(nodeId);
          spentMsats += result.value.costMsats;

          // Store output for downstream nodes
          const dagNode = dag.get(nodeId);
          if (dagNode) dagNode.output = result.value.output;
        } else {
          failed.add(nodeId);
        }
      }

      // Check budget
      if (spentMsats > spec.budgetMsats && spec.budgetMsats > 0) {
        state = this.buildState(spec, dag, completed, failed, spentMsats, startTime);
        state.status = 'failed';
        await this.statePublisher.publish(state);
        return state;
      }

      // Publish progress
      state = this.buildState(spec, dag, completed, failed, spentMsats, startTime);
      state.status = 'running';
      await this.statePublisher.publish(state);
    }

    // Final state
    state = this.buildState(spec, dag, completed, failed, spentMsats, startTime);
    if (failed.size === 0) {
      state.status = 'completed';
    } else if (completed.size > 0) {
      state.status = 'partial';
    } else {
      state.status = 'failed';
    }
    await this.statePublisher.publish(state);
    return state;
  }

  private async executeNode(
    node: DAGNode,
    spec: PipelineSpec,
    executions: Map<string, NodeExecution>,
    maxRetries: number,
    timeoutMs: number,
  ): Promise<{ output: unknown; costMsats: number } | null> {
    const exec = executions.get(node.id)!;

    // NIP-90: job request kind = 5000 + (jobKind offset)
    // Job result kind = jobKind + 1000 (e.g., 5100 → 6100)
    const jobRequestKind = node.jobKind;
    const jobResultKind = jobRequestKind + 1000;

    // Map jobKind to a skill type string for routing
    const skillType = `nip90-${jobRequestKind}`;

    while (exec.attempts < maxRetries) {
      exec.attempts++;

      // Route via BPE
      const route = routeJob(
        skillType,
        this.config.capacityCache,
        this.config.qualityCache,
        this.routingConfig,
      );

      if (!route) return null; // no agents available

      exec.assignedAgent = route.agent.pubkey;
      exec.priceMsats = route.priceMsats;

      // Build NIP-90 job request event
      const jobRequestTags: string[][] = [
        ['p', route.agent.pubkey],
        ['bid', String(route.priceMsats)],
      ];

      // Attach upstream outputs as inputs
      for (const depId of node.dependsOn) {
        const depOutput = executions.get(depId)?.node.output;
        if (depOutput !== undefined) {
          jobRequestTags.push(['i', JSON.stringify(depOutput), 'job']);
        }
      }

      // Add node-specific params
      for (const [key, value] of Object.entries(node.params)) {
        jobRequestTags.push(['param', key, String(value)]);
      }

      const unsigned = {
        kind: jobRequestKind,
        pubkey: '', // set by finalizeEvent
        created_at: Math.floor(Date.now() / 1000),
        tags: jobRequestTags,
        content: '',
      };

      const signed = finalizeEvent(unsigned, this.config.secretKey);
      await this.config.client.publish(signed);

      // Wait for result
      const result = await this.waitForResult(
        signed.id,
        jobResultKind,
        route.agent.pubkey,
        timeoutMs,
      );

      if (result) {
        return { output: result.content, costMsats: route.priceMsats };
      }

      // Retry with a different agent (BPE re-routes naturally due to exploration)
    }

    return null;
  }

  private waitForResult(
    jobRequestId: string,
    resultKind: number,
    agentPubkey: string,
    timeoutMs: number,
  ): Promise<Event | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(null);
      }, timeoutMs);

      const filter = {
        kinds: [resultKind],
        authors: [agentPubkey],
        '#e': [jobRequestId],
      };

      const sub = this.config.client.subscribe(
        [filter],
        (event: Event) => {
          clearTimeout(timer);
          sub.close();
          resolve(event);
        },
      );
    });
  }

  private buildState(
    spec: PipelineSpec,
    dag: DAG,
    completed: Set<string>,
    failed: Set<string>,
    spentMsats: number,
    startTime: number,
  ): PipelineState {
    const allIds = dag.allNodes().map((n) => n.id);
    const pending = allIds.filter((id) => !completed.has(id) && !failed.has(id));
    return {
      pipelineEventId: spec.pipelineId,
      status: 'pending',
      completedNodes: Array.from(completed),
      pendingNodes: pending,
      failedNodes: Array.from(failed),
      spentMsats,
      elapsedSeconds: Math.floor(Date.now() / 1000) - startTime,
    };
  }
}
