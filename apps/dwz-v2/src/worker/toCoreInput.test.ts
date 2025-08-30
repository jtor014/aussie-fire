import { describe, test, expect } from 'vitest';
import { toCoreInput } from './toCoreInput';
import type { Household, Assumptions } from 'dwz-core';

describe('toCoreInput', () => {
  const mockHousehold: Household = {
    p1: { age: 30, income: 100000, outside: 50000, superBal: 30000, salary: 100000, sgRate: 0.12 },
    p2: { age: 32, income: 80000, outside: 40000, superBal: 25000, salary: 80000, sgRate: 0.12 },
    targetSpend: 60000,
    lifeExp: 90,
    annualSavings: 40000
  };

  const mockAssumptions: Assumptions = {
    realReturn: 0.05,
    fees: 0.005,
    bequest: 0,
    bands: [{ from: 0, to: 90, m: 1.0 }]
  };

  test('preserves futureInflows field', () => {
    const householdWithInflows: Household = {
      ...mockHousehold,
      futureInflows: [
        { ageYou: 55, amount: 600000, to: 'outside' as const }
      ]
    };

    const core = toCoreInput(householdWithInflows, mockAssumptions);
    
    expect(core.futureInflows).toBeDefined();
    expect(core.futureInflows?.length).toBe(1);
    expect(core.futureInflows?.[0]?.amount).toBe(600000);
    expect(core.futureInflows?.[0]?.ageYou).toBe(55);
    expect(core.futureInflows?.[0]?.to).toBe('outside');
  });

  test('handles undefined futureInflows gracefully', () => {
    const core = toCoreInput(mockHousehold, mockAssumptions);
    expect(core.futureInflows).toBeUndefined();
  });

  test('preserves empty futureInflows array', () => {
    const householdWithEmptyInflows: Household = {
      ...mockHousehold,
      futureInflows: []
    };

    const core = toCoreInput(householdWithEmptyInflows, mockAssumptions);
    expect(core.futureInflows).toEqual([]);
  });

  test('preserves multiple futureInflows with different destinations', () => {
    const householdWithMultipleInflows: Household = {
      ...mockHousehold,
      futureInflows: [
        { ageYou: 45, amount: 100000, to: 'outside' },
        { ageYou: 50, amount: 200000, to: 'super' },
        { ageYou: 55, amount: 50000 } // no 'to' field, should preserve as-is
      ]
    };

    const core = toCoreInput(householdWithMultipleInflows, mockAssumptions);
    
    expect(core.futureInflows).toBeDefined();
    expect(core.futureInflows?.length).toBe(3);
    
    // First inflow
    expect(core.futureInflows?.[0]?.ageYou).toBe(45);
    expect(core.futureInflows?.[0]?.amount).toBe(100000);
    expect(core.futureInflows?.[0]?.to).toBe('outside');
    
    // Second inflow
    expect(core.futureInflows?.[1]?.ageYou).toBe(50);
    expect(core.futureInflows?.[1]?.amount).toBe(200000);
    expect(core.futureInflows?.[1]?.to).toBe('super');
    
    // Third inflow (no 'to' field)
    expect(core.futureInflows?.[2]?.ageYou).toBe(55);
    expect(core.futureInflows?.[2]?.amount).toBe(50000);
    expect(core.futureInflows?.[2]?.to).toBeUndefined();
  });

  test('correctly converts household structure to solver input', () => {
    const core = toCoreInput(mockHousehold, mockAssumptions);
    
    // Test basic conversions
    expect(core.currentAge).toBe(32); // max of 30, 32
    expect(core.preserveAge).toBe(60); // default min
    expect(core.outside0).toBe(90000); // 50k + 40k
    expect(core.super0).toBe(55000); // 30k + 25k
    expect(core.employerSGGross).toBe(21600); // (100k * 0.12) + (80k * 0.12)
    expect(core.annualSavings).toBe(40000);
    expect(core.lifeExp).toBe(90);
  });

  test('preserves preFireSavingsSplit when present', () => {
    const householdWithSplit: Household = {
      ...mockHousehold,
      preFireSavingsSplit: {
        toSuperPct: 0.7,
        capPerPerson: 30000,
        eligiblePeople: 2,
        contribTaxRate: 0.15
      }
    };

    const core = toCoreInput(householdWithSplit, mockAssumptions);
    expect(core.preFireSavingsSplit).toBeDefined();
    expect(core.preFireSavingsSplit?.toSuperPct).toBe(0.7);
  });

  test('converts bands format correctly', () => {
    const assumptionsWithBands: Assumptions = {
      ...mockAssumptions,
      bands: [
        { from: 0, to: 65, m: 1.2 },
        { from: 65, to: 75, m: 1.0 },
        { from: 75, to: 90, m: 0.8 }
      ]
    };

    const core = toCoreInput(mockHousehold, assumptionsWithBands);
    expect(core.bands).toEqual([
      { endAgeIncl: 64, multiplier: 1.2 }, // to: 65 -> endAgeIncl: 64
      { endAgeIncl: 74, multiplier: 1.0 },
      { endAgeIncl: 89, multiplier: 0.8 }
    ]);
  });
});