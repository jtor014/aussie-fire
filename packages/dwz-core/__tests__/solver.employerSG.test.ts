import { describe, test, expect } from 'vitest';
import { accumulateUntil } from '../src/solver';
import { Inputs } from '../src/types';

// Test employer super guarantee (SG) functionality in the solver
describe('employer super guarantee (SG)', () => {
  test('adds SG net to super during accumulation', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 20_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 12_000 // 12% SG on hypothetical $100k salary
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // SG should be taxed at 15% and added to super: 12k * (1 - 0.15) = 10.2k
    // All savings go to outside: 20k
    expect(result.outside).toBeCloseTo(20_000, 0);
    expect(result.super).toBeCloseTo(10_200, 0);
  });

  test('reduces concessional cap headroom by SG gross', () => {
    const input: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 50_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 15_000, // Uses up 15k of concessional cap
      preFireSavingsSplit: {
        toSuperPct: 1.0, // Want all 50k to super
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 36); // accumulate for 1 year
    
    // Effective cap headroom = 30k - 15k SG = 15k
    // Voluntary super is clamped to 15k, leaving 35k for outside
    // Super total: 15k SG + 15k voluntary = 30k gross, taxed to 25.5k net
    expect(result.outside).toBeCloseTo(35_000, 0);
    expect(result.super).toBeCloseTo(25_500, 0);
  });

  test('handles SG that exceeds entire concessional cap', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 40_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 35_000, // Exceeds 30k cap
      preFireSavingsSplit: {
        toSuperPct: 1.0, // Want all to super, but cap prevents it
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // Effective cap headroom = max(0, 30k - 35k) = 0
    // No voluntary super allowed, all savings go outside
    // Super only gets SG: 35k gross taxed to 29.75k net
    expect(result.outside).toBeCloseTo(40_000, 0);
    expect(result.super).toBeCloseTo(29_750, 0);
  });

  test('works with couples having higher combined cap', () => {
    const input: Inputs = {
      currentAge: 38,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 70_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 20_000, // Combined SG for couple
      preFireSavingsSplit: {
        toSuperPct: 0.8, // 80% to super
        capPerPerson: 30_000,
        eligiblePeople: 2, // couple
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 39); // accumulate for 1 year
    
    // Total cap = 60k, effective headroom = 60k - 20k SG = 40k
    // Desired voluntary super = 70k * 0.8 = 56k, clamped to 40k
    // Super total: 20k SG + 40k voluntary = 60k gross, taxed to 51k net
    // Outside gets remainder: 70k - 40k = 30k (based on actual allocation)
    expect(result.outside).toBeCloseTo(30_000, 0);
    expect(result.super).toBeCloseTo(51_000, 0);
  });

  test('accumulates over multiple years consistently', () => {
    const input: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 50_000,
      super0: 30_000,
      annualSavings: 25_000,
      realReturn: 0.05, // 5% real return
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 10_000, // $10k SG per year
      preFireSavingsSplit: {
        toSuperPct: 0.6,
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15
      }
    };
    
    const result = accumulateUntil(input, 35); // accumulate for 5 years
    
    // Each year: 10k SG gross -> 8.5k SG net added to super
    // Voluntary super: 25k * 0.6 = 15k desired, within 20k effective cap
    // Each year: 15k voluntary gross -> 12.75k voluntary net
    // Each year: 10k to outside (25k - 15k)
    // Total per year: 8.5k + 12.75k = 21.25k added to super, 10k to outside
    
    // After 5 years with compounding at 5%:
    // Complex calculation, but we can verify the pattern holds
    expect(result.super).toBeGreaterThan(30_000); // Started with 30k, added SG+voluntary each year
    expect(result.outside).toBeGreaterThan(50_000); // Started with 50k, added 10k/year
    
    // Verify SG is being added by checking it's more than just voluntary contributions
    const inputWithoutSG: Inputs = { ...input, employerSGGross: 0 };
    const resultWithoutSG = accumulateUntil(inputWithoutSG, 35);
    expect(result.super).toBeGreaterThan(resultWithoutSG.super);
  });

  test('handles zero SG gracefully', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 30_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 0 // No SG
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // Should behave exactly like no SG field present
    expect(result.outside).toBeCloseTo(40_000, 0); // 10k initial + 30k savings
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged from initial
  });

  test('handles undefined SG gracefully', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 30_000,
      realReturn: 0.0,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0
      // employerSGGross undefined
    };
    
    const result = accumulateUntil(input, 41); // accumulate for 1 year
    
    // Should behave exactly like SG = 0
    expect(result.outside).toBeCloseTo(40_000, 0); // 10k initial + 30k savings
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged from initial
  });
});