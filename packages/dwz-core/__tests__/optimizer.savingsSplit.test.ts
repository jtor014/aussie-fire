import { describe, test, expect, vi } from 'vitest';
import { optimizeSavingsSplit } from '../src/optimizer/savingsSplit';
import { findEarliestViable } from '../src/solver';
import { Inputs } from '../src/types';

// Mock the solver to create predictable optimization behavior
vi.mock('../src/solver', () => ({
  findEarliestViable: vi.fn()
}));

describe('optimizeSavingsSplit', () => {
  const baseInput: Inputs = {
    currentAge: 40,
    preserveAge: 60,
    lifeExp: 92,
    outside0: 100_000,
    super0: 150_000,
    annualSavings: 30_000,
    realReturn: 0.04,
    bands: [
      { endAgeIncl: 60, multiplier: 1.10 },
      { endAgeIncl: 75, multiplier: 1.00 },
      { endAgeIncl: 120, multiplier: 0.85 }
    ],
    bequest: 0
  };

  test('finds an interior optimum and returns sensitivity', () => {
    // Mock shape: earliestAge is convex with minimum near 0.6
    (findEarliestViable as any).mockImplementation((input: Inputs) => {
      const p = input.preFireSavingsSplit?.toSuperPct ?? 0;
      const f = 60 + Math.pow(p - 0.6, 2) * 40; // minimum ~60 at p=0.6
      return {
        retireAge: Math.round(f),
        sBase: 65000 + p * 1000,
        bridge: { years: 0, needPV: 0, have: 0, covered: true },
        path: []
      };
    });

    const res = optimizeSavingsSplit(baseInput, {
      capPerPerson: 30_000,
      eligiblePeople: 2,
      contribTaxRate: 0.15
    }, { gridPoints: 21, refineIters: 2 });

    expect(res.recommendedPct).toBeGreaterThan(0.4);
    expect(res.recommendedPct).toBeLessThan(0.8);
    expect(res.earliestAge).toBeLessThan(61);
    expect(res.sensitivity.length).toBeGreaterThanOrEqual(3);
    expect(res.evals).toBeLessThanOrEqual(21 + 2 * 3 + 10); // coarse bound
  });

  test('respects maximum percentage constraint', () => {
    (findEarliestViable as any).mockImplementation((input: Inputs) => {
      const p = input.preFireSavingsSplit?.toSuperPct ?? 0;
      return {
        retireAge: 65 - p * 10, // lower retirement age with higher super %
        sBase: 50000,
        bridge: { years: 0, needPV: 0, have: 0, covered: true },
        path: []
      };
    });

    const res = optimizeSavingsSplit(baseInput, {
      capPerPerson: 15_000, // low cap
      eligiblePeople: 1,
      contribTaxRate: 0.15,
      maxPct: 0.5 // limit to 50%
    });

    expect(res.recommendedPct).toBeLessThanOrEqual(0.5);
    expect(res.constraints.capTotal).toBe(15_000);
  });

  test('handles edge case with zero savings', () => {
    const zeroSavingsInput = { ...baseInput, annualSavings: 0 };
    
    (findEarliestViable as any).mockImplementation(() => ({
      retireAge: 65,
      sBase: 40000,
      bridge: { years: 5, needPV: 100000, have: 100000, covered: true },
      path: []
    }));

    const res = optimizeSavingsSplit(zeroSavingsInput, {
      capPerPerson: 30_000,
      eligiblePeople: 1,
      contribTaxRate: 0.15
    });

    expect(res.recommendedPct).toBe(0); // should default to 0% when no savings
    expect(res.earliestAge).toBe(65);
  });
});