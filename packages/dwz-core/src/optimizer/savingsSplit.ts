import { Inputs, findEarliestViable } from '../solver';
import { SavingsSplitResult, SavingsSplitConstraints, SavingsSplitSensitivityPoint } from '../types';
import { findEarliestAgeForPlan } from '../planning/earliestForPlan';

type Eval = { earliestAge: number; spend: number; constraints: SavingsSplitConstraints };

export interface OptimizeOptions {
  gridPoints?: number;      // coarse grid resolution
  refineIters?: number;     // local refinement iterations
  window?: number;          // +/- window for refinement
}

export function optimizeSavingsSplit(
  baseInput: Inputs,
  policy: { capPerPerson: number; eligiblePeople: number; contribTaxRate?: number; maxPct?: number },
  opts: OptimizeOptions = {}
): SavingsSplitResult {
  const gridPoints = Math.max(5, opts.gridPoints ?? 21);
  const refineIters = Math.max(0, opts.refineIters ?? 2);
  const window = Math.max(0.02, opts.window ?? 0.15);
  const maxPct = Math.min(1, Math.max(0, policy.maxPct ?? 1));
  const contribTaxRate = policy.contribTaxRate ?? 0.15;

  const memo = new Map<number, Eval>();
  let evals = 0;

  const evalAt = (pctRaw: number): Eval => {
    const pct = clamp(round4(Math.min(maxPct, Math.max(0, pctRaw))), 0, 1);
    const hit = memo.get(pct);
    if (hit) return hit;
    
    // Create modified input with savings split
    const input: Inputs = {
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: pct,
        capPerPerson: policy.capPerPerson,
        eligiblePeople: policy.eligiblePeople,
        contribTaxRate: contribTaxRate
      }
    };
    
    const result = findEarliestViable(input);
    
    const constraints: SavingsSplitConstraints = {
      capPerPerson: policy.capPerPerson,
      eligiblePeople: policy.eligiblePeople,
      capTotal: policy.capPerPerson * policy.eligiblePeople,
      contribTaxRate
    };
    
    const res: Eval = {
      earliestAge: result?.retireAge ?? Infinity,
      spend: result?.sBase ?? 0,
      constraints
    };
    memo.set(pct, res);
    evals++;
    return res;
  };

  // coarse grid search
  let bestPct = 0;
  let bestEval = evalAt(0);
  for (let i = 0; i <= gridPoints; i++) {
    const pct = (i / gridPoints) * maxPct;
    const e = evalAt(pct);
    if (e.earliestAge < bestEval.earliestAge) {
      bestEval = e;
      bestPct = clamp(pct, 0, 1);
    }
  }

  // local refinement around best
  let lo = Math.max(0, bestPct - window);
  let hi = Math.min(maxPct, bestPct + window);
  for (let r = 0; r < refineIters; r++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const e1 = evalAt(m1);
    const e2 = evalAt(m2);
    if (e1.earliestAge <= e2.earliestAge) {
      hi = m2;
      if (e1.earliestAge < bestEval.earliestAge) {
        bestEval = e1; bestPct = clamp(m1, 0, 1);
      }
    } else {
      lo = m1;
      if (e2.earliestAge < bestEval.earliestAge) {
        bestEval = e2; bestPct = clamp(m2, 0, 1);
      }
    }
  }

  // sensitivity band
  const sensPcts = Array.from(new Set([
    clamp(bestPct - 0.10, 0, maxPct),
    clamp(bestPct - 0.05, 0, maxPct),
    bestPct,
    clamp(bestPct + 0.05, 0, maxPct),
    clamp(bestPct + 0.10, 0, maxPct)
  ])).sort((a,b) => a-b);
  const sensitivity = sensPcts.map(p => ({ pct: p, earliestAge: evalAt(p).earliestAge }));

  // cap binding at optimum?
  const capBindingAtOpt = ((baseInput.annualSavings || 0) * bestPct) > (policy.capPerPerson * policy.eligiblePeople + 1e-9);

  return {
    recommendedPct: bestPct,
    earliestAge: bestEval.earliestAge,
    dwzSpend: bestEval.spend,
    sensitivity,
    constraints: { ...bestEval.constraints, capBindingAtOpt },
    evals
  };
}

function clamp(x: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, x)); }
function round4(x: number) { return Math.round(x * 1e4) / 1e4; }

// Plan-first optimizer: minimize earliest age for a given plan spend
export interface SavingsSplitForPlanResult extends SavingsSplitResult {
  objective: 'earliestAgeForPlan';
  plan: number;
}

