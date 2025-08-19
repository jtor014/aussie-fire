import { describe, it, expect } from 'vitest';
import { dwzPersonFromState, maxSpendDWZCouple, earliestFireAgeDWZCouple } from '../src/core/dwz_couples.js';

const assumptions = { nominalReturnOutside: 0.06, nominalReturnSuper: 0.06, inflation: 0.025 };
const rules = { preservation_age: 60 };

describe('DWZ couples', () => {
  const A = { currentAge: 30, liquidStart: 100_000, superStart: 200_000, income: 110_000 };
  const B = { currentAge: 28, liquidStart: 60_000, superStart: 120_000, income: 80_000 };
  it('computes a positive sustainable spend by 55', () => {
    const pA = dwzPersonFromState(A, assumptions, rules);
    const pB = dwzPersonFromState(B, assumptions, rules);
    expect(maxSpendDWZCouple(pA, pB, 55, 90)).toBeGreaterThan(0);
  });
  it('earliest FIRE age exists or null (feasibility)', () => {
    const pA = dwzPersonFromState(A, assumptions, rules);
    const pB = dwzPersonFromState(B, assumptions, rules);
    const age = earliestFireAgeDWZCouple(pA, pB, 60_000, 90);
    expect(age === null || (age >= 30 && age < 90)).toBe(true);
  });
});