export type Band = { from: number; to: number; m: number }; // [from, to)
export type Phase = "go-go" | "slow-go" | "no-go" | "flat";
export type LifecyclePhase = "accum" | "bridge" | "retire";

export type Person = {
  age: number;
  income: number;
  outside: number;
  superBal: number;
  hecs?: number;
  superPrem?: number;
  preserveAge?: number; // default 60
};

export type Household = {
  p1: Person;
  p2?: Person; // couples-first; absent => single
  targetSpend: number;   // real dollars / year
  lifeExp: number;       // age (e.g., 90)
  annualSavings?: number; // simple pre-retirement savings budget (combined household, real $/yr)
};

export type Assumptions = {
  realReturn: number; // e.g., 0.059
  fees: number;       // e.g., 0.005
  bequest: number;    // often 0
  bands: Band[];      // empty => flat 1.0
};

export type Bridge = {
  status: "covered" | "short";
  years: number;
  need: number;
  have: number;
};

export type PathPoint = {
  age: number;
  outside: number;
  superBal: number;
  total: number;
  phase: Phase;
  lifecyclePhase?: LifecyclePhase;
};

export type DecisionDwz = {
  sustainableAnnual: number; // base S before multiplier
  earliest: { theoretical: number; viable: number };
  bridge: Bridge;
  path: PathPoint[];
  recommendedSplit: { salarySacrifice: number; outside: number; note: string };
};