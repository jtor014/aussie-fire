import { describe, it, expect } from 'vitest';
import { dwzFromSingleState, maxSpendDWZSingle, earliestFireAgeDWZSingle } from '../src/core/dwz_single.js';

const assumptions = { nominalReturnOutside: 0.06, nominalReturnSuper: 0.06, inflation: 0.025 };
const rules = { preservation_age: 60 };

describe('DWZ single', () => {
  it('monotone: later retirement => >= spend', () => {
    const p = dwzFromSingleState({ currentAge: 30, liquidStart: 100_000, superStart: 200_000, income: 100_000 }, assumptions, rules);
    const w50 = maxSpendDWZSingle(p, 50, 90);
    const w55 = maxSpendDWZSingle(p, 55, 90);
    expect(w55).toBeGreaterThanOrEqual(w50 - 1e-6);
  });
  it('earliest FIRE returns an age or null', () => {
    const p = dwzFromSingleState({ currentAge: 30, liquidStart: 50_000, superStart: 100_000, income: 100_000 }, assumptions, rules);
    const age = earliestFireAgeDWZSingle(p, 40_000, 90);
    expect(age === null || (age >= 30 && age < 90)).toBe(true);
  });
});