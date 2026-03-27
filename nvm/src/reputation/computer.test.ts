import { describe, it, expect } from 'vitest';
import { ReputationComputer } from './computer.js';
import { NVM_KINDS } from '../events/kinds.js';

function makeReceipt(agentPubkey: string, qualityBps: number, priceMsats: number, skillType = 'nip90-5100') {
  return {
    id: Math.random().toString(36).slice(2),
    kind: NVM_KINDS.COMPLETION_RECEIPT,
    pubkey: agentPubkey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['d', skillType],
      ['quality', String(qualityBps)],
      ['latency_ms', '200'],
      ['p', 'customer123'],
    ],
    sig: '',
  };
}

describe('ReputationComputer', () => {
  it('ignores non-receipt events', () => {
    const rc = new ReputationComputer();
    rc.ingest({ id: 'x', kind: 31900, pubkey: 'abc', created_at: 0, content: '{}', tags: [], sig: '' });
    expect(rc.trackedAgents().length).toBe(0);
  });

  it('tracks a single agent after one receipt', () => {
    const rc = new ReputationComputer();
    rc.ingest(makeReceipt('agent1', 8000, 500));
    const profile = rc.computeProfile('agent1');
    expect(profile).toBeTruthy();
    expect(profile!.totalCompletions).toBe(1);
    expect(profile!.avgQualityBps).toBe(8000);
  });

  it('averages quality across multiple receipts', () => {
    const rc = new ReputationComputer();
    rc.ingest(makeReceipt('agent2', 6000, 100));
    rc.ingest(makeReceipt('agent2', 10000, 200));
    const profile = rc.computeProfile('agent2');
    expect(profile!.totalCompletions).toBe(2);
    expect(profile!.avgQualityBps).toBe(8000);
  });

  it('tracks multiple agents independently', () => {
    const rc = new ReputationComputer();
    rc.ingest(makeReceipt('a', 5000, 100));
    rc.ingest(makeReceipt('b', 9000, 200));
    expect(rc.trackedAgents().length).toBe(2);
    expect(rc.computeProfile('a')!.avgQualityBps).toBe(5000);
    expect(rc.computeProfile('b')!.avgQualityBps).toBe(9000);
  });

  it('returns null for unknown agent', () => {
    const rc = new ReputationComputer();
    expect(rc.computeProfile('unknown')).toBeNull();
  });

  it('collects skill types', () => {
    const rc = new ReputationComputer();
    rc.ingest(makeReceipt('agent3', 7000, 100, 'translation'));
    rc.ingest(makeReceipt('agent3', 8000, 100, 'summarization'));
    const profile = rc.computeProfile('agent3');
    expect(profile!.skillTypes).toContain('translation');
    expect(profile!.skillTypes).toContain('summarization');
  });
});
