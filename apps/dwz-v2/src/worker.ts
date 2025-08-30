/// <reference lib="webworker" />
import { findEarliestViable, optimizeSavingsSplit, findEarliestAgeForPlan, optimizeSavingsSplitForPlan } from "dwz-core";
import type { Inputs, Bands, Household, Assumptions } from "dwz-core";
import { toCoreInput } from "./worker/toCoreInput";

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


function handleComputeDecision(msg: Extract<WorkerMessage, { type: 'COMPUTE_DECISION' }>) {
  const inp = toCoreInput(msg.household, msg.assumptions); // ⭐ Now preserves futureInflows
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
  const inp = toCoreInput(msg.household, msg.assumptions); // ⭐ Now preserves futureInflows
  const result = optimizeSavingsSplit(inp, msg.policy);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}

function handleEarliestAgeForPlan(msg: Extract<WorkerMessage, { type: 'EARLIEST_AGE_FOR_PLAN' }>) {
  const baseInput = toCoreInput(msg.household, msg.assumptions); // ⭐ Now preserves futureInflows
  const result = findEarliestAgeForPlan(baseInput, msg.plan);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}

function handleOptimizeSplitForPlan(msg: Extract<WorkerMessage, { type: 'OPTIMIZE_SPLIT_FOR_PLAN' }>) {
  const baseInput = toCoreInput(msg.household, msg.assumptions); // ⭐ Now preserves futureInflows
  const result = optimizeSavingsSplitForPlan(baseInput, msg.plan, msg.policy, msg.opts);
  
  (self as any).postMessage({ id: msg.id, ok: true, result });
}