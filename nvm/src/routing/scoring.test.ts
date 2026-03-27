import { describe, it, expect } from 'vitest';
import {
  computeWeight,
  coefficientOfVariation,
  adaptiveExplorationRate,
} from './scoring.js';
import type { AgentCapacity } from '../capacity/cache.js';

function makeAgent(overrides: Partial<AgentCapacity> = {}): AgentCapacity {
  return {
    pubkey: 'deadbeef'.repeat(8),
    skillType: 'nip90-5100',
    rawCapacity: 10,
    smoothedCapacity: 10,
    latencyMs: 500,
    errorRateBps: 100,
    priceMsats: 1000,
    maxConcurrent: 5,
    lastSeen: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe('computeWeight', () => {
  it('produces higher weight for higher capacity', () => {
    const low = computeWeight(makeAgent({ smoothedCapacity: 5 }), 1.0, 10000);
    const high = computeWeight(makeAgent({ smoothedCapacity: 20 }), 1.0, 10000);
    expect(high).toBeGreaterThan(low);
  });

  it('produces higher weight for higher quality', () => {
    const agent = makeAgent();
    const lowQ = computeWeight(agent, 0.3, 10000);
    const highQ = computeWeight(agent, 0.9, 10000);
    expect(highQ).toBeGreaterThan(lowQ);
  });

  it('produces higher weight for lower price', () => {
    const cheap = computeWeight(makeAgent({ priceMsats: 100 }), 1.0, 10000);
    const expensive = computeWeight(makeAgent({ priceMsats: 50000 }), 1.0, 10000);
    expect(cheap).toBeGreaterThan(expensive);
  });

  it('returns zero when capacity is zero', () => {
    const w = computeWeight(makeAgent({ smoothedCapacity: 0 }), 1.0, 10000);
    expect(w).toBe(0);
  });
});

describe('coefficientOfVariation', () => {
  it('returns 0 for single value', () => {
    expect(coefficientOfVariation([5])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(coefficientOfVariation([3, 3, 3, 3])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(coefficientOfVariation([])).toBe(0);
  });

  it('returns correct CV for known distribution', () => {
    // values: [2, 4, 4, 4, 5, 5, 7, 9]
    // mean = 5, stddev ≈ 2.0
    const cv = coefficientOfVariation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(cv).toBeGreaterThan(0.3);
    expect(cv).toBeLessThan(0.5);
  });

  it('handles all-zero values', () => {
    expect(coefficientOfVariation([0, 0, 0])).toBe(0);
  });
});

describe('adaptiveExplorationRate', () => {
  it('returns base rate when volatility is low', () => {
    const scores = [0.8, 0.81, 0.79, 0.8, 0.82]; // low CV
    const rate = adaptiveExplorationRate(scores, 0.05, 0.20, 0.30);
    expect(rate).toBe(0.05);
  });

  it('doubles rate when CV exceeds threshold', () => {
    const scores = [0.2, 0.9, 0.1, 0.95, 0.3]; // high CV
    const rate = adaptiveExplorationRate(scores, 0.05, 0.20, 0.30);
    expect(rate).toBe(0.10);
  });

  it('caps at max rate', () => {
    const scores = [0.1, 0.9, 0.1, 0.9];
    const rate = adaptiveExplorationRate(scores, 0.15, 0.20, 0.10);
    expect(rate).toBe(0.20);
  });
});
