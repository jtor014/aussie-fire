// DWZ v2 — exact tail-to-bequest solver (real dollars, end-of-year points)

export type Bands = Array<{ endAgeIncl: number; multiplier: number }>;

export type Inputs = {
  // current ages (we sum to household-level before optimizer; couples-first)
  currentAge: number;           // household min current age
  preserveAge: number;          // household min preservation age (e.g., 60)
  lifeExp: number;

  // balances today (real)
  outside0: number;
  super0: number;

  // real return (already net of inflation)
  realReturn: number;           // e.g., 0.059

  // savings before retirement (combined) — v2 doesn't optimize split yet
  annualSavings: number;        // goes to outside for now

  // DWZ spending schedule via multipliers
  bands: Bands;

  // bequest target in real dollars (0 for classic DWZ)
  bequest: number;

  // Optional: force retirement to begin when the younger partner reaches this age
  retireAge?: number;

  // Optional pre-FIRE savings split policy
  preFireSavingsSplit?: import('./types.js').PreFireSavingsSplit;
  
  // Optional employer SG gross (combined across all people)
  employerSGGross?: number;

  // Optional future inflows in today's dollars. Applied when 'you' reaches given age.
  futureInflows?: Array<{
    ageYou: number;           // trigger when person 0 (You) reaches this age
    amount: number;           // positive inflow; today's dollars
    to?: 'outside' | 'super'; // default 'outside'
  }>;
};

export type SolverPathPoint = {
  age: number;            // integer age at END of year
  outside: number;        // real dollars
  super: number;          // real dollars
  total: number;          // outside + super
  phase: "accum" | "bridge" | "retire";
};

export type BridgeResult = {
  years: number;          // preserveAge - retireAge (clamped >= 0)
  needPV: number;         // PV at retireAge of bridge spending
  have: number;           // outside at retireAge
  covered: boolean;
};

export type SolveResult = {
  retireAge: number;
  sBase: number;          // sustainable base spending (real $/yr)
  bridge: BridgeResult;
  path: SolverPathPoint[];
};

export type EarliestForPlanResult = {
  plan: number;
  earliestAge: number | null;   // null if not achievable
  atAgeSpend?: number;
  evaluations: number;
};

export function bandMultiplierAt(age: number, bands: Bands): number {
  for (const b of bands) {
    if (age <= b.endAgeIncl) return b.multiplier;
  }
  return bands[bands.length - 1]?.multiplier ?? 1;
}

function annualSpendFor(endOfYearAge: number, sBase: number, bands: Bands): number {
  // Convention: spending for the year (age-1 -> age) is S(age)
  return sBase * bandMultiplierAt(endOfYearAge, bands);
}

function grow(x: number, r: number) {
  return x * (1 + r);
}

/** Accumulate balances from currentAge to retireAge (end-of-year semantics). */
export function accumulateUntil(inp: Inputs, retireAge: number): { path: SolverPathPoint[]; outside: number; super: number; } {
  const path: SolverPathPoint[] = [];
  let age = inp.currentAge;
  let outside = inp.outside0;
  let sup = inp.super0;

  while (age < retireAge) {
    // Add employer SG net (after 15% contrib tax) to super during accumulation
    const employerSGGross = inp.employerSGGross ?? 0;
    if (employerSGGross > 0) {
      const sgNet = Math.round(employerSGGross * (1 - 0.15) * 100) / 100;
      sup += sgNet;
    }

    // Pre-FIRE accumulation (before fees/returns): split annualSavings into outside vs super if configured
    const totalSavings = inp.annualSavings;
    if (totalSavings > 0) {
      const split = inp.preFireSavingsSplit;
      if (split) {
        const pct = Math.min(1, Math.max(0, split.toSuperPct ?? 0));
        const desiredSuperGross = totalSavings * pct;
        // Clamp eligiblePeople to reasonable household size (0-2)
        const eligible = Math.min(2, Math.max(0, split.eligiblePeople || 0));
        // Effective concessional headroom = cap - employer SG gross, clamped >= 0
        const capTotal = Math.max(0, (split.capPerPerson || 0) * eligible - employerSGGross);
        const superGross = Math.min(desiredSuperGross, capTotal);
        
        // Apply tax-aware mode
        const mode = split.mode ?? 'netFixed';
        const contribTax = Math.min(1, Math.max(0, split.contribTaxRate ?? 0.15));
        const outsideTax = Math.min(1, Math.max(0, split.outsideTaxRate ?? 0));
        
        let superNet: number, outsideNet: number;
        if (mode === 'grossDeferral') {
          // Treat 'totalSavings' as gross salary you can direct inside/outside
          const outsideGross = Math.max(0, totalSavings - superGross);
          superNet   = Math.round((superGross   * (1 - contribTax)) * 100) / 100;
          outsideNet = Math.round((outsideGross * (1 - outsideTax)) * 100) / 100;
        } else {
          // Back-compat: 'totalSavings' is already net cash
          superNet = Math.round((superGross * (1 - contribTax)) * 100) / 100;
          outsideNet = totalSavings - superGross;
        }
        
        outside += outsideNet;
        sup += superNet;
      } else {
        // Backward-compatible: all to outside
        outside += totalSavings;
      }
    }

    // Apply future inflows before growth if trigger age is reached
    if (inp.futureInflows && inp.futureInflows.length > 0) {
      for (const inflow of inp.futureInflows) {
        // Check if current age matches trigger age (within small epsilon)
        if (Math.abs(age - inflow.ageYou) < 1e-9) {
          const amount = Math.max(0, inflow.amount || 0);
          if (amount > 0) {
            const destination = inflow.to ?? 'outside';
            if (destination === 'outside') {
              outside += amount;
            } else {
              sup += amount;
            }
          }
        }
      }
    }

    // grow both piles to end of year
    outside = grow(outside, inp.realReturn);
    sup     = grow(sup,     inp.realReturn);

    age += 1;
    path.push({ age, outside, super: sup, total: outside + sup, phase: "accum" });
  }

  return { path, outside, super: sup };
}

