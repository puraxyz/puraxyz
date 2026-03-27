import { describe, it, expect } from 'vitest';
import { CreditGraph } from './graph.js';
import { NVM_KINDS } from '../events/kinds.js';

function makeCreditEvent(from: string, to: string, limitMsats: number, ttlSeconds = 86400) {
  return {
    id: Math.random().toString(36).slice(2),
    kind: NVM_KINDS.CREDIT_LINE,
    pubkey: from,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['d', to],
      ['amount_msats', String(limitMsats)],
      ['expires', String(Math.floor(Date.now() / 1000) + ttlSeconds)],
      ['interest_rate_bps', '500'],
      ['collateral', '7000'],
    ],
    sig: '',
  };
}

describe('CreditGraph', () => {
  it('starts empty', () => {
    const g = new CreditGraph();
    expect(g.directCredit('a', 'b')).toBe(0);
  });

  it('ingests a credit line and reports direct credit', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 10_000));
    expect(g.directCredit('alice', 'bob')).toBe(10_000);
    expect(g.directCredit('bob', 'alice')).toBe(0);
  });

  it('reduces available credit after use', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 10_000));
    g.useCredit('alice', 'bob', 3000);
    expect(g.directCredit('alice', 'bob')).toBe(7000);
  });

  it('returns false on overdraft', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 5000));
    expect(g.useCredit('alice', 'bob', 6000)).toBe(false);
  });

  it('finds transitive credit via intermediary', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 8000));
    g.ingest(makeCreditEvent('bob', 'carol', 5000));
    const credit = g.availableCredit('alice', 'carol');
    // Transitive path: alice→bob→carol, bottleneck = min(8000, 5000) = 5000
    expect(credit).toBe(5000);
  });

  it('reports 0 for unconnected nodes', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 8000));
    expect(g.availableCredit('alice', 'dave')).toBe(0);
  });

  it('ignores non-credit events', () => {
    const g = new CreditGraph();
    g.ingest({ id: 'x', kind: 31900, pubkey: 'a', created_at: 0, content: '{}', tags: [], sig: '' });
    expect(g.directCredit('a', 'b')).toBe(0);
  });

  it('settle marks line as settled (no longer active)', () => {
    const g = new CreditGraph();
    g.ingest(makeCreditEvent('alice', 'bob', 10_000));
    g.useCredit('alice', 'bob', 4000);
    expect(g.directCredit('alice', 'bob')).toBe(6000);
    g.settle('alice', 'bob');
    // After settlement, the line is no longer active
    expect(g.directCredit('alice', 'bob')).toBe(0);
  });
});
