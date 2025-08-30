import type { Household, Inputs, Assumptions } from 'dwz-core';

/**
 * Map UI household → core solver Inputs. Keep it future-proof:
 * - Preserve any unknown keys (e.g., futureInflows).
 * - Convert household structure to solver input format.
 */
export function toCoreInput(household: Household, assumptions: Assumptions): Inputs {
  const currentAge = Math.max(household.p1.age, household.p2?.age ?? -Infinity);
  const preserveAge = Math.min(household.p1.preserveAge ?? 60, household.p2?.preserveAge ?? 60);
  const outside0 = household.p1.outside + (household.p2?.outside ?? 0);
  const super0 = household.p1.superBal + (household.p2?.superBal ?? 0);

  // Convert bands format from {from, to, m} to {endAgeIncl, multiplier}
  const bands = (assumptions.bands || []).map((b: any) => ({
    endAgeIncl: b.to - 1, // convert from exclusive 'to' to inclusive 'endAgeIncl'
    multiplier: b.m
  }));

  // Calculate combined employer SG gross from both people
  const employerSGGross = (household.p1.salary || 0) * (household.p1.sgRate || 0) + 
                         (household.p2?.salary || 0) * (household.p2?.sgRate || 0);

  return {
    currentAge,
    preserveAge,
    lifeExp: household.lifeExp,
    outside0,
    super0,
    realReturn: assumptions.realReturn,
    annualSavings: household.annualSavings || 0,
    bands,
    bequest: assumptions.bequest || 0,
    preFireSavingsSplit: household.preFireSavingsSplit,
    employerSGGross: employerSGGross > 0 ? employerSGGross : undefined,
    // ⭐ KEY FIX: Preserve futureInflows from household
    futureInflows: household.futureInflows
  };
}