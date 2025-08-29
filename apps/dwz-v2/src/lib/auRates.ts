export type FinancialYear = '2024-25' | '2025-26';
type Bracket = { upTo: number | null; rate: number }; // rate excludes Medicare levy

export const AU_RATES: Record<FinancialYear, {
  concessionalCap: number;
  sgRate: number;
  taxBrackets: Bracket[];
}> = {
  '2024-25': {
    concessionalCap: 30_000,
    sgRate: 0.115,
    taxBrackets: [
      { upTo: 18_200, rate: 0.00 },
      { upTo: 45_000, rate: 0.16 },
      { upTo: 135_000, rate: 0.30 },
      { upTo: 190_000, rate: 0.37 },
      { upTo: null, rate: 0.45 },
    ],
  },
  '2025-26': {
    concessionalCap: 30_000,
    sgRate: 0.12,
    taxBrackets: [
      { upTo: 18_200, rate: 0.00 },
      { upTo: 45_000, rate: 0.16 },
      { upTo: 135_000, rate: 0.30 },
      { upTo: 190_000, rate: 0.37 },
      { upTo: null, rate: 0.45 },
    ],
  },
};

/** Pure FY calculator from local year/month. Month is 1..12. */
export function fyFromYearMonth(year: number, month1to12: number): FinancialYear {
  const yStart = month1to12 >= 7 ? year : year - 1;
  const label = `${yStart}-${(yStart + 1).toString().slice(-2)}` as FinancialYear;
  return (label in AU_RATES ? label : '2024-25');
}

/** Determine AU financial year in Australia/Melbourne time. */
export function currentFYNowMelbourne(d = new Date()): FinancialYear {
  // FY rolls on 1 July; ensure we compute in Melbourne time.
  const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: 'numeric' });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month); // 1..12
  return fyFromYearMonth(year, month);
}

export function getAuDefaults(): { fy: FinancialYear; cap: number; sg: number; brackets: Bracket[] } {
  const fy = currentFYNowMelbourne();
  const r = AU_RATES[fy];
  return { fy, cap: r.concessionalCap, sg: r.sgRate, brackets: r.taxBrackets };
}

/** Deterministic defaults for tests (no Date/Intl). */
export function defaultsForYearMonth(year: number, month1to12: number) {
  const fy = fyFromYearMonth(year, month1to12);
  const r = AU_RATES[fy];
  return { fy, cap: r.concessionalCap, sg: r.sgRate, brackets: r.taxBrackets };
}

/** Calculate marginal tax rate including Medicare levy from ATO brackets. */
export function calculateMarginalTaxRate(income: number, brackets: Bracket[]): number {
  if (income <= 0) return 0;
  
  // Find the marginal bracket
  let marginalRate = 0;
  for (const bracket of brackets) {
    if (bracket.upTo === null || income <= bracket.upTo) {
      marginalRate = bracket.rate;
      break;
    }
  }
  
  // Add Medicare levy (2%) for income above threshold
  // Medicare levy applies from $25,000 (2024-25) with phase-in from $21,336
  const medicareLevy = income >= 25000 ? 0.02 : 0;
  
  return Math.min(0.65, marginalRate + medicareLevy); // Cap at 65%
}