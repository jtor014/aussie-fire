/// <reference lib="webworker" />
import { findEarliestViable, optimizeSavingsSplit, findEarliestAgeForPlan, optimizeSavingsSplitForPlan } from "dwz-core";
import type { Inputs, Bands, Household, Assumptions } from "dwz-core";

type WorkerMessage = 
  | { id: number; type: 'COMPUTE_DECISION'; household: Household; assumptions: Assumptions; forceRetireAge?: number }
  | { id: number; type: 'OPTIMIZE_SAVINGS_SPLIT'; household: Household; assumptions: Assumptions; policy: { capPerPerson: number; eligiblePeople: number; contribTaxRate?: number; maxPct?: number } }
  | { id: number; type: 'EARLIEST_AGE_FOR_PLAN'; household: Household; assumptions: Assumptions; plan: number }
  | { id: number; type: 'OPTIMIZE_SPLIT_FOR_PLAN'; household: Household; assumptions: Assumptions; plan: number; policy: { capPerPerson: number; eligiblePeople: number; contribTaxRate?: number; outsideTaxRate?: number; maxPct?: number }; opts?: { gridPoints?: number; refineIters?: number; window?: number } };

self.addEventListener("message", (e: MessageEvent) => {
  const msg = e.data as WorkerMessage;
  
  try {
    if (msg.type === 'COMPUTE_DECISION') {
      handleComputeDecision(msg);
    } else if (msg.type === 'OPTIMIZE_SAVINGS_SPLIT') {
      handleOptimizeSavingsSplit(msg);
    } else if (msg.type === 'EARLIEST_AGE_FOR_PLAN') {
      handleEarliestAgeForPlan(msg);
    } else if (msg.type === 'OPTIMIZE_SPLIT_FOR_PLAN') {
      handleOptimizeSplitForPlan(msg);
    }
  } catch (err: any) {
    (self as any).postMessage({ id: msg.id, ok: false, error: String(err?.message || err) });
  }
});

function convertToSolverInput(household: Household, assumptions: Assumptions): Inputs {
  const currentAge = Math.max(household.p1.age, household.p2?.age ?? -Infinity);
  const preserveAge = Math.min(household.p1.preserveAge ?? 60, household.p2?.preserveAge ?? 60);
  const outside0 = household.p1.outside + (household.p2?.outside ?? 0);
  const super0 = household.p1.superBal + (household.p2?.superBal ?? 0);

  // Convert bands format from {from, to, m} to {endAgeIncl, multiplier}
  const bands: Bands = (assumptions.bands || []).map((b: any) => ({
    endAgeIncl: b.to - 1, // convert from exclusive 'to' to inclusive 'endAgeIncl'
    multiplier: b.m
  }));

  return {
    currentAge,
    preserveAge,
    lifeExp: household.lifeExp,
    outside0,
    super0,
    realReturn: assumptions.realReturn,
    annualSavings: household.annualSavings || 0,
    bands,
    bequest: assumptions.bequest || 0,
    preFireSavingsSplit: household.preFireSavingsSplit
  };
}

function handleComputeDecision(msg: Extract<WorkerMessage, { type: 'COMPUTE_DECISION' }>) {
  const inp = convertToSolverInput(msg.household, msg.assumptions);
  // Apply forced retirement age if provided
  const inputWithRetireAge = msg.forceRetireAge ? { ...inp, retireAge: msg.forceRetireAge } : inp;
  const solverResult = findEarliestViable(inputWithRetireAge);
  
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
    
    (self as any).postMessage({ id: msg.id, ok: true, result });
  } else {
    (self as any).postMessage({ id: msg.id, ok: false, error: "No viable retirement age found" });
  }
}

function handleOptimizeSavingsSplit(msg: Extract<WorkerMessage, { type: 'OPTIMIZE_SAVINGS_SPLIT' }>) {
  const inp = convertToSolverInput(msg.household, msg.assumptions);
  const result = optimizeSavingsSplit(inp, msg.policy);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}

function handleEarliestAgeForPlan(msg: Extract<WorkerMessage, { type: 'EARLIEST_AGE_FOR_PLAN' }>) {
  const baseInput = convertToSolverInput(msg.household, msg.assumptions);
  const result = findEarliestAgeForPlan(baseInput, msg.plan);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}

function handleOptimizeSplitForPlan(msg: Extract<WorkerMessage, { type: 'OPTIMIZE_SPLIT_FOR_PLAN' }>) {
  const baseInput = convertToSolverInput(msg.household, msg.assumptions);
  const result = optimizeSavingsSplitForPlan(baseInput, msg.plan, msg.policy, msg.opts);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}