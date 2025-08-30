import { describe, test, expect } from 'vitest';
import { accumulateUntil, findEarliestViable, type Inputs } from '../src/solver';

describe('future inflows', () => {
  test('inflow at trigger age is applied before growth', () => {
    const baseInput: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 0,
      realReturn: 0.05, // 5% return
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 42, amount: 50_000, to: 'outside' }
      ]
    };

    const result = accumulateUntil(baseInput, 43); // accumulate through age 42 trigger

    // Year 1 (40->41): 10k grows to 10.5k
    // Year 2 (41->42): 10.5k grows to 11.025k
    // Year 3 (42->43): 11.025k + 50k inflow = 61.025k, then grows to ~64.076k
    // Super just grows: 5k -> 5.25k -> 5.5125k -> 5.788k (rounding)

    expect(result.outside).toBeCloseTo(64_076, 0);
    expect(result.super).toBeCloseTo(5_788, 0);
  });

  test('inflow to super destination works correctly', () => {
    const input: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 20_000,
      super0: 10_000,
      annualSavings: 0,
      realReturn: 0.0, // No growth for easier testing
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 37, amount: 30_000, to: 'super' }
      ]
    };

    const result = accumulateUntil(input, 38); // accumulate through age 37 trigger

    // Outside stays at 20k (no growth, no inflow)
    // Super gets 30k inflow at age 37: 10k + 30k = 40k
    expect(result.outside).toBeCloseTo(20_000, 0);
    expect(result.super).toBeCloseTo(40_000, 0);
  });

  test('multiple inflows at different ages', () => {
    const input: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 0,
      super0: 0,
      annualSavings: 0,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 32, amount: 25_000, to: 'outside' },
        { ageYou: 34, amount: 15_000, to: 'super' },
        { ageYou: 36, amount: 10_000 } // defaults to 'outside'
      ]
    };

    const result = accumulateUntil(input, 37); // accumulate through all triggers

    // Age 32: +25k to outside
    // Age 34: +15k to super
    // Age 36: +10k to outside
    expect(result.outside).toBeCloseTo(35_000, 0);
    expect(result.super).toBeCloseTo(15_000, 0);
  });

  test('inflow timing is exact - no inflow before trigger age', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 0,
      annualSavings: 0,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 45, amount: 20_000, to: 'outside' }
      ]
    };

    // Accumulate to just before trigger - no inflow should occur
    const resultBefore = accumulateUntil(input, 44);
    expect(resultBefore.outside).toBeCloseTo(10_000, 0);
    expect(resultBefore.super).toBeCloseTo(0, 0);

    // Accumulate through trigger - inflow should occur
    const resultAfter = accumulateUntil(input, 46);
    expect(resultAfter.outside).toBeCloseTo(30_000, 0); // 10k + 20k inflow
    expect(resultAfter.super).toBeCloseTo(0, 0);
  });

  test('negative and zero inflows are ignored', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 0,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 42, amount: -5_000, to: 'outside' }, // negative ignored
        { ageYou: 43, amount: 0, to: 'super' }, // zero ignored
        { ageYou: 44, amount: 15_000, to: 'outside' } // valid inflow
      ]
    };

    const result = accumulateUntil(input, 45);

    // Only the 15k inflow at age 44 should be applied
    expect(result.outside).toBeCloseTo(25_000, 0); // 10k + 15k
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged
  });

  test('no inflows array handles gracefully', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 20_000,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0
      // no futureInflows field
    };

    const result = accumulateUntil(input, 41);

    // Should work exactly like before, all savings to outside
    expect(result.outside).toBeCloseTo(30_000, 0); // 10k + 20k savings
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged
  });

  test('empty inflows array handles gracefully', () => {
    const input: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 20_000,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [] // empty array
    };

    const result = accumulateUntil(input, 41);

    // Should work exactly like no inflows
    expect(result.outside).toBeCloseTo(30_000, 0); // 10k + 20k savings
    expect(result.super).toBeCloseTo(5_000, 0); // unchanged
  });

  test('inflow improves earliest viable age (monotonicity)', () => {
    const baseHousehold: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 50_000,
      super0: 20_000,
      annualSavings: 40_000,
      realReturn: 0.06,
      bands: [{ endAgeIncl: 85, multiplier: 1.0 }],
      bequest: 0
    };

    const withoutInflows = findEarliestViable(baseHousehold);
    
    const withInflows: Inputs = {
      ...baseHousehold,
      futureInflows: [
        { ageYou: 40, amount: 100_000, to: 'outside' }
      ]
    };
    const withInflowsResult = findEarliestViable(withInflows);

    // Inflow should either improve earliest age or at least not make it worse
    expect(withInflowsResult).not.toBeNull();
    expect(withoutInflows).not.toBeNull();
    
    if (withoutInflows && withInflowsResult) {
      expect(withInflowsResult.retireAge).toBeLessThanOrEqual(withoutInflows.retireAge);
    }
  });

  test('inflows work alongside other accumulation features', () => {
    // Simpler test: just verify that inflows add to the expected destination
    // when combined with other features, without getting into complex math
    const inputWithoutInflow: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10_000,
      super0: 5_000,
      annualSavings: 30_000,
      realReturn: 0.0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      employerSGGross: 10_000 // Some SG to test interaction
    };

    const inputWithInflow: Inputs = {
      ...inputWithoutInflow,
      futureInflows: [
        { ageYou: 31, amount: 20_000, to: 'outside' }
      ]
    };

    const resultWithout = accumulateUntil(inputWithoutInflow, 32); // 2 years
    const resultWith = accumulateUntil(inputWithInflow, 32); // 2 years with inflow

    // The difference should be exactly the inflow amount in the right destination
    expect(resultWith.outside - resultWithout.outside).toBeCloseTo(20_000, 0);
    expect(resultWith.super).toBeCloseTo(resultWithout.super, 0); // Super unchanged
  });
});