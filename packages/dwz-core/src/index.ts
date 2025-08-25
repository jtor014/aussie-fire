import { Assumptions, Band, Bridge, DecisionDwz, Household, PathPoint, LifecyclePhase } from "./types.js";
export * from "./types.js";
export * from "./solver.js";
export { optimizeSavingsSplit, optimizeSavingsSplitForPlan } from "./optimizer/savingsSplit.js";
export type { SavingsSplitForPlanResult } from "./optimizer/savingsSplit.js";
export { findEarliestAgeForPlan } from "./planning/earliestForPlan.js";

const EPS = 1;
const clampRate = (r: number) => Math.max(-0.99, r);

export const multiplierAt = (age: number, bands: Band[]) =>
  bands.find(b => age >= b.from && age < b.to)?.m ?? 1;

const phaseAt = (age: number, bands: Band[]): "go-go"|"slow-go"|"no-go"|"flat" => {
  if (!bands?.length) return "flat";
  const b = bands.find(b => age >= b.from && age < b.to);
  if (!b) return "flat";
  const i = bands.indexOf(b);
  return (["go-go","slow-go","no-go"][i] ?? "flat") as any;
};

const agg = (h: Household) => {
  const preserveAge = Math.min(h.p1.preserveAge ?? 60, h.p2?.preserveAge ?? 60);
  const startAge = Math.max(h.p1.age, h.p2?.age ?? -Infinity);
  const outside0 = (h.p1.outside) + (h.p2?.outside ?? 0);
  const super0   = (h.p1.superBal) + (h.p2?.superBal ?? 0);
  const prem     = (h.p1.superPrem ?? 0) + (h.p2?.superPrem ?? 0);
  const income   = (h.p1.income) + (h.p2?.income ?? 0);
  const save     = h.annualSavings ?? 0; // NEW
  return { preserveAge, startAge, outside0, super0, prem, income, save };
};

const grow = (bal: number, realReturn: number, fees: number) =>
  bal * (1 + clampRate(realReturn - fees));

/* ---------- NEW: pre-retirement accumulation ---------- */
function accumulateUntil(
  h: Household,
  a: Assumptions,
  retireAge: number
) {
  const { startAge, outside0, super0, prem, save } = agg(h);
  const rnet = clampRate(a.realReturn - a.fees);

  let outside = outside0;
  let superBal = super0;

  for (let age = startAge; age < retireAge; age++) {
    // pay super insurance premiums while working
    superBal -= prem;

    // simple DMZ: put the whole savings budget outside (T-R2 will optimize split)
    outside += save;

    // grow after contributions/premiums
    outside = grow(Math.max(0, outside), a.realReturn, a.fees);
    superBal = grow(Math.max(0, superBal), a.realReturn, a.fees);
  }

  return { outside, superBal };
}

/* ---------------- drawdown simulation ---------------- */
function simulatePathFromBalances(
  h: Household,
  a: Assumptions,
  retireAge: number,
  startOutside: number,
  startSuper: number
) {
  const { preserveAge, prem } = agg(h);
  const L = h.lifeExp;
  const bands = a.bands ?? [];
  const S = h.targetSpend;

  let outside = startOutside;
  let superBal = startSuper;

  const path: PathPoint[] = [];
  let okBridge = true;
  let okPost   = true;

  for (let age = retireAge; age <= L; age++) {
    const m = multiplierAt(age, bands);
    const spend = S * m;

    if (age < preserveAge) {
      outside -= spend;
      if (outside < -EPS) okBridge = false;
    } else {
      const total = Math.max(0, outside + superBal);
      const takeOutside = total > 0 ? spend * (outside / total) : 0;
      const takeSuper   = spend - takeOutside;
      outside -= takeOutside;
      superBal -= takeSuper;
      if (outside < -EPS || superBal < -EPS) okPost = false;
    }

    superBal -= prem; // premiums always from super

    outside = grow(Math.max(0, outside), a.realReturn, a.fees);
    superBal = grow(Math.max(0, superBal), a.realReturn, a.fees);

    path.push({ 
      age, 
      outside, 
      superBal, 
      total: outside + superBal, 
      phase: phaseAt(age, bands),
      lifecyclePhase: age < preserveAge ? "bridge" : "retire"
    });
  }

  const finalTotal = path.at(-1)?.total ?? 0;
  const bequestOK = finalTotal + EPS >= (a.bequest ?? 0);
  return { path, okBridge, okPost, bequestOK };
}

