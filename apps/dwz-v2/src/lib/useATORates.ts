import { useRef } from 'react';
import { getAuDefaults, calculateMarginalTaxRate, type FinancialYear } from './auRates';

/** Compute ATO rates once per session so values don't change at midnight on 1 July. */
export function useATORates() {
  const once = useRef<ReturnType<typeof getAuDefaults> | null>(null);
  if (!once.current) {
    once.current = getAuDefaults();
  }
  // Return a stable object instance for referential equality in React
  const { fy, cap, sg, brackets } = once.current;
  return {
    financialYear: fy,
    concessionalCap: cap,
    superGuaranteeRate: sg,
    taxBrackets: brackets
  };
}

export function useConcessionalCap(): number {
  return useATORates().concessionalCap;
}

export function useDefaultSGRate(): number {
  return useATORates().superGuaranteeRate;
}

/** Calculate auto marginal tax rate from household incomes. */
export function useAutoMarginalTaxRate(p1Income: number, p2Income?: number): number {
  const { taxBrackets } = useATORates();
  
  // Use the higher earner's marginal rate (more conservative for tax optimization)
  const higherIncome = Math.max(p1Income, p2Income || 0);
  return calculateMarginalTaxRate(higherIncome, taxBrackets);
}