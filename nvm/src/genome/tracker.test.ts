import { describe, it, expect } from 'vitest';
import { GenomeTracker } from './tracker.js';
import { buildPhylogenyTree, phylogenyStats } from './phylogeny.js';
import { NVM_KINDS } from '../events/kinds.js';

function makeGenomeEvent(pubkey: string, parentPubkey: string | null, generation: number, fitness: number) {
  const tags: string[][] = [
    ['d', 'genome'],
    ['generation', String(generation)],
    ['mutation_description', `gen-${generation} agent`],
    ['fitness', String(fitness)],
    ['skill_config_hash', 'abc123'],
  ];
  if (parentPubkey) tags.push(['parent', parentPubkey]);
  return {
    id: Math.random().toString(36).slice(2),
    kind: NVM_KINDS.AGENT_GENOME,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags,
    sig: '',
  };
}

describe('GenomeTracker', () => {
  it('starts empty', () => {
    const t = new GenomeTracker();
    expect(t.size()).toBe(0);
  });

  it('ingests a genome event', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('agent1', null, 0, 100));
    expect(t.size()).toBe(1);
    const g = t.get('agent1');
    expect(g!.generation).toBe(0);
    expect(g!.fitness).toBe(100);
  });

  it('tracks parent-child relationships', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('parent', null, 0, 200));
    t.ingest(makeGenomeEvent('child1', 'parent', 1, 50));
    t.ingest(makeGenomeEvent('child2', 'parent', 1, 80));

    const children = t.childrenOf('parent');
    expect(children.length).toBe(2);
  });

  it('builds ancestry chain', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('root', null, 0, 300));
    t.ingest(makeGenomeEvent('mid', 'root', 1, 200));
    t.ingest(makeGenomeEvent('leaf', 'mid', 2, 100));

    const chain = t.ancestry('leaf');
    expect(chain.length).toBe(3);
    expect(chain[0]!.agentPubkey).toBe('leaf');
    expect(chain[2]!.agentPubkey).toBe('root');
  });

  it('returns top agents by fitness', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('a', null, 0, 50));
    t.ingest(makeGenomeEvent('b', null, 0, 300));
    t.ingest(makeGenomeEvent('c', null, 0, 150));

    const top = t.topByFitness(2);
    expect(top[0]!.agentPubkey).toBe('b');
    expect(top[1]!.agentPubkey).toBe('c');
    expect(top.length).toBe(2);
  });
});

describe('phylogeny', () => {
  it('builds a tree from genomes', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('root', null, 0, 200));
    t.ingest(makeGenomeEvent('child', 'root', 1, 100));
    t.ingest(makeGenomeEvent('grandchild', 'child', 2, 50));

    const roots = buildPhylogenyTree(t);
    expect(roots.length).toBe(1);
    expect(roots[0]!.pubkey).toBe('root');
    expect(roots[0]!.children.length).toBe(1);
    expect(roots[0]!.children[0]!.children.length).toBe(1);
  });

  it('computes stats', () => {
    const t = new GenomeTracker();
    t.ingest(makeGenomeEvent('a', null, 0, 100));
    t.ingest(makeGenomeEvent('b', 'a', 1, 200));
    t.ingest(makeGenomeEvent('c', 'a', 1, 300));

    const roots = buildPhylogenyTree(t);
    const stats = phylogenyStats(roots);
    expect(stats.totalAgents).toBe(3);
    expect(stats.maxGeneration).toBe(1);
    expect(stats.avgFitness).toBe(200);
    expect(stats.maxFitness).toBe(300);
  });
});
