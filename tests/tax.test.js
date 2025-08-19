import { test, expect } from 'vitest';
import { calcIncomeTax, getMarginalRate } from "../src/core/tax.js";
import rules from "../src/data/au_rules.json";

// Quick sanity tests for core tax function
test("income tax ~100k with Medicare (no MLS, no HECS)", () => {
  const tax = calcIncomeTax(100000, { hasPrivateHealth: true, hecsDebt: 0 }, rules);
  // Precise calculation: $22,966.485 income tax + $2,000 Medicare levy = $24,966.485
  expect(tax).toBeCloseTo(24966.485, 2);
});

test("marginal rate bands include Medicare", () => {
  expect(getMarginalRate(50000, rules)).toBeCloseTo(0.325 + 0.02, 3);
});

test("no tax under threshold", () => {
  const tax = calcIncomeTax(18200, { hasPrivateHealth: true, hecsDebt: 0 }, rules);
  expect(tax).toBe(0);
});

test("Medicare Levy Surcharge applies without private health", () => {
  const taxWithHealth = calcIncomeTax(100000, { hasPrivateHealth: true, hecsDebt: 0 }, rules);
  const taxWithoutHealth = calcIncomeTax(100000, { hasPrivateHealth: false, hecsDebt: 0 }, rules);
  expect(taxWithoutHealth).toBeGreaterThan(taxWithHealth);
});

test("HECS repayment applies correctly", () => {
  const taxNoHecs = calcIncomeTax(100000, { hasPrivateHealth: true, hecsDebt: 0 }, rules);
  const taxWithHecs = calcIncomeTax(100000, { hasPrivateHealth: true, hecsDebt: 50000 }, rules);
  expect(taxWithHecs).toBeGreaterThan(taxNoHecs);
});