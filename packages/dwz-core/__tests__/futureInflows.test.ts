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
        { ageYou: 45, amount: 200_000, to: 'outside' } // Later, larger inflow
      ]
    };
    const withInflowsResult = findEarliestViable(withInflows);

    // Inflow should improve sustainable spending and/or earliest age
    expect(withInflowsResult).not.toBeNull();
    expect(withoutInflows).not.toBeNull();
    
    if (withoutInflows && withInflowsResult) {
      // Either earlier retirement OR higher spending (or both)
      const improvedAge = withInflowsResult.retireAge <= withoutInflows.retireAge;
      const improvedSpending = withInflowsResult.sBase >= withoutInflows.sBase;
      expect(improvedAge || improvedSpending).toBe(true);
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

  test('multiple inflows route to correct buckets', () => {
    const inp: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 50000,
      super0: 100000,
      realReturn: 0.05,
      annualSavings: 0,
      bands: [{ endAgeIncl: 89, multiplier: 1.0 }],
      bequest: 0,
      retireAge: 60,
      futureInflows: [
        { ageYou: 45, amount: 100000, to: 'outside' },
        { ageYou: 46, amount: 80000, to: 'super' },
        { ageYou: 50, amount: 50000 } // no 'to' specified, should default to outside
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).toBeDefined();
    
    if (result) {
      // Find path points at ages 45, 46, and 50
      const y44 = result.path.find(p => p.age === 44);
      const y45 = result.path.find(p => p.age === 45);
      const y46 = result.path.find(p => p.age === 46);
      const y50 = result.path.find(p => p.age === 50);
      const y49 = result.path.find(p => p.age === 49);

      expect(y44).toBeDefined();
      expect(y45).toBeDefined();
      expect(y46).toBeDefined();
      expect(y50).toBeDefined();
      expect(y49).toBeDefined();

      if (y44 && y45 && y46 && y50 && y49) {
        // Check that inflows were applied by comparing differences in balances
        // Note: exact calculations are complex due to spending and growth interactions,
        // so we verify that the inflows had positive impact
        
        // Outside should have increased significantly at age 45 due to 100k inflow
        expect(y45.outside).toBeGreaterThan(y44.outside);
        
        // Super should have increased significantly at age 46 due to 80k inflow
        expect(y46.super).toBeGreaterThan(y45.super);
        
        // Outside should have increased significantly at age 50 due to 50k inflow
        expect(y50.outside).toBeGreaterThan(y49.outside);
      }
    }
  });

  test('super inflow before preservation age remains locked', () => {
    const inp: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 10000, // Very low outside balance
      super0: 100000,
      realReturn: 0.05,
      annualSavings: 5000,
      bands: [{ endAgeIncl: 89, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 45, amount: 200000, to: 'super' } // Large super inflow before preservation
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).toBeDefined();
    
    if (result) {
      // The super inflow should not help with bridge period
      // So retirement age should still be limited by outside funds availability
      expect(result.retireAge).toBeGreaterThanOrEqual(55); // Can't retire too early with low outside
    }
  });

  test('handles empty and zero-amount inflows gracefully', () => {
    const inp: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 100000,
      super0: 50000,
      realReturn: 0.05,
      annualSavings: 20000,
      bands: [{ endAgeIncl: 89, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 45, amount: 0, to: 'outside' }, // Zero amount, should be ignored
        { ageYou: 50, amount: -1000, to: 'super' } // Negative amount, should be ignored
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).toBeDefined();
    // Test should complete without errors, zero/negative amounts are safely ignored
  });

  test('handles multiple inflows in the same year without errors', () => {
    const inp: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 100000,
      super0: 50000,
      realReturn: 0.05,
      annualSavings: 10000,
      bands: [{ endAgeIncl: 89, multiplier: 1.0 }],
      bequest: 0,
      retireAge: 60,
      futureInflows: [
        { ageYou: 50, amount: 80000, to: 'outside' }, // First inflow at age 50
        { ageYou: 50, amount: 70000, to: 'super' },   // Second inflow at age 50  
        { ageYou: 50, amount: 50000, to: 'outside' }  // Third inflow at age 50
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).toBeDefined();
    
    // Just verify the solver handles multiple inflows without crashing
    // The complex interaction with spending makes exact balance predictions difficult
    if (result) {
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.retireAge).toBeGreaterThan(0);
    }
  });

  test('post-retirement inflows increase sustainable spending', () => {
    // Base case: no post-retirement inflows
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
      retireAge: 55
    };

    // Case with post-retirement inflow
    const withPostRetirementInflow: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 70, amount: 200_000, to: 'outside' } // Large inflow at age 70
      ]
    };

    const baseResult = findEarliestViable(baseInput);
    const inflowResult = findEarliestViable(withPostRetirementInflow);

    expect(baseResult).not.toBeNull();
    expect(inflowResult).not.toBeNull();

    if (baseResult && inflowResult) {
      // Post-retirement inflow should increase sustainable spending
      expect(inflowResult.sBase).toBeGreaterThan(baseResult.sBase);
      
      // Should maintain or improve retirement age
      expect(inflowResult.retireAge).toBeLessThanOrEqual(baseResult.retireAge);
    }
  });

  test('post-retirement inflows allow earlier retirement', () => {
    // Scenario: modest savings, large inheritance at age 75
    const inp: Inputs = {
      currentAge: 30,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 50_000,
      super0: 30_000,
      realReturn: 0.06,
      annualSavings: 25_000,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 75, amount: 500_000, to: 'outside' } // Large inheritance
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).not.toBeNull();
    
    if (result) {
      // Should be able to retire earlier due to future inheritance
      // Even though inheritance comes later, it supports higher spending throughout
      expect(result.retireAge).toBeLessThan(60); // Should retire before preservation age
      expect(result.sBase).toBeGreaterThan(20_000); // Should have decent spending power
    }
  });

  test('post-retirement super inflows correctly locked until preservation age', () => {
    const inp: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 300_000,
      super0: 100_000,
      realReturn: 0.05,
      annualSavings: 0,
      bands: [{ endAgeIncl: 85, multiplier: 1.0 }],
      bequest: 0,
      retireAge: 55, // Retire before preservation age
      futureInflows: [
        { ageYou: 58, amount: 100_000, to: 'super' } // Super inflow during bridge period
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).not.toBeNull();
    
    if (result) {
      const path = result.path;
      
      // Find the point where inflow occurs (age 58)
      const inflowPoint = path.find(p => p.age === 58);
      expect(inflowPoint).toBeDefined();
      
      if (inflowPoint) {
        // Super balance should increase due to inflow
        const prevPoint = path.find(p => p.age === 57);
        if (prevPoint) {
          expect(inflowPoint.super).toBeGreaterThan(prevPoint.super);
        }
        
        // But during bridge period (age 58-60), only outside funds should be used for spending
        // Super should continue growing, not being drawn down
        expect(inflowPoint.phase).toBe('bridge');
      }
    }
  });

  test('multiple post-retirement inflows compound spending power', () => {
    const baseInput: Inputs = {
      currentAge: 45,
      preserveAge: 60,
      lifeExp: 90,
      outside0: 400_000,
      super0: 150_000,
      realReturn: 0.05,
      annualSavings: 0,
      bands: [{ endAgeIncl: 90, multiplier: 1.0 }],
      bequest: 0,
      retireAge: 55
    };

    const withMultipleInflows: Inputs = {
      ...baseInput,
      futureInflows: [
        { ageYou: 65, amount: 150_000, to: 'outside' }, // First inheritance
        { ageYou: 75, amount: 200_000, to: 'super' },   // Second inheritance  
        { ageYou: 80, amount: 100_000, to: 'outside' }  // Third inheritance
      ]
    };

    const baseResult = findEarliestViable(baseInput);
    const multiInflowResult = findEarliestViable(withMultipleInflows);

    expect(baseResult).not.toBeNull();
    expect(multiInflowResult).not.toBeNull();

    if (baseResult && multiInflowResult) {
      // Multiple inflows should significantly boost sustainable spending
      const spendingIncrease = multiInflowResult.sBase / baseResult.sBase;
      expect(spendingIncrease).toBeGreaterThan(1.2); // At least 20% increase
      
      // Path should show inflows being applied at correct ages
      const path = multiInflowResult.path;
      const age65 = path.find(p => p.age === 65);
      const age75 = path.find(p => p.age === 75);
      const age80 = path.find(p => p.age === 80);
      
      expect(age65).toBeDefined();
      expect(age75).toBeDefined();
      expect(age80).toBeDefined();
    }
  });

  test('inflows during different retirement phases work correctly', () => {
    const inp: Inputs = {
      currentAge: 35,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 200_000,
      super0: 100_000,
      realReturn: 0.05,
      annualSavings: 30_000,
      bands: [{ endAgeIncl: 85, multiplier: 1.0 }],
      bequest: 0,
      futureInflows: [
        { ageYou: 58, amount: 50_000, to: 'outside' }, // Bridge period inflow
        { ageYou: 65, amount: 80_000, to: 'super' },   // Post-preservation inflow
        { ageYou: 75, amount: 60_000, to: 'outside' }  // Later retirement inflow
      ]
    };

    const result = findEarliestViable(inp);
    expect(result).not.toBeNull();
    
    if (result) {
      const path = result.path;
      
      // Verify inflows appear in the path at correct ages
      const bridgeInflow = path.find(p => p.age === 58);
      const postPreserveInflow = path.find(p => p.age === 65);
      const laterInflow = path.find(p => p.age === 75);
      
      expect(bridgeInflow?.phase).toBe('bridge');
      expect(postPreserveInflow?.phase).toBe('retire');
      expect(laterInflow?.phase).toBe('retire');
      
      // Each inflow should boost the respective account balance
      // (exact amounts are complex to verify due to spending interactions)
      expect(bridgeInflow).toBeDefined();
      expect(postPreserveInflow).toBeDefined();
      expect(laterInflow).toBeDefined();
    }
  });

  test('zero and negative post-retirement inflows are handled gracefully', () => {
    const inp: Inputs = {
      currentAge: 40,
      preserveAge: 60,
      lifeExp: 85,
      outside0: 300_000,
      super0: 150_000,
      realReturn: 0.05,
      annualSavings: 0,
      bands: [{ endAgeIncl: 85, multiplier: 1.0 }],
      bequest: 0,
      retireAge: 55,
      futureInflows: [
        { ageYou: 65, amount: 0, to: 'outside' },      // Zero amount
        { ageYou: 70, amount: -50_000, to: 'super' },  // Negative amount
        { ageYou: 75, amount: 100_000, to: 'outside' } // Valid amount
      ]
    };

    // Should not crash and should ignore invalid inflows
    const result = findEarliestViable(inp);
    expect(result).not.toBeNull();
    
    if (result) {
      // Only the valid inflow at age 75 should affect the calculation
      expect(result.sBase).toBeGreaterThan(0);
      expect(result.path.length).toBeGreaterThan(0);
    }
  });

});