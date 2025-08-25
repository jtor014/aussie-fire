import { describe, test, expect } from 'vitest';
import { COUPLES_PLAN_DEFAULT, SINGLE_PLAN_DEFAULT } from '../constants/defaults';

// Helper function that would be exported from App.tsx or a utils file
const computeDefaultPlan = (peopleCount: number): number => {
  return peopleCount >= 2 ? COUPLES_PLAN_DEFAULT : SINGLE_PLAN_DEFAULT;
};

describe('default plan calculation', () => {
  test('couples (2+ people) default to $95,000', () => {
    expect(computeDefaultPlan(2)).toBe(95_000);
    expect(computeDefaultPlan(3)).toBe(95_000);
    expect(computeDefaultPlan(4)).toBe(95_000);
  });

  test('singles default to $60,000', () => {
    expect(computeDefaultPlan(1)).toBe(60_000);
    expect(computeDefaultPlan(0)).toBe(60_000); // edge case
  });

  test('constants are defined correctly', () => {
    expect(COUPLES_PLAN_DEFAULT).toBe(95_000);
    expect(SINGLE_PLAN_DEFAULT).toBe(60_000);
  });
});