export function computeBridge(h: Household, a: Assumptions, retireAge: number): Bridge {
  const { preserveAge } = agg(h);
  const years = Math.max(0, preserveAge - retireAge);
  if (years === 0) return { status: "covered", years: 0, need: 0, have: 0 };

  const bands = a.bands ?? [];
  const rnet = clampRate(a.realReturn - a.fees);

  // balances at the retirement decision point
  const acc = accumulateUntil(h, a, retireAge);
  const have = acc.outside;

  // PV at retirement of the bridge spending stream (apples-to-apples with invested outside)
  let pvNeed = 0;
  for (let i = 0; i < years; i++) {
    const spend = h.targetSpend * multiplierAt(retireAge + i, bands);
    pvNeed += spend / Math.pow(1 + rnet, i + 1);
  }

  // Optional: how many years would the outside bucket last if you try to bridge with returns?
  let outside = have;
  let coveredYears = 0;
  for (let i = 0; i < years; i++) {
    const spend = h.targetSpend * multiplierAt(retireAge + i, bands);
    outside -= spend;
    outside = grow(Math.max(0, outside), a.realReturn, a.fees);
    if (outside < -EPS) break;
    coveredYears++;
  }

  return {
    status: have + EPS >= pvNeed ? "covered" : "short",
    years,
    need: pvNeed,   // PV-at-retire-age need
    have,
    coveredYears,   // optional field if you want to show "covers 14/19 years"
  } as Bridge;
}

/* ---------- earliest age via viability gating + accumulation ---------- */
export function solveEarliestAge(h: Household, a: Assumptions) {
  const { startAge } = agg(h);
  const L = h.lifeExp;

  const isViable = (r: number) => {
    const acc = accumulateUntil(h, a, r);
    const sim = simulatePathFromBalances(h, a, r, acc.outside, acc.superBal);

    const bridge = computeBridge(h, a, r);             // <-- unified source
    const bridgeOK = bridge.status === "covered";

    return bridgeOK && sim.okPost && sim.bequestOK;    // <- consistent gating
  };

  let lo = Math.max(startAge, 18);
  let hi = Math.max(lo, L - 1);
  let ans = L;

  // if even retiring at L-1 isn't viable, return L as theoretical
  if (!isViable(hi)) return { theoretical: hi, viable: L };

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (isViable(mid)) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return { theoretical: ans, viable: ans };
}

export function optimizeSplit(h: Household) {
  return { salarySacrifice: 0, outside: 0, note: "Stub: split optimization to be implemented (T-R2)" };
}

/** build full lifecycle path: accumulation → bridge → retirement */
export function buildFullPath(h: Household, a: Assumptions, retireAge: number): PathPoint[] {
  const { startAge, preserveAge, outside0, super0, prem, save } = agg(h);
  const bands = a.bands ?? [];
  const S = h.targetSpend;
  const path: PathPoint[] = [];
  
  let outside = outside0;
  let superBal = super0;
  
  // accumulation phase (current age → retire age) - end-of-year FV convention
  for (let age = startAge; age < retireAge; age++) {
    // pay super premiums while working
    superBal -= prem;
    
    // add savings (all outside for now - T-R2 will optimize split)
    outside += save;
    
    // grow after contributions/premiums
    outside = grow(Math.max(0, outside), a.realReturn, a.fees);
    superBal = grow(Math.max(0, superBal), a.realReturn, a.fees);
    
    path.push({
      age: age + 1,
      outside,
      superBal,
      total: outside + superBal,
      phase: "flat",
      lifecyclePhase: "accum"
    });
  }
  
  // retirement phase (retire age → life expectancy) - same end-of-year FV convention
  // continue from exact same balances as last accumulation point
  for (let age = retireAge; age < h.lifeExp; age++) {
    const m = multiplierAt(age + 1, bands); // spending during year (age, age+1]
    const spend = S * m;

    if (age + 1 < preserveAge) {
      // bridge years: spend from outside only
      outside = grow(Math.max(0, outside - spend), a.realReturn, a.fees);
      superBal = grow(Math.max(0, superBal - prem), a.realReturn, a.fees);
    } else {
      // retirement drawdown: take proportionally from total
      const total = Math.max(0, outside + superBal);
      const takeOutside = total > 0 ? spend * (outside / total) : 0;
      const takeSuper = spend - takeOutside;
      
      outside = grow(Math.max(0, outside - takeOutside), a.realReturn, a.fees);
      superBal = grow(Math.max(0, superBal - takeSuper - prem), a.realReturn, a.fees);
    }

    path.push({
      age: age + 1,
      outside,
      superBal,
      total: outside + superBal,
      phase: phaseAt(age + 1, bands),
      lifecyclePhase: age + 1 < preserveAge ? "bridge" : "retire"
    });
  }
  
  return path;
}

export function computeDecision(h: Household, a: Assumptions): DecisionDwz {
  const earliest = solveEarliestAge(h, a);
  const path = buildFullPath(h, a, earliest.viable);
  const bridge = computeBridge(h, a, earliest.viable);
  
  // continuity test: verify no jumps at retirement boundary
  const retireIdx = path.findIndex(p => p.lifecyclePhase !== "accum");
  if (retireIdx > 0) {
    const accumEnd = path[retireIdx - 1];
    const retireStart = path[retireIdx];
    const jump = Math.abs(accumEnd.total - retireStart.total);
    if (jump > 1000) { // $1k tolerance for numerical precision
      console.warn(`Path discontinuity at retirement: ${jump.toLocaleString()} jump between ages ${accumEnd.age} and ${retireStart.age}`);
    }
  }
  
  return {
    sustainableAnnual: h.targetSpend,
    earliest,
    bridge,
    path,
    recommendedSplit: optimizeSplit(h)
  };
}