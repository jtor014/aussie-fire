import { describe, test, expect } from 'vitest';
import { accumulateUntil } from '../src/solver';
import { Inputs } from '../src/types';

// This is a behavioral smoke test - it checks pre-FIRE accumulation splits annualSavings
// into outside vs super respecting cap and 15% contributions tax.
// It does not validate full lifecycle math.

describe('pre-FIRE savings split', () => {
  test('respects cap and contrib tax', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 50_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 60, multiplier: 1.10 },
        { endAgeIncl: 75, multiplier: 1.00 },
        { endAgeIncl: 120, multiplier: 0.85 }
      ],
      bequest: 0,
      preFireSavingsSplit: {
        toSuperPct: 1.0,
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // With toSuperPct=1, desiredSuperGross=50k, capped at 30k -> superNet=25.5k, outside=20k
    expect(result.outside).toBeCloseTo(20_000, 0);
    expect(result.super).toBeCloseTo(25_500, 0);
  });

  test('falls back to all-outside when no split configured', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 30_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 60, multiplier: 1.10 },
        { endAgeIncl: 75, multiplier: 1.00 },
        { endAgeIncl: 120, multiplier: 0.85 }
      ],
      bequest: 0
      // No preFireSavingsSplit configured
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // All savings should go to outside (backward compatible behavior)
    expect(result.outside).toBeCloseTo(40_000, 0); // 10k initial + 30k savings
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged from initial
  });

  test('handles partial super allocation within cap', () => {
    const input: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 40_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 60, multiplier: 1.10 },
        { endAgeIncl: 75, multiplier: 1.00 },
        { endAgeIncl: 120, multiplier: 0.85 }
      ],
      bequest: 0,
      preFireSavingsSplit: {
        toSuperPct: 0.5, // 50% to super
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 36); // accumulate for 1 year
    
    // 50% of 40k = 20k to super (within cap), 15% tax = 17k net super
    // Remaining 20k to outside
    expect(result.outside).toBeCloseTo(20_000, 0);
    expect(result.super).toBeCloseTo(17_000, 0);
  });

  test('handles couples with higher total cap', () => {
    const input: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 80_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 60, multiplier: 1.10 },
        { endAgeIncl: 75, multiplier: 1.00 },
        { endAgeIncl: 120, multiplier: 0.85 }
      ],
      bequest: 0,
      preFireSavingsSplit: {
        toSuperPct: 0.75, // 75% to super
        capPerPerson: 30_000,
        eligiblePeople: 2, // couple
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 31); // accumulate for 1 year
    
    // 75% of 80k = 60k desired for super, cap is 60k total (30k × 2)
    // All 60k goes to super, taxed to 51k net
    // Remaining 20k to outside
    expect(result.outside).toBeCloseTo(20_000, 0);
    expect(result.super).toBeCloseTo(51_000, 0);
  });
});