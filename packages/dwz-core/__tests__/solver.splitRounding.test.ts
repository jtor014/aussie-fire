import { describe, test, expect } from 'vitest';
import { findEarliestViable } from '../src/solver';
import type { Inputs } from '../src/solver';

describe('super net contribution rounding', () => {
  test('super net contribution rounded to cents (no dust drift)', () => {
    const input: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 31,      // 1-year run is enough to observe rounding
      outside0: 0,
      super0: 0,
      annualSavings: 33333.33, // induces fractional cents after 15% contrib tax
      realReturn: 0.0,
      bands: [],
      bequest: 0,
      preFireSavingsSplit: {
        toSuperPct: 1,
        capPerPerson: 1000000, // no cap effect
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = findEarliestViable(input);
    expect(result).not.toBeNull();
    
    if (result) {
      const firstPath = result.path[0];
      // 33,333.33 gross -> 85% = 28,333.3305 -> rounded to 28,333.33
      expect(firstPath.super).toBeCloseTo(28333.33, 2);
    }
  });

  test('clamps eligiblePeople to reasonable household size', () => {
    const input: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 31,
      outside0: 0,
      super0: 0,
      annualSavings: 60000,
      realReturn: 0.0,
      bands: [],
      bequest: 0,
      preFireSavingsSplit: {
        toSuperPct: 1,
        capPerPerson: 30000,
        eligiblePeople: 5, // Should be clamped to 2
        contribTaxRate: 0.15
      }
    };
    
    const result = findEarliestViable(input);
    expect(result).not.toBeNull();
    
    if (result) {
      const firstPath = result.path[0];
      // Should use cap of 30k * 2 = 60k (clamped), not 30k * 5 = 150k
      // 60k -> 85% = 51k to super
      expect(firstPath.super).toBeCloseTo(51000, 0);
      expect(firstPath.outside).toBeCloseTo(0, 0); // All goes to super within cap
    }
  });
});