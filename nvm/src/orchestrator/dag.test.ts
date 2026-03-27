import { describe, it, expect } from 'vitest';
import { DAG } from './dag.js';
import type { PipelineNode } from '../events/kinds.js';

function nodes(...defs: Array<[string, number, string[]]>): PipelineNode[] {
  return defs.map(([id, jobKind, dependsOn]) => ({
    id,
    jobKind,
    dependsOn,
    params: {},
  }));
}

describe('DAG', () => {
  it('builds a linear pipeline', () => {
    const dag = new DAG(nodes(
      ['a', 5100, []],
      ['b', 5100, ['a']],
      ['c', 5100, ['b']],
    ));
    expect(dag.size()).toBe(3);
    expect(dag.roots().map((n) => n.id)).toEqual(['a']);
  });

  it('detects cycles', () => {
    expect(() =>
      new DAG(nodes(
        ['a', 5100, ['c']],
        ['b', 5100, ['a']],
        ['c', 5100, ['b']],
      )),
    ).toThrow('cycle');
  });

  it('topological sort returns valid order', () => {
    const dag = new DAG(nodes(
      ['a', 5100, []],
      ['b', 5100, ['a']],
      ['c', 5100, ['a']],
      ['d', 5100, ['b', 'c']],
    ));
    const order = dag.topologicalSort();
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('roots() returns nodes with no dependencies', () => {
    const dag = new DAG(nodes(
      ['a', 5100, []],
      ['b', 5001, []],
      ['c', 5100, ['a', 'b']],
    ));
    const roots = dag.roots().map((n) => n.id).sort();
    expect(roots).toEqual(['a', 'b']);
  });

  it('ready() returns nodes whose deps are all complete', () => {
    const dag = new DAG(nodes(
      ['a', 5100, []],
      ['b', 5100, []],
      ['c', 5100, ['a']],
      ['d', 5100, ['a', 'b']],
    ));

    // Initially only roots are ready
    const ready0 = dag.ready(new Set()).map((n) => n.id).sort();
    expect(ready0).toEqual(['a', 'b']);

    // After completing 'a', 'c' becomes ready but not 'd' (needs 'b')
    const ready1 = dag.ready(new Set(['a'])).map((n) => n.id).sort();
    expect(ready1).toEqual(['b', 'c']);

    // After completing both 'a' and 'b', 'd' becomes ready
    const ready2 = dag.ready(new Set(['a', 'b'])).map((n) => n.id).sort();
    expect(ready2).toEqual(['c', 'd']);
  });

  it('throws on unknown dependency', () => {
    expect(() =>
      new DAG(nodes(['a', 5100, ['nonexistent']])),
    ).toThrow('unknown node');
  });

  it('handles single-node pipeline', () => {
    const dag = new DAG(nodes(['only', 5100, []]));
    expect(dag.size()).toBe(1);
    expect(dag.topologicalSort()).toEqual(['only']);
    expect(dag.roots().length).toBe(1);
  });

  it('handles diamond dependency', () => {
    // a → b, a → c, b → d, c → d
    const dag = new DAG(nodes(
      ['a', 5100, []],
      ['b', 5100, ['a']],
      ['c', 5100, ['a']],
      ['d', 5100, ['b', 'c']],
    ));
    expect(dag.hasCycle()).toBe(false);
    const order = dag.topologicalSort();
    expect(order.length).toBe(4);
    expect(order[0]).toBe('a');
    expect(order[3]).toBe('d');
  });
});
