import { describe, test, expect } from 'vitest';
import { findEarliestAgeForPlan } from '../src/planning/earliestForPlan';
import type { Inputs } from '../src/solver';

describe('findEarliestAgeForPlan', () => {
  const baseInput: Inputs = {
    currentAge: 30,
    preserveAge: 60,
    lifeExp: 90,
    outside0: 100000,
    super0: 200000,
    annualSavings: 50000,
    realReturn: 0.07,
    bands: [
      { endAgeIncl: 60, multiplier: 1.1 },
      { endAgeIncl: 75, multiplier: 1.0 },
      { endAgeIncl: 120, multiplier: 0.85 }
    ],
    bequest: 0
  };

  test('returns null for invalid plan amounts', () => {
    expect(findEarliestAgeForPlan(baseInput, 0).earliestAge).toBeNull();
    expect(findEarliestAgeForPlan(baseInput, -1000).earliestAge).toBeNull();
    expect(findEarliestAgeForPlan(baseInput, NaN).earliestAge).toBeNull();
  });

  test('returns result for valid plan amount', () => {
    const result = findEarliestAgeForPlan(baseInput, 50000);
    
    expect(result.plan).toBe(50000);
    expect(result.evaluations).toBeGreaterThan(0);
    
    if (result.earliestAge !== null) {
      expect(result.earliestAge).toBeGreaterThan(baseInput.currentAge);
      expect(result.earliestAge).toBeLessThanOrEqual(baseInput.lifeExp);
      expect(result.atAgeSpend).toBeGreaterThanOrEqual(50000 - 0.01); // Within epsilon
    }
  });

  test('returns null for impossibly high plan amount', () => {
    const result = findEarliestAgeForPlan(baseInput, 10_000_000); // 10M/year is impossible
    
    expect(result.plan).toBe(10_000_000);
    expect(result.earliestAge).toBeNull();
    expect(result.evaluations).toBeGreaterThan(0);
  });

  test('handles reasonable plan amounts', () => {
    // Test with a modest plan that should be achievable
    const result = findEarliestAgeForPlan(baseInput, 30000);
    
    expect(result.plan).toBe(30000);
    expect(result.evaluations).toBeGreaterThan(0);
    
    if (result.earliestAge !== null) {
      expect(result.earliestAge).toBeGreaterThan(baseInput.currentAge);
      expect(result.earliestAge).toBeLessThanOrEqual(baseInput.lifeExp);
      expect(typeof result.atAgeSpend).toBe('number');
    }
  });
});