import { test, expect } from 'vitest';
import { calcSuperContribs } from "../src/core/super.js";
import rules from "../src/data/au_rules.json";

test("basic super contribution calculation", () => {
  const result = calcSuperContribs(100000, 0, 0, rules);
  expect(result.employer).toBe(12000); // 12% of 100k
  expect(result.additional).toBe(0);
  expect(result.total).toBe(12000);
  expect(result.net).toBe(12000);
  expect(result.isOverCap).toBe(false);
  expect(result.cap).toBe(30000);
});

test("super contribution with additional", () => {
  const result = calcSuperContribs(100000, 10000, 0, rules);
  expect(result.employer).toBe(12000);
  expect(result.additional).toBe(10000);
  expect(result.total).toBe(22000);
  expect(result.remainingCap).toBe(8000);
  expect(result.isOverCap).toBe(false);
});

test("super contribution over cap", () => {
  const result = calcSuperContribs(100000, 25000, 0, rules);
  expect(result.total).toBe(37000);
  expect(result.isOverCap).toBe(true);
  expect(result.remainingCap).toBe(0);
});

test("super contribution with insurance", () => {
  const result = calcSuperContribs(100000, 10000, 2000, rules);
  expect(result.total).toBe(22000);
  expect(result.net).toBe(20000); // 22000 - 2000 insurance
});

test("high income SG cap applies", () => {
  const result = calcSuperContribs(300000, 0, 0, rules);
  // SG capped at $260,280 * 12% = $31,233.60
  expect(result.employer).toBeCloseTo(31233.6, 1);
  expect(result.isOverCap).toBe(true); // Because it exceeds $30k cap
});