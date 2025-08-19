import { test, expect } from "vitest";
import { mkPartner, mkHousehold } from "../src/models/shapes";
import { projectCouple } from "../src/core/household";
import rules from "../src/data/au_rules.json";

const ass = { returnRate: 0.05, swr: 3.5, showInTodaysDollars: true };

test("couple grows wealth while at least one partner works", () => {
  const A = mkPartner({ currentAge: 30, retireAge: 50, income: 120000, liquidStart: 50000, superStart: 80000 });
  const B = mkPartner({ currentAge: 28, retireAge: 55, income: 90000,  liquidStart: 30000, superStart: 60000 });
  const hh = mkHousehold({ partners: [A,B], annualExpenses: 70000 });

  const { series } = projectCouple({ household: hh, assumptions: ass, rules });
  expect(series[0].totalWealth).toBeGreaterThan(0);
  // Check monotonic-ish growth early on
  expect(series[5].totalWealth).toBeGreaterThan(series[0].totalWealth);
});

test("bridge is required when earliest retirement < preservation", () => {
  const A = mkPartner({ currentAge: 30, retireAge: 40, income: 100000, liquidStart: 0, superStart: 100000 });
  const B = mkPartner({ currentAge: 30, retireAge: 45, income: 100000, liquidStart: 0, superStart: 100000 });
  const hh = mkHousehold({ partners: [A,B], annualExpenses: 60000 });
  const { summary } = projectCouple({ household: hh, assumptions: ass, rules });
  expect(summary.bridge.needsBridge).toBe(true);
});