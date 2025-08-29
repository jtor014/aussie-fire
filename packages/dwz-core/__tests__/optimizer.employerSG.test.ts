import { describe, test, expect } from 'vitest';
import { optimizeSavingsSplit, optimizeSavingsSplitForPlan } from '../src/optimizer/savingsSplit';
import { Inputs } from '../src/types';

// Test optimizer cap-binding logic with employer SG
describe('optimizer with employer SG', () => {
  test('reports correct effective cap total in constraints', () => {
    const baseInput: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 50_000,
      super0: 100_000,
      annualSavings: 40_000,
      realReturn: 0.06,
      bands: [
        { endAgeIncl: 67, multiplier: 1.2 },
        { endAgeIncl: 85, multiplier: 0.8 }
      ],
      bequest: 0,
      employerSGGross: 12_000 // Reduces effective cap by 12k
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    };

    const result = optimizeSavingsSplit(baseInput, policy);
    
    // Effective cap total should be 30k - 12k = 18k
    expect(result.constraints.capTotal).toBeCloseTo(18_000, 0);
    expect(result.constraints.capPerPerson).toBe(30_000);
    expect(result.constraints.eligiblePeople).toBe(1);
  });

  test('correctly determines cap binding with SG', () => {
    const baseInput: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 25_000,
      realReturn: 0.05,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 15_000 // Reduces effective cap to 15k
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    };

    const result = optimizeSavingsSplit(baseInput, policy);
    
    // With 25k savings and effective cap of 15k, any split > 60% should be cap-binding
    // The optimizer should find the optimal split and report cap binding correctly
    if (result.recommendedPct > 0.6) {
      expect(result.constraints.capBindingAtOpt).toBe(true);
    } else {
      expect(result.constraints.capBindingAtOpt).toBe(false);
    }
  });

  test('handles couple with SG reducing combined cap', () => {
    const baseInput: Inputs = {
      currentAge: 38,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 100_000,
      super0: 200_000,
      annualSavings: 80_000,
      realReturn: 0.065,
      bands: [
        { endAgeIncl: 65, multiplier: 1.1 },
        { endAgeIncl: 85, multiplier: 0.9 }
      ],
      bequest: 0,
      employerSGGross: 22_000 // Combined SG for couple
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 2, // couple
      contribTaxRate: 0.15
    };

    const result = optimizeSavingsSplit(baseInput, policy);
    
    // Effective cap total should be 60k - 22k = 38k
    expect(result.constraints.capTotal).toBeCloseTo(38_000, 0);
    
    // With 80k savings, if optimal split > 47.5% (80k * 0.475 = 38k), it should be cap-binding
    if (result.recommendedPct * 80_000 > 38_000) {
      expect(result.constraints.capBindingAtOpt).toBe(true);
    }
  });

  test('plan optimizer respects SG cap reduction', () => {
    const baseInput: Inputs = {
      currentAge: 45,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 150_000,
      super0: 100_000,
      annualSavings: 50_000,
      realReturn: 0.06,
      bands: [
        { endAgeIncl: 85, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 18_000
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    };

    const targetPlan = 60_000; // Annual spending target

    const result = optimizeSavingsSplitForPlan(baseInput, targetPlan, policy);
    
    // Should respect the reduced effective cap
    expect(result.constraints.capTotal).toBeCloseTo(12_000, 0); // 30k - 18k
    
    // The plan should be achievable (not infinity)
    expect(result.earliestAge).toBeLessThan(Infinity);
    
    // If using significant super allocation, should be cap-binding
    if (result.recommendedPct * 50_000 > 12_000) {
      expect(result.constraints.capBindingAtOpt).toBe(true);
    }
  });

  test('handles SG that completely exhausts cap', () => {
    const baseInput: Inputs = {
      currentAge: 42,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 80_000,
      super0: 50_000,
      annualSavings: 35_000,
      realReturn: 0.055,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0,
      employerSGGross: 32_000 // Exceeds 30k cap
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    };

    const result = optimizeSavingsSplit(baseInput, policy);
    
    // Effective cap should be 0 (max(0, 30k - 32k))
    expect(result.constraints.capTotal).toBe(0);
    
    // No voluntary super is possible, so optimal should be 0%
    expect(result.recommendedPct).toBe(0);
    
    // Cannot be cap-binding since no voluntary super is allowed
    expect(result.constraints.capBindingAtOpt).toBe(false);
  });

  test('works correctly when no SG present', () => {
    const baseInput: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 100_000,
      super0: 75_000,
      annualSavings: 45_000,
      realReturn: 0.06,
      bands: [
        { endAgeIncl: 90, multiplier: 1.0 }
      ],
      bequest: 0
      // employerSGGross not specified (undefined)
    };

    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    };

    const result = optimizeSavingsSplit(baseInput, policy);
    
    // Should use full cap since no SG reduction
    expect(result.constraints.capTotal).toBe(30_000);
    
    // Should optimize normally without SG considerations
    expect(result.recommendedPct).toBeGreaterThanOrEqual(0);
    expect(result.recommendedPct).toBeLessThanOrEqual(1);
  });
});