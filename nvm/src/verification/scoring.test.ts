import { describe, it, expect } from 'vitest';
import {
  normalizeLatency,
  normalizeErrorRate,
  compositeScore,
  SmoothedScores,
} from './scoring.js';

describe('normalizeLatency', () => {
  it('returns 1 for zero latency', () => {
    expect(normalizeLatency(0)).toBe(1);
  });

  it('returns 0 for latency at max', () => {
    expect(normalizeLatency(30000)).toBe(0);
  });

  it('returns 0 for latency above max', () => {
    expect(normalizeLatency(60000)).toBe(0);
  });

  it('returns 0.5 for latency at half max', () => {
    expect(normalizeLatency(15000)).toBeCloseTo(0.5, 5);
  });

  it('respects custom max', () => {
    expect(normalizeLatency(5000, 10000)).toBeCloseTo(0.5, 5);
  });
});

describe('normalizeErrorRate', () => {
  it('returns 1 for zero errors', () => {
    expect(normalizeErrorRate(0)).toBe(1);
  });

  it('returns 0 for 100% error rate', () => {
    expect(normalizeErrorRate(10000)).toBe(0);
  });

  it('returns 0.9 for 10% error rate', () => {
    expect(normalizeErrorRate(1000)).toBeCloseTo(0.9, 5);
  });
});

describe('compositeScore', () => {
  it('returns weighted average', () => {
    const score = compositeScore(1.0, 0.5, 0.8, 0.6, [0.4, 0.2, 0.2, 0.2]);
    // 0.4*1.0 + 0.2*0.5 + 0.2*0.8 + 0.2*0.6 = 0.4 + 0.1 + 0.16 + 0.12 = 0.78
    expect(score).toBeCloseTo(0.78, 5);
  });

  it('returns 1.0 for all-perfect scores', () => {
    expect(compositeScore(1, 1, 1, 1)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for all-zero scores', () => {
    expect(compositeScore(0, 0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('completion rate has most influence at default weights', () => {
    const highCompletion = compositeScore(1.0, 0.5, 0.5, 0.5);
    const highLatency = compositeScore(0.5, 1.0, 0.5, 0.5);
    expect(highCompletion).toBeGreaterThan(highLatency);
  });
});

describe('SmoothedScores', () => {
  it('starts with default 0.5 for composite', () => {
    const s = new SmoothedScores();
    expect(s.composite()).toBeCloseTo(0.5, 5);
  });

  it('updates toward new values', () => {
    const s = new SmoothedScores(0.3);
    s.update(1.0, 1.0, 1.0, 1.0);
    const first = s.composite();
    // First observation: all components = 1.0
    expect(first).toBeCloseTo(1.0, 5);

    s.update(0.0, 0.0, 0.0, 0.0);
    const second = s.composite();
    // EWMA with alpha=0.3: 0.3*0 + 0.7*1.0 = 0.7 for each component
    expect(second).toBeCloseTo(0.7, 5);
  });

  it('converges after many identical updates', () => {
    const s = new SmoothedScores(0.3);
    for (let i = 0; i < 50; i++) {
      s.update(0.8, 0.6, 0.9, 0.7);
    }
    // weights [0.4, 0.2, 0.2, 0.2]: 0.4*0.8 + 0.2*0.6 + 0.2*0.9 + 0.2*0.7 = 0.76
    expect(s.composite()).toBeCloseTo(0.76, 2);
  });
});
