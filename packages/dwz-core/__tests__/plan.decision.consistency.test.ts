import { describe, test, expect } from 'vitest';
import { findEarliestAgeForPlan } from '../src/planning/earliestForPlan';
import { findEarliestViable } from '../src/solver';
import { optimizeSavingsSplitForPlan } from '../src/optimizer/savingsSplit';
import type { Inputs } from '../src/types';

const base: Inputs = {
  currentAge: 40,
  preserveAge: 60,
  lifeExp: 90,
  outside0: 120_000,
  super0: 180_000,
  annualSavings: 40_000,
  realReturn: 0.05,
  bands: [
    { endAgeIncl: 59, multiplier: 1.1 },
    { endAgeIncl: 74, multiplier: 1.0 },
    { endAgeIncl: 200, multiplier: 0.85 }
  ],
  bequest: 0,
  // tax-aware split defaults; optimizer/UI may override in app
  preFireSavingsSplit: {
    toSuperPct: 0.5,
    capPerPerson: 30_000,
    eligiblePeople: 2,
    contribTaxRate: 0.15,
    outsideTaxRate: 0.32,
    mode: 'grossDeferral'
  }
};

describe('plan-first and decision solver consistency', () => {
  test('plan-first earliest age is viable when forced with the same input', () => {
    const plan = 95_000; // couples default in UI
    const res = findEarliestAgeForPlan(base, plan);
    expect(res.earliestAge).not.toBeNull();
    
    if (res.earliestAge === null) return; // type guard
    const age = res.earliestAge;

    // Force the same age into findEarliestViable with same input
    const forced = findEarliestViable({ ...base, retireAge: age });
    expect(forced).not.toBeNull();
    
    if (!forced) return; // type guard
    
    // Verify it's actually viable (has a valid path)
    expect(forced.path.length).toBeGreaterThan(0);
    
    // Verify depletion occurs near life expectancy
    const last = forced.path[forced.path.length - 1];
    const total = last.outside + last.super;
    expect(total).toBeGreaterThanOrEqual(-5);  // epsilon tolerance
    expect(total).toBeLessThanOrEqual(5);
    
    // Verify the retirement age matches
    expect(forced.retireAge).toBe(age);
  });

  test('consistency holds across different tax modes', () => {
    // Test with grossDeferral mode
    const grossInput = { ...base };
    const grossPlanRes = findEarliestAgeForPlan(grossInput, 95_000);
    if (grossPlanRes.earliestAge !== null) {
      const grossForced = findEarliestViable({ ...grossInput, retireAge: grossPlanRes.earliestAge });
      expect(grossForced).not.toBeNull();
    }

    // Test with netFixed mode
    const netInput: Inputs = {
      ...base,
      preFireSavingsSplit: {
        ...base.preFireSavingsSplit!,
        mode: 'netFixed'
      }
    };
    const netPlanRes = findEarliestAgeForPlan(netInput, 95_000);
    if (netPlanRes.earliestAge !== null) {
      const netForced = findEarliestViable({ ...netInput, retireAge: netPlanRes.earliestAge });
      expect(netForced).not.toBeNull();
    }
  });

  test('optimizer split recommendation is viable when forced', () => {
    const policy = {
      capPerPerson: 30_000,
      eligiblePeople: 2,
      contribTaxRate: 0.15,
      outsideTaxRate: 0.32,
      maxPct: 1.0
    };
    
    const optimized = optimizeSavingsSplitForPlan(base, 95_000, policy);
    
    if (Number.isFinite(optimized.earliestAge)) {
      // Create input with optimized split
      const optimizedInput: Inputs = {
        ...base,
        preFireSavingsSplit: {
          ...base.preFireSavingsSplit!,
          toSuperPct: optimized.recommendedPct
        }
      };
      
      // Force retirement at optimized age should be viable
      const forced = findEarliestViable({ ...optimizedInput, retireAge: optimized.earliestAge });
      expect(forced).not.toBeNull();
    }
  });
});