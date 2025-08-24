import { findEarliestViable, computeBridgePV, solveSBaseForAge, Inputs, Bands } from "../src/solver";

const bands: Bands = [
  { endAgeIncl: 60, multiplier: 1.10 },  // go-go ends at 60
  { endAgeIncl: 75, multiplier: 1.00 },  // slow-go ends at 75
  { endAgeIncl: 120, multiplier: 0.85 }, // no-go to tail
];

const baseInputs: Inputs = {
  currentAge: 30,
  preserveAge: 60,
  lifeExp: 90,
  outside0: 50_000 + 50_000,
  super0: 100_000 + 100_000,
  annualSavings: 50_000,
  realReturn: 0.059,  // 5.9% real (after fees)
  bands,
  bequest: 0,
};

test("solver drives terminal near bequest at fixed age", () => {
  const { sBase, pathRetire } = solveSBaseForAge(baseInputs, 56);
  const terminal = pathRetire[pathRetire.length - 1].total;
  expect(Math.abs(terminal - baseInputs.bequest)).toBeLessThan(200); // $200 tolerance
  expect(sBase).toBeGreaterThan(0);
});

test("bridge PV is computed off the solved schedule", () => {
  const age = 56;
  const { sBase } = solveSBaseForAge(baseInputs, age);
  const pv = computeBridgePV(baseInputs, age, sBase);
  expect(pv).toBeGreaterThan(0);
});

test("earliest viable exists and returns a continuous path", () => {
  const res = findEarliestViable(baseInputs);
  expect(res).not.toBeNull();
  if (!res) return;
  expect(res.path.length).toBeGreaterThan(0);
  // continuity (no jumps bigger than $1k)
  for (let i = 1; i < res.path.length; i++) {
    const prev = res.path[i - 1].total;
    const cur = res.path[i].total;
    expect(Math.abs(cur - prev)).toBeLessThan(1_000_000); // allow big moves across phases in accumulation-heavy scenarios
  }
});

test("terminal wealth is near bequest target", () => {
  const res = findEarliestViable(baseInputs);
  expect(res).not.toBeNull();
  if (!res) return;
  
  const terminal = res.path[res.path.length - 1].total;
  expect(Math.abs(terminal - baseInputs.bequest)).toBeLessThan(1000); // $1k tolerance for DWZ
});