export function optimizeSavingsSplitForPlan(
  baseInput: Inputs,
  plan: number,
  policy: { capPerPerson: number; eligiblePeople: number; contribTaxRate?: number; maxPct?: number },
  opts: OptimizeOptions = {}
): SavingsSplitForPlanResult {
  const gridPoints = Math.max(5, opts.gridPoints ?? 19);
  const refineIters = Math.max(0, opts.refineIters ?? 2);
  const window = Math.max(0.02, opts.window ?? 0.15);
  const maxPct = Math.min(1, Math.max(0, policy.maxPct ?? 1));
  const contribTaxRate = policy.contribTaxRate ?? 0.15;

  type PlanEval = { earliestAge: number | null; atAgeSpend?: number; constraints: SavingsSplitConstraints };
  const memo = new Map<number, PlanEval>();
  let evals = 0;
  // Track a rolling best age to use as a high bound hint for later evaluations
  let bestAgeHint: number | undefined = undefined;

  const evalAt = (pctRaw: number): PlanEval => {
    const pct = clamp(round4(Math.min(maxPct, Math.max(0, pctRaw))), 0, 1);
    const hit = memo.get(pct);
    if (hit) return hit;
    
    const input: Inputs = {
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: pct,
        capPerPerson: policy.capPerPerson,
        eligiblePeople: policy.eligiblePeople,
        contribTaxRate
      }
    };
    
    const res = findEarliestAgeForPlan(input, plan, { hiAgeHint: bestAgeHint });
    evals += res.evaluations;
    
    const constraints: SavingsSplitConstraints = {
      capPerPerson: policy.capPerPerson,
      eligiblePeople: policy.eligiblePeople,
      capTotal: policy.capPerPerson * policy.eligiblePeople,
      contribTaxRate
    };
    
    const out = { earliestAge: res.earliestAge, atAgeSpend: res.atAgeSpend, constraints };
    memo.set(pct, out);
    
    // If feasible, tighten hint
    if (res.earliestAge != null) {
      bestAgeHint = bestAgeHint == null ? res.earliestAge : Math.min(bestAgeHint, res.earliestAge);
    }
    
    return out;
  };

  // If plan is non-positive, early return
  if (!(Number.isFinite(plan) && plan > 0)) {
    return {
      objective: 'earliestAgeForPlan',
      plan,
      recommendedPct: 0,
      earliestAge: Infinity,
      dwzSpend: 0,
      sensitivity: [],
      constraints: {
        capPerPerson: policy.capPerPerson,
        eligiblePeople: policy.eligiblePeople,
        capTotal: policy.capPerPerson * policy.eligiblePeople,
        contribTaxRate,
        capBindingAtOpt: false
      },
      evals: 0
    };
  }

  // Coarse grid search
  let bestPct = 0;
  let bestEval = evalAt(0);
  for (let i = 0; i <= gridPoints; i++) {
    const pct = (i / gridPoints) * maxPct;
    const e = evalAt(pct);
    if (e.earliestAge != null && (bestEval.earliestAge == null || e.earliestAge < bestEval.earliestAge)) {
      bestEval = e;
      bestPct = clamp(pct, 0, 1);
      // Newly improved best age further tightens future searches
      bestAgeHint = e.earliestAge;
    }
  }

  // If never achievable, return not-achievable
  if (bestEval.earliestAge == null) {
    return {
      objective: 'earliestAgeForPlan',
      plan,
      recommendedPct: 0,
      earliestAge: Infinity,
      dwzSpend: 0,
      sensitivity: [],
      constraints: {
        capPerPerson: policy.capPerPerson,
        eligiblePeople: policy.eligiblePeople,
        capTotal: policy.capPerPerson * policy.eligiblePeople,
        contribTaxRate,
        capBindingAtOpt: false
      },
      evals
    };
  }

  // Local refinement using ternary search
  let lo = Math.max(0, bestPct - window);
  let hi = Math.min(maxPct, bestPct + window);
  for (let r = 0; r < refineIters; r++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const e1 = evalAt(m1);
    const e2 = evalAt(m2);
    const v1 = e1.earliestAge ?? Infinity;
    const v2 = e2.earliestAge ?? Infinity;
    if (v1 <= v2) { 
      hi = m2; 
      if (v1 < (bestEval.earliestAge ?? Infinity)) { 
        bestEval = e1; 
        bestPct = clamp(m1, 0, 1); 
      } 
    } else { 
      lo = m1; 
      if (v2 < (bestEval.earliestAge ?? Infinity)) { 
        bestEval = e2; 
        bestPct = clamp(m2, 0, 1); 
      } 
    }
  }

  // Sensitivity analysis - ensure we get 5 distinct points
  const sensPoints = [
    bestPct - 0.10,
    bestPct - 0.05,
    bestPct,
    bestPct + 0.05,
    bestPct + 0.10
  ].map(p => clamp(p, 0, maxPct));
  
  // Deduplicate while preserving order preference
  const sensPcts: number[] = [];
  for (const p of sensPoints) {
    if (!sensPcts.some(existing => Math.abs(existing - p) < 0.001)) {
      sensPcts.push(p);
    }
  }
  
  // If we have fewer than 5 points due to clamping, add intermediate points
  while (sensPcts.length < 5) {
    const gaps: { idx: number; gap: number }[] = [];
    for (let i = 0; i < sensPcts.length - 1; i++) {
      gaps.push({ idx: i, gap: sensPcts[i + 1] - sensPcts[i] });
    }
    if (gaps.length === 0) break;
    gaps.sort((a, b) => b.gap - a.gap);
    const biggest = gaps[0];
    const newPct = (sensPcts[biggest.idx] + sensPcts[biggest.idx + 1]) / 2;
    sensPcts.splice(biggest.idx + 1, 0, newPct);
    sensPcts.sort((a, b) => a - b);
  }
  
  const sensitivity = sensPcts.map(p => ({
    pct: p,
    earliestAge: evalAt(p).earliestAge ?? Infinity
  }));

  const capBindingAtOpt = (baseInput.annualSavings * bestPct) > (policy.capPerPerson * policy.eligiblePeople + 1e-9);

  return {
    objective: 'earliestAgeForPlan',
    plan,
    recommendedPct: bestPct,
    earliestAge: bestEval.earliestAge ?? Infinity,
    dwzSpend: bestEval.atAgeSpend ?? 0,
    sensitivity,
    constraints: { ...bestEval.constraints, capBindingAtOpt },
    evals
  };
}