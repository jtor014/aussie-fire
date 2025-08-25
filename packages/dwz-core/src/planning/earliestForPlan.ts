import { findEarliestViable } from '../solver';
import type { EarliestForPlanResult, Inputs } from '../solver';

export function findEarliestAgeForPlan(
  base: Inputs, 
  plan: number, 
  options: { minStep?: number; hiAgeHint?: number } = {}
): EarliestForPlanResult {
  if (!Number.isFinite(plan) || plan <= 0) {
    return { plan, earliestAge: null, evaluations: 0 };
  }
  
  const minAgeNow = base.currentAge + 1;
  // Use optional upper bound hint to shrink the search window
  const maxAgeDefault = Math.max(minAgeNow, base.lifeExp - 1);
  const maxAge = Math.max(minAgeNow, Math.min(options.hiAgeHint ?? maxAgeDefault, maxAgeDefault));
  let lo = Math.floor(minAgeNow);
  let hi = Math.floor(maxAge);
  let evals = 0;

  const feasible = (age: number) => {
    const result = findEarliestViable({ ...base, retireAge: age });
    evals++;
    
    if (!result) {
      return { ok: false, spend: 0 };
    }
    
    // Check if sustainable spend meets or exceeds plan (with small epsilon)
    const ok = result.sBase + 1e-6 >= plan;
    return { ok, spend: result.sBase };
  };

  // If not feasible even at latest possible age, bail out
  const last = feasible(hi);
  if (!last.ok) {
    return { plan, earliestAge: null, evaluations: evals };
  }

  // Binary search for first feasible age
  let ansAge: number | null = null;
  let ansSpend = last.spend;
  
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = feasible(mid);
    
    if (r.ok) {
      ansAge = mid;
      ansSpend = r.spend;
      hi = mid - 1; // Look for earlier age
    } else {
      lo = mid + 1; // Need later age
    }
  }
  
  return { 
    plan, 
    earliestAge: ansAge, 
    atAgeSpend: ansSpend, 
    evaluations: evals 
  };
}