import { Inputs, findEarliestViable } from '../solver';
import { SavingsSplitResult, SavingsSplitConstraints, SavingsSplitSensitivityPoint } from '../types';

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