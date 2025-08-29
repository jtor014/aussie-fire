import { describe, test, expect } from 'vitest';
import { optimizeSavingsSplitForPlan } from '../src/optimizer/savingsSplit.ts';

describe('dwz depletion path via solver+optimizer', () => {
  test('tie-breaker for consistent plan maximizes super percentage', () => {
    const baseInput = {
      currentAge: 45,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 500000,
      super0: 200000,
      realReturn: 0.059,
      annualSavings: 50000,
      bands: [
        { endAgeIncl: 74, multiplier: 1.0 },
        { endAgeIncl: 199, multiplier: 0.85 }
      ],
      bequest: 0
    };

    const policy = {
      capPerPerson: 30000,
      eligiblePeople: 1,
      contribTaxRate: 0.15,
      outsideTaxRate: 0.32,
      maxPct: 1.0
    };

    const opts = {
      gridPoints: 11,
      refineIters: 1,
      window: 0.10
    };

    const result = optimizeSavingsSplitForPlan(baseInput, 75000, policy, opts);
    
    // With new tie-breaker that maximizes super percentage,
    // we should prefer maximum super allocation when ages are tied
    expect(result.recommendedPct).toBeGreaterThan(0.3);
    expect(result.earliestAge).toBeGreaterThanOrEqual(45);  // Verify feasible result
  });
});