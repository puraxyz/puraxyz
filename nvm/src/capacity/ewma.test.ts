import { describe, it, expect } from 'vitest';
import { ewma, DEFAULT_ALPHA } from './ewma.js';

describe('ewma', () => {
  it('returns raw value on first observation', () => {
    expect(ewma(100, undefined)).toBe(100);
  });

  it('smooths toward new value with default alpha 0.3', () => {
    const result = ewma(200, 100, 0.3);
    // 0.3 * 200 + 0.7 * 100 = 60 + 70 = 130
    expect(result).toBeCloseTo(130, 5);
  });

  it('converges to steady-state value after many updates', () => {
    let smoothed: number | undefined;
    for (let i = 0; i < 50; i++) {
      smoothed = ewma(500, smoothed);
    }
    expect(smoothed).toBeCloseTo(500, 1);
  });

  it('responds slowly to spikes', () => {
    let smoothed = ewma(100, undefined);
    smoothed = ewma(1000, smoothed); // spike
    // 0.3 * 1000 + 0.7 * 100 = 300 + 70 = 370
    expect(smoothed).toBeCloseTo(370, 5);
    // Still well below the spike value
    expect(smoothed).toBeLessThan(500);
  });

  it('uses custom alpha', () => {
    const result = ewma(200, 100, 0.5);
    // 0.5 * 200 + 0.5 * 100 = 100 + 50 = 150
    expect(result).toBeCloseTo(150, 5);
  });

  it('DEFAULT_ALPHA matches CapacityRegistry.sol constant', () => {
    expect(DEFAULT_ALPHA).toBe(0.3);
  });
});
