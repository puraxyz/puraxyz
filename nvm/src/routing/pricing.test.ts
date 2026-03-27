import { describe, it, expect } from 'vitest';
import { computeDynamicPrice, adjustBaseFee } from './pricing.js';

describe('computeDynamicPrice', () => {
  it('returns base fee when utilization is zero', () => {
    const price = computeDynamicPrice({
      queueDepth: 0,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    expect(price).toBe(1000);
  });

  it('increases price with congestion', () => {
    const low = computeDynamicPrice({
      queueDepth: 2,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    const high = computeDynamicPrice({
      queueDepth: 8,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    expect(high).toBeGreaterThan(low);
  });

  it('caps utilization at 0.99 to avoid division by zero', () => {
    const price = computeDynamicPrice({
      queueDepth: 100,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    // u capped at 0.99 → congestion = 1 + 1.0 * 0.99 / 0.01 = 100
    expect(price).toBe(100000);
  });

  it('returns base fee when capacity is zero', () => {
    const price = computeDynamicPrice({
      queueDepth: 5,
      smoothedCapacity: 0,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    expect(price).toBe(1000);
  });

  it('respects gamma parameter', () => {
    const lowGamma = computeDynamicPrice({
      queueDepth: 5,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 0.5,
    });
    const highGamma = computeDynamicPrice({
      queueDepth: 5,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 2.0,
    });
    expect(highGamma).toBeGreaterThan(lowGamma);
  });

  it('at 50% utilization with gamma=1.0, price doubles', () => {
    const price = computeDynamicPrice({
      queueDepth: 5,
      smoothedCapacity: 10,
      baseFeeMsats: 1000,
      gamma: 1.0,
    });
    // u=0.5, congestion = 1 + 1.0 * 0.5/0.5 = 2.0
    expect(price).toBe(2000);
  });
});

describe('adjustBaseFee', () => {
  it('increases fee when demand exceeds capacity', () => {
    const adjusted = adjustBaseFee(1000, 15, 10);
    // 1000 * 1.125 = 1125
    expect(adjusted).toBe(1125);
  });

  it('decreases fee when under capacity', () => {
    const adjusted = adjustBaseFee(1000, 5, 10);
    // 1000 * 0.875 = 875
    expect(adjusted).toBe(875);
  });

  it('floors at 1 msat', () => {
    const adjusted = adjustBaseFee(1, 0, 10);
    expect(adjusted).toBeGreaterThanOrEqual(1);
  });

  it('uses custom adjustment delta', () => {
    const adjusted = adjustBaseFee(1000, 15, 10, 0.25);
    // 1000 * 1.25 = 1250
    expect(adjusted).toBe(1250);
  });
});