/** Simulate retirement phase given S_base, returning terminal total and a path segment. */
function simulateRetirement(
  inp: Inputs,
  startAge: number,
  sBase: number,
  startOutside: number,
  startSuper: number
): { terminalTotal: number; path: SolverPathPoint[] } {
  const pts: SolverPathPoint[] = [];
  let outside = startOutside;
  let sup = startSuper;
  let age = startAge;

  while (age < inp.lifeExp) {
    const nextAge = age + 1;
    const spend = annualSpendFor(nextAge, sBase, inp.bands);

    // Bridge rule: until preserveAge, withdraw only from OUTSIDE
    if (nextAge <= inp.preserveAge) {
      outside -= spend;
    } else {
      // post-preserve, draw from total; use OUTSIDE first then SUPER
      let fromOutside = Math.min(outside, spend);
      outside -= fromOutside;
      const needLeft = spend - fromOutside;
      sup -= needLeft;
    }

    // grow both piles to end of year
    outside = grow(outside, inp.realReturn);
    sup     = grow(sup,     inp.realReturn);

    age = nextAge;
    const phase: SolverPathPoint["phase"] =
      age <= inp.preserveAge ? "bridge" : "retire";
    pts.push({ age, outside, super: sup, total: outside + sup, phase });
  }

  return { terminalTotal: outside + sup, path: pts };
}

/** Present value at retireAge of bridge spending stream using S_base schedule. */
export function computeBridgePV(inp: Inputs, retireAge: number, sBase: number): number {
  const nYears = Math.max(0, Math.min(inp.preserveAge, inp.lifeExp) - retireAge);
  let pv = 0;
  for (let k = 1; k <= nYears; k++) {
    const endAge = retireAge + k;
    const spend = annualSpendFor(endAge, sBase, inp.bands);
    pv += spend / Math.pow(1 + inp.realReturn, k);
  }
  return pv;
}

/** Solve S_base for a given retireAge so terminal wealth ≈ bequest. */
export function solveSBaseForAge(inp: Inputs, retireAge: number): { sBase: number; pathRetire: SolverPathPoint[] } {
  const { outside: oR, super: sR, path: acc } = accumulateUntil(inp, retireAge);

  // Choose a robust upper bound for sBase by expansion.
  let lo = 0;
  let hi = 1;
  const MAX_HI = 5_000_000; // safety
  // Make sure hi is large enough that terminal <= bequest
  for (let i = 0; i < 32 && hi < MAX_HI; i++) {
    const { terminalTotal } = simulateRetirement(inp, retireAge, hi, oR, sR);
    if (terminalTotal <= inp.bequest) break;
    hi *= 2;
  }

  // Bisection
  let pathRetire: SolverPathPoint[] = [];
  for (let i = 0; i < 50; i++) {
    const mid = 0.5 * (lo + hi);
    const sim = simulateRetirement(inp, retireAge, mid, oR, sR);
    pathRetire = sim.path;
    if (sim.terminalTotal > inp.bequest) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { sBase: hi, pathRetire };
}

/** Earliest viable age: bridge covered using the *solved* schedule. */
export function findEarliestViable(inp: Inputs): SolveResult | null {
  // If retireAge is forced, test only that age
  if (inp.retireAge !== undefined) {
    const A = inp.retireAge;
    const acc = accumulateUntil(inp, A);
    const { sBase, pathRetire } = solveSBaseForAge(inp, A);

    const needPV = computeBridgePV(inp, A, sBase);
    const have = acc.outside;
    const covered = have + 1 >= needPV; // $1 epsilon clamp

    if (covered) {
      // Build full path = accumulation + retirement (phase tags set)
      const path = [...acc.path, ...pathRetire];
      return {
        retireAge: A,
        sBase,
        bridge: { years: Math.max(0, Math.min(inp.preserveAge, inp.lifeExp) - A), needPV, have, covered },
        path
      };
    }
    return null; // Forced age is not viable
  }

  // Original logic: search for earliest viable age
  const minAge = inp.currentAge + 1;
  const maxAge = Math.max(minAge, inp.lifeExp - 1);

  for (let A = minAge; A <= maxAge; A++) {
    const acc = accumulateUntil(inp, A);
    const { sBase, pathRetire } = solveSBaseForAge(inp, A);

    const needPV = computeBridgePV(inp, A, sBase);
    const have = acc.outside;
    const covered = have + 1 >= needPV; // $1 epsilon clamp

    if (covered) {
      // Build full path = accumulation + retirement (phase tags set)
      const path = [...acc.path, ...pathRetire];
      return {
        retireAge: A,
        sBase,
        bridge: { years: Math.max(0, Math.min(inp.preserveAge, inp.lifeExp) - A), needPV, have, covered },
        path
      };
    }
  }

  return null;
}