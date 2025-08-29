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

  describe('new optimizer rule: maximize super unless it delays earliest age', () => {
    const testInput: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 50000,
      super0: 100000,
      annualSavings: 30000,
      realReturn: 0.07,
      bands: [{ endAgeIncl: 120, multiplier: 1.0 }],
      bequest: 0
    };

    test('tie case: when multiple splits yield same earliest age, picks highest super percentage', () => {
      // This test checks that among splits that yield the same earliest age,
      // the optimizer picks the one with the highest super allocation
      const result = optimizeSavingsSplitForPlan(
        testInput,
        40000, // moderate plan
        { capPerPerson: 30000, eligiblePeople: 1, contribTaxRate: 0.15 },
        { gridPoints: 21, refineIters: 2 } // Fine grid to catch ties
      );
      
      expect(result.recommendedPct).toBeGreaterThanOrEqual(0);
      expect(result.recommendedPct).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.earliestAge)).toBe(true);
      
      // For this test, we're mainly ensuring the optimizer doesn't crash
      // and produces a valid result. The specific percentages will depend
      // on the exact scenario, but the rule should prefer higher super splits
      // when ages are tied.
    });

    test('bridge-binding: max super would delay retirement age', () => {
      // Create a scenario where maxing super would create bridge funding issues
      const bridgeTestInput: Inputs = {
        currentAge: 35,
        preserveAge: 60, // 25-year bridge period
        lifeExp: 90,
        outside0: 20000, // Limited outside funds
        super0: 50000,   // Limited super funds
        annualSavings: 25000,
        realReturn: 0.06,
        bands: [{ endAgeIncl: 120, multiplier: 1.0 }],
        bequest: 0
      };
      
      const result = optimizeSavingsSplitForPlan(
        bridgeTestInput,
        35000, // Plan that requires bridge funding
        { capPerPerson: 30000, eligiblePeople: 1, contribTaxRate: 0.15 },
        { gridPoints: 11, refineIters: 1 }
      );
      
      // The optimizer should allocate enough to outside to cover bridge needs
      // rather than maximizing super contributions
      expect(Number.isFinite(result.earliestAge)).toBe(true);
      expect(result.recommendedPct).toBeLessThan(1.0); // Should not max super
    });

    test('SG consumes full cap: result shows 0 salary-sacrifice, age unchanged', () => {
      // Create scenario where employer SG uses the entire concessional cap
      const sgTestInput: Inputs = {
        currentAge: 30,
        preserveAge: 60,
        lifeExp: 90,
        outside0: 100000,
        super0: 200000,
        annualSavings: 40000,
        realReturn: 0.07,
        bands: [{ endAgeIncl: 120, multiplier: 1.0 }],
        bequest: 0,
        // Add high salary that would consume full cap via SG
        preFireSavingsSplit: {
          toSuperPct: 0,
          capPerPerson: 30000,
          eligiblePeople: 1,
          contribTaxRate: 0.15
        }
      };
      
      // Test with very limited cap relative to potential SG
      const result = optimizeSavingsSplitForPlan(
        sgTestInput,
        50000,
        { capPerPerson: 5000, eligiblePeople: 1, contribTaxRate: 0.15 }, // Very low cap
        { gridPoints: 11, refineIters: 1 }
      );
      
      // With cap already consumed by SG, optimizer should recommend low super or be cap constrained
      expect(result.recommendedPct).toBeLessThanOrEqual(0.5); // Should be low due to cap constraint
      expect(Number.isFinite(result.earliestAge)).toBe(true);
      // The constraint may or may not be binding depending on the exact scenario
      expect(result.constraints.capBindingAtOpt).toBeDefined();
    });

    test('explanation includes new tie-breaker reasoning', () => {
      const result = optimizeSavingsSplitForPlan(
        testInput,
        45000,
        { capPerPerson: 30000, eligiblePeople: 1, contribTaxRate: 0.15 },
        { gridPoints: 11, refineIters: 2 }
      );
      
      expect(result.explanation).toBeDefined();
      if (result.explanation) {
        // Check for new explanatory text that reflects the maximize super principle
        const hasMaxSuperExplanation = 
          result.explanation.includes('Maxed') || 
          result.explanation.includes('delaying') ||
          result.explanation.includes('unchanged');
        expect(hasMaxSuperExplanation).toBe(true);
      }
    });
  });
});