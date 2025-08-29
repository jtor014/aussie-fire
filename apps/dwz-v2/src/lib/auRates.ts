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

/** Determine AU financial year in Australia/Melbourne time. */
export function currentFYNowMelbourne(d = new Date()): FinancialYear {
  // FY rolls on 1 July; ensure we compute in Melbourne time.
  const fmt = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', year: 'numeric', month: 'numeric' });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month); // 1..12
  const yStart = month >= 7 ? year : year - 1;
  const label = `${yStart}-${(yStart + 1).toString().slice(-2)}` as FinancialYear; // e.g., 2025-26
  return (label in AU_RATES ? label : '2024-25');
}

export function getAuDefaults(): { fy: FinancialYear; cap: number; sg: number; brackets: Bracket[] } {
  const fy = currentFYNowMelbourne();
  const r = AU_RATES[fy];
  return { fy, cap: r.concessionalCap, sg: r.sgRate, brackets: r.taxBrackets };
}