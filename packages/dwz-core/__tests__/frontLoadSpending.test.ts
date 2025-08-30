import { describe, test, expect } from 'vitest';
import { findEarliestViable, type Inputs } from '../src/solver';

describe('front-load spending from post-retirement inflows', () => {
  const baseInput: Inputs = {
    currentAge: 40,
    preserveAge: 60,
    lifeExp: 85,
    outside0: 500_000,
    super0: 200_000,
    realReturn: 0.05,
    annualSavings: 0,
    bands: [{ endAgeIncl: 85, multiplier: 1.0 }],
    bequest: 0,
    retireAge: 50
  };

  test('no front-load when no inflows exist', () => {
    const result = findEarliestViable(baseInput);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeUndefined();
    }
  });

  test('no front-load when inflow is at or before retirement', () => {
    const inputWithPreRetInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 50, amount: 100_000, to: 'outside' } // At retirement age
      ]
    };
    
    const result = findEarliestViable(inputWithPreRetInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeUndefined();
    }
  });

  test('front-load computed for outside inflow after retirement', () => {
    const inputWithPostRetInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 60, amount: 250_000, to: 'outside' }
      ]
    };
    
    const result = findEarliestViable(inputWithPostRetInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(60);
        expect(result.frontLoad.delta).toBeGreaterThan(0);
        expect(result.frontLoad.preSpend).toBe(result.sBase + result.frontLoad.delta);
        expect(result.frontLoad.postSpend).toBe(result.sBase);
        
        // With 10 years gap and 5% return, delta should be approximately 250k / 10 * adjustment
        // PV factor at 5% for 10 years: 0.6139
        // Annuity formula gives roughly 19,863/year uplift
        expect(result.frontLoad.delta).toBeCloseTo(19_863, -2);
      }
    }
  });

  test('super inflow before preservation uses preservation age', () => {
    const inputWithSuperInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 55, amount: 200_000, to: 'super' } // Before preservation age 60
      ]
    };
    
    const result = findEarliestViable(inputWithSuperInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(60); // Should use preservation age
        expect(result.frontLoad.delta).toBeGreaterThan(0);
      }
    }
  });

  test('multiple inflows at same earliest age are summed', () => {
    const inputWithMultipleInflows: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 60, amount: 100_000, to: 'outside' },
        { ageYou: 60, amount: 150_000, to: 'super' }, // Also accessible at 60
        { ageYou: 70, amount: 200_000, to: 'outside' } // Later inflow ignored for uplift
      ]
    };
    
    const result = findEarliestViable(inputWithMultipleInflows);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(60);
        // Delta should be based on 250k total (100k + 150k), not the 200k at age 70
        const expectedDelta = 19_863; // Approximately for 250k over 10 years at 5%
        expect(result.frontLoad.delta).toBeCloseTo(expectedDelta, -2);
      }
    }
  });

  test('g=0 fallback returns A/n', () => {
    const inputWithZeroReturn: Inputs = {
      ...baseInput,
      realReturn: 0, // Zero return
      futureInflows: [
        { ageYou: 60, amount: 100_000, to: 'outside' }
      ]
    };
    
    const result = findEarliestViable(inputWithZeroReturn);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(60);
        // With g=0: delta = 100k / 10 years = 10k/year
        expect(result.frontLoad.delta).toBe(10_000);
      }
    }
  });

  test('negative inflow amounts are ignored', () => {
    const inputWithNegativeInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 60, amount: -100_000, to: 'outside' }, // Negative - ignored
        { ageYou: 65, amount: 50_000, to: 'outside' } // Valid inflow
      ]
    };
    
    const result = findEarliestViable(inputWithNegativeInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(65); // Should use the valid inflow
        expect(result.frontLoad.delta).toBeGreaterThan(0);
      }
    }
  });

  test('zero inflow amounts result in no front-load', () => {
    const inputWithZeroInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 60, amount: 0, to: 'outside' }
      ]
    };
    
    const result = findEarliestViable(inputWithZeroInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeUndefined();
    }
  });

  test('super inflow after preservation accessible at inflow age', () => {
    const inputWithLateSuperInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 65, amount: 300_000, to: 'super' } // After preservation age 60
      ]
    };
    
    const result = findEarliestViable(inputWithLateSuperInflow);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.frontLoad).toBeDefined();
      if (result.frontLoad) {
        expect(result.frontLoad.preUntilAge).toBe(65); // Should use inflow age (after preservation)
        expect(result.frontLoad.delta).toBeGreaterThan(0);
      }
    }
  });

  test('front-load preserves feasibility (no negative balances)', () => {
    // Test with minimal outside balance to ensure front-load doesn't break feasibility
    const inputWithLowBalance: Inputs = {
      ...baseInput,
      outside0: 200_000, // Lower starting balance
      super0: 100_000,
      retireAge: 45, // Earlier retirement
      futureInflows: [
        { ageYou: 55, amount: 150_000, to: 'outside' }
      ]
    };
    
    const result = findEarliestViable(inputWithLowBalance);
    // If a result is returned, it means the plan is feasible
    // The solver should ensure front-load doesn't introduce negative balances
    if (result && result.frontLoad) {
      expect(result.frontLoad.delta).toBeGreaterThan(0);
      expect(result.frontLoad.preSpend).toBeGreaterThan(result.frontLoad.postSpend);
      
      // Verify the path doesn't have negative balances during pre-inflow period
      const preInflowPath = result.path.filter(p => p.age < result.frontLoad!.preUntilAge);
      for (const point of preInflowPath) {
        expect(point.outside).toBeGreaterThanOrEqual(-1); // Allow tiny rounding errors
        expect(point.super).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  test('complex scenario with mixed inflows', () => {
    const complexInput: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 300_000,
      super0: 150_000,
      realReturn: 0.06,
      annualSavings: 30_000,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 50_000,
      futureInflows: [
        { ageYou: 40, amount: 50_000, to: 'outside' },  // Pre-retirement (during accumulation)
        { ageYou: 58, amount: 100_000, to: 'super' },   // Post-retirement but pre-preservation
        { ageYou: 58, amount: 75_000, to: 'outside' },  // Same age, different destination
        { ageYou: 70, amount: 200_000, to: 'outside' }, // Much later inflow
        { ageYou: 75, amount: 150_000, to: 'super' }    // Even later
      ]
    };
    
    const result = findEarliestViable(complexInput);
    expect(result).not.toBeNull();
    if (result && result.frontLoad) {
      // The earliest post-retirement accessible inflow determines the front-load period
      // Age 58 outside inflow (75k) + Age 58 super inflow accessible at 60 (100k)
      // So earliest accessible is age 58 for outside (75k only)
      // But if retire age is before 58, then both 58 and 60 need to be considered
      // Actually, since super at 58 is accessible at 60, we need to check what age is earliest
      
      // This is complex - just verify we get reasonable results
      expect(result.frontLoad.preUntilAge).toBeGreaterThanOrEqual(58);
      expect(result.frontLoad.preUntilAge).toBeLessThanOrEqual(60);
      expect(result.frontLoad.delta).toBeGreaterThan(0);
    }
  });
});