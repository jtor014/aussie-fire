import { test, expect } from 'vitest';
import { assessBridge } from "../src/core/bridge.js";

test("no bridge needed when retirement after preservation age", () => {
  const result = assessBridge({
    currentAge: 30,
    retirementAge: 65,
    preservationAge: 60,
    currentOutsideSuper: 50000,
    annualOutsideSavings: 10000,
    annualExpenseNeed: 40000,
    returnRate: 0.07
  });
  
  expect(result.needsBridge).toBe(false);
  expect(result.feasible).toBe(true);
  expect(result.bridgeYears).toBe(0);
});

test("bridge period calculation with sufficient funds", () => {
  const result = assessBridge({
    currentAge: 30,
    retirementAge: 55,
    preservationAge: 60,
    currentOutsideSuper: 100000,
    annualOutsideSavings: 20000,
    annualExpenseNeed: 40000,
    returnRate: 0.07
  });
  
  expect(result.needsBridge).toBe(true);
  expect(result.bridgeYears).toBe(5); // 60 - 55
  expect(result.feasible).toBe(true);
  expect(result.shortfall).toBe(0);
});

test("bridge period with shortfall", () => {
  const result = assessBridge({
    currentAge: 40,
    retirementAge: 50,
    preservationAge: 60,
    currentOutsideSuper: 10000,
    annualOutsideSavings: 5000,
    annualExpenseNeed: 50000,
    returnRate: 0.07
  });
  
  expect(result.needsBridge).toBe(true);
  expect(result.bridgeYears).toBe(10); // 60 - 50
  expect(result.feasible).toBe(false);
  expect(result.shortfall).toBeGreaterThan(0);
});

test("die with zero mode affects annual need", () => {
  const normalResult = assessBridge({
    currentAge: 30,
    retirementAge: 55,
    preservationAge: 60,
    currentOutsideSuper: 100000,
    annualOutsideSavings: 20000,
    annualExpenseNeed: 50000,
    returnRate: 0.07,
    dieWithZero: false
  });
  
  const dieWithZeroResult = assessBridge({
    currentAge: 30,
    retirementAge: 55,
    preservationAge: 60,
    currentOutsideSuper: 100000,
    annualOutsideSavings: 20000,
    annualExpenseNeed: 50000,
    returnRate: 0.07,
    dieWithZero: true,
    spendToZeroAnnual: 30000
  });
  
  // Die with zero should need less funds (lower annual need)
  expect(dieWithZeroResult.fundsNeeded).toBeLessThan(normalResult.fundsNeeded);
});

test("already retired scenario", () => {
  const result = assessBridge({
    currentAge: 52,
    retirementAge: 50, // Already retired 2 years ago
    preservationAge: 60,
    currentOutsideSuper: 200000,
    annualOutsideSavings: 0,
    annualExpenseNeed: 40000,
    returnRate: 0.07
  });
  
  expect(result.needsBridge).toBe(true);
  expect(result.bridgeYears).toBe(8); // 60 - 52 (current age when already retired)
  expect(result.fundsAvailable).toBe(200000); // Should use current outside super directly
});