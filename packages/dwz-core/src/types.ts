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
  preFireSavingsSplit?: PreFireSavingsSplit; // optional savings split policy
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

// Optimizer types
export interface SavingsSplitConstraints {
  capPerPerson: number;
  eligiblePeople: number;
  capTotal: number;
  contribTaxRate: number;
}

export interface SavingsSplitSensitivityPoint {
  pct: number;
  earliestAge: number;
}

export interface SavingsSplitResult {
  recommendedPct: number;               // in [0,1]
  earliestAge: number;
  dwzSpend: number;
  sensitivity: SavingsSplitSensitivityPoint[];
  constraints: SavingsSplitConstraints & { capBindingAtOpt: boolean };
  evals: number;                      // number of solver evaluations
}

export interface PreFireSavingsSplit {
  toSuperPct: number;                 // 0..1 desired split to super (gross, before 15% contrib tax)
  capPerPerson: number;               // concessional cap per eligible person
  eligiblePeople: number;           // 1 or 2 typically
  contribTaxRate: number;             // usually 0.15
  /** Marginal tax rate on amounts saved outside (0..1). Used in 'grossDeferral' mode. */
  outsideTaxRate?: number;
  /**
   * How to interpret annualSavings for accumulation:
   * - 'grossDeferral': annualSavings is pre-tax capacity; outside net = gross*(1 - outsideTaxRate), super net = gross*(1 - contribTaxRate).
   * - 'netFixed' (default/back-compat): treat annualSavings as already-net; outside receives residual without extra tax.
   */
  mode?: 'grossDeferral' | 'netFixed';
}