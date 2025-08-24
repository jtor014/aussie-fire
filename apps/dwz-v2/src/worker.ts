/// <reference lib="webworker" />
import { findEarliestViable, Inputs, Bands, type Household, type Assumptions } from "dwz-core";

self.addEventListener("message", (e: MessageEvent) => {
  const { id, household, assumptions } = e.data as { id: number; household: Household; assumptions: Assumptions };
  
  try {
    // Convert to solver input format
    const currentAge = Math.max(household.p1.age, household.p2?.age ?? -Infinity);
    const preserveAge = Math.min(household.p1.preserveAge ?? 60, household.p2?.preserveAge ?? 60);
    const outside0 = household.p1.outside + (household.p2?.outside ?? 0);
    const super0 = household.p1.superBal + (household.p2?.superBal ?? 0);

    // Convert bands format from {from, to, m} to {endAgeIncl, multiplier}
    const bands: Bands = (assumptions.bands || []).map((b: any) => ({
      endAgeIncl: b.to - 1, // convert from exclusive 'to' to inclusive 'endAgeIncl'
      multiplier: b.m
    }));

    const inp: Inputs = {
      currentAge,
      preserveAge,
      lifeExp: household.lifeExp,
      outside0,
      super0,
      realReturn: assumptions.realReturn,
      annualSavings: household.annualSavings || 0,
      bands,
      bequest: assumptions.bequest || 0
    };

    const solverResult = findEarliestViable(inp);
    
    if (solverResult) {
      // Convert back to expected format
      const result = {
        sustainableAnnual: solverResult.sBase,
        earliest: { theoretical: solverResult.retireAge, viable: solverResult.retireAge },
        bridge: {
          status: solverResult.bridge.covered ? "covered" : "short",
          years: solverResult.bridge.years,
          need: solverResult.bridge.needPV,
          have: solverResult.bridge.have
        },
        path: solverResult.path.map(p => ({
          age: p.age,
          outside: p.outside,
          superBal: p.super,
          total: p.total,
          phase: "flat", // keep for compatibility
          lifecyclePhase: p.phase
        })),
        recommendedSplit: { salarySacrifice: 0, outside: 0, note: "Stub: split optimization to be implemented (T-R2)" }
      };
      
      (self as any).postMessage({ id, ok: true, result });
    } else {
      (self as any).postMessage({ id, ok: false, error: "No viable retirement age found" });
    }
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: String(err?.message || err) });
  }
});