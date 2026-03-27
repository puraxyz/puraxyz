/**
 * DAG — directed acyclic graph for pipeline orchestration.
 *
 * Each node is a job step. Edges encode data dependencies.
 * Topological sort determines execution order; cycle detection
 * prevents invalid pipelines.
 */

import type { PipelineNode } from '../events/kinds.js';

export interface DAGNode {
  id: string;
  jobKind: number;
  params: Record<string, unknown>;
  dependsOn: Set<string>;
  dependedOnBy: Set<string>;
  /** Output from execution (set after job completes). */
  output?: unknown;
}

/**
 * DAG structure with topological sort, cycle detection,
 * dependency resolution, and ready-node detection.
 */
export class DAG {
  private nodes = new Map<string, DAGNode>();

  constructor(pipelineNodes: PipelineNode[]) {
    // First pass: create nodes
    for (const n of pipelineNodes) {
      this.nodes.set(n.id, {
        id: n.id,
        jobKind: n.jobKind,
        params: n.params,
        dependsOn: new Set(n.dependsOn.filter((d) => d !== '')),
        dependedOnBy: new Set(),
        output: undefined,
      });
    }

    // Second pass: back-edges
    for (const node of this.nodes.values()) {
      for (const dep of node.dependsOn) {
        const parent = this.nodes.get(dep);
        if (!parent) {
          throw new Error(`Node "${node.id}" depends on unknown node "${dep}"`);
        }
        parent.dependedOnBy.add(node.id);
      }
    }

    if (this.hasCycle()) {
      throw new Error('Pipeline contains a cycle');
    }
  }

  get(id: string): DAGNode | undefined {
    return this.nodes.get(id);
  }

  allNodes(): DAGNode[] {
    return Array.from(this.nodes.values());
  }

  /** Root nodes — no dependencies. */
  roots(): DAGNode[] {
    return this.allNodes().filter((n) => n.dependsOn.size === 0);
  }

  /** Nodes whose dependencies are all satisfied by completedIds. */
  ready(completedIds: Set<string>): DAGNode[] {
    return this.allNodes().filter((n) => {
      if (completedIds.has(n.id)) return false;
      for (const dep of n.dependsOn) {
        if (!completedIds.has(dep)) return false;
      }
      return true;
    });
  }

  /** Kahn's algorithm: returns ordered node IDs, or throws on cycle. */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes.values()) {
      inDegree.set(node.id, node.dependsOn.size);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);
      const node = this.nodes.get(current)!;
      for (const child of node.dependedOnBy) {
        const newDeg = inDegree.get(child)! - 1;
        inDegree.set(child, newDeg);
        if (newDeg === 0) queue.push(child);
      }
    }

    if (order.length !== this.nodes.size) {
      throw new Error('Pipeline contains a cycle');
    }
    return order;
  }

  /** True if the graph contains a cycle. Uses DFS coloring. */
  hasCycle(): boolean {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const id of this.nodes.keys()) color.set(id, WHITE);

    const dfs = (id: string): boolean => {
      color.set(id, GRAY);
      const node = this.nodes.get(id)!;
      for (const child of node.dependedOnBy) {
        const c = color.get(child)!;
        if (c === GRAY) return true; // back edge → cycle
        if (c === WHITE && dfs(child)) return true;
      }
      color.set(id, BLACK);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if (color.get(id) === WHITE && dfs(id)) return true;
    }
    return false;
  }

  /** Number of nodes. */
  size(): number {
    return this.nodes.size;
  }
}
