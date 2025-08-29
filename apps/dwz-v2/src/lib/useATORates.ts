import { useMemo } from 'react';
import { getAuDefaults, type FinancialYear } from './auRates';

export function useATORates() {
  return useMemo(() => {
    const { fy, cap, sg, brackets } = getAuDefaults();
    return {
      financialYear: fy,
      concessionalCap: cap,
      superGuaranteeRate: sg,
      taxBrackets: brackets
    };
  }, []); // No dependencies - only changes with date/time
}

export function useConcessionalCap(): number {
  return useATORates().concessionalCap;
}

export function useDefaultSGRate(): number {
  return useATORates().superGuaranteeRate;
}