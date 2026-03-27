/**
 * Phylogeny — builds a tree structure from genome data for
 * visualization and analysis. The tree shows parent→child
 * spawning relationships with fitness on each node.
 */

import type { GenomeTracker, TrackedGenome } from './tracker.js';

export interface PhylogenyNode {
  pubkey: string;
  generation: number;
  fitness: number;
  skillConfigHash: string;
  mutationDescription: string;
  children: PhylogenyNode[];
}

/**
 * Build the full phylogeny tree from tracked genomes.
 * Returns an array of root nodes (generation-0 agents).
 */
export function buildPhylogenyTree(tracker: GenomeTracker): PhylogenyNode[] {
  const all = tracker.all();
  const nodeMap = new Map<string, PhylogenyNode>();

  // Create all nodes first
  for (const genome of all) {
    nodeMap.set(genome.agentPubkey, {
      pubkey: genome.agentPubkey,
      generation: genome.generation,
      fitness: genome.fitness,
      skillConfigHash: genome.skillConfigHash,
      mutationDescription: genome.mutationDescription,
      children: [],
    });
  }

  // Link parents to children
  const roots: PhylogenyNode[] = [];
  for (const genome of all) {
    const node = nodeMap.get(genome.agentPubkey)!;
    if (genome.parentPubkey && nodeMap.has(genome.parentPubkey)) {
      nodeMap.get(genome.parentPubkey)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Compute stats about the phylogeny tree. */
export function phylogenyStats(roots: PhylogenyNode[]): {
  totalAgents: number;
  maxGeneration: number;
  avgFitness: number;
  maxFitness: number;
} {
  let total = 0;
  let maxGen = 0;
  let sumFitness = 0;
  let maxFitness = -Infinity;

  function walk(node: PhylogenyNode) {
    total++;
    if (node.generation > maxGen) maxGen = node.generation;
    sumFitness += node.fitness;
    if (node.fitness > maxFitness) maxFitness = node.fitness;
    for (const child of node.children) walk(child);
  }

  for (const root of roots) walk(root);

  return {
    totalAgents: total,
    maxGeneration: maxGen,
    avgFitness: total > 0 ? sumFitness / total : 0,
    maxFitness: total > 0 ? maxFitness : 0,
  };
}
