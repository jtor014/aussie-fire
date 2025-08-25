import { describe, test, expect } from 'vitest';
import { optimizeSavingsSplitForPlan } from '../src/optimizer/savingsSplit';
import type { Inputs } from '../src/solver';

describe('optimizeSavingsSplitForPlan', () => {
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

  test('returns valid result for achievable plan', () => {
    const result = optimizeSavingsSplitForPlan(
      baseInput,
      50000, // plan spend
      { capPerPerson: 30000, eligiblePeople: 2, contribTaxRate: 0.15 },
      { gridPoints: 11, refineIters: 1 }
    );
    
    expect(result.objective).toBe('earliestAgeForPlan');
    expect(result.plan).toBe(50000);
    expect(result.recommendedPct).toBeGreaterThanOrEqual(0);
    expect(result.recommendedPct).toBeLessThanOrEqual(1);
    expect(result.earliestAge).toBeGreaterThan(baseInput.currentAge);
    expect(result.earliestAge).toBeLessThanOrEqual(baseInput.lifeExp);
    expect(result.sensitivity).toHaveLength(5);
    expect(result.evals).toBeGreaterThan(0);
  });

  test('handles very high plan amounts', () => {
    const result = optimizeSavingsSplitForPlan(
      baseInput,
      200000, // high but potentially achievable late in life
      { capPerPerson: 30000, eligiblePeople: 2, contribTaxRate: 0.15 },
      { gridPoints: 5, refineIters: 0 }
    );
    
    expect(result.objective).toBe('earliestAgeForPlan');
    expect(result.plan).toBe(200000);
    // Either it's achievable at some age or not achievable at all
    if (Number.isFinite(result.earliestAge)) {
      expect(result.earliestAge).toBeGreaterThan(baseInput.currentAge);
      expect(result.earliestAge).toBeLessThanOrEqual(baseInput.lifeExp);
    } else {
      expect(result.earliestAge).toBe(Infinity);
    }
  });

  test('handles zero plan gracefully', () => {
    const result = optimizeSavingsSplitForPlan(
      baseInput,
      0,
      { capPerPerson: 30000, eligiblePeople: 2, contribTaxRate: 0.15 }
    );
    
    expect(result.earliestAge).toBe(Infinity);
    expect(result.evals).toBe(0);
  });

  test('respects cap binding constraint', () => {
    const highSavingsInput = { ...baseInput, annualSavings: 100000 };
    const result = optimizeSavingsSplitForPlan(
      highSavingsInput,
      60000,
      { capPerPerson: 30000, eligiblePeople: 2, contribTaxRate: 0.15 },
      { gridPoints: 11, refineIters: 1 }
    );
    
    expect(result.constraints.capBindingAtOpt).toBeDefined();
    if (result.recommendedPct > 0.6) {
      expect(result.constraints.capBindingAtOpt).toBe(true);
    }
  });
});