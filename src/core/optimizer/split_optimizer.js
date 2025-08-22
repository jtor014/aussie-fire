import * as Money from '../../lib/money.js';
import { computeDwzStepped, isSteppedPlanViable } from '../dwz_stepped.js';

/**
 * DWZ Contribution Split Optimizer
 * 
 * Optimizes the allocation between salary sacrifice (super) and outside investments
 * to achieve the earliest possible retirement at a target spending level.
 * 
 * Uses grid search to find optimal split considering:
 * - Australian superannuation contribution caps
 * - Insurance premium deductions
 * - DWZ stepped spending methodology with bequest support
 */

/**
 * Evaluate a single person's contribution split for earliest retirement
 * 
 * @param {number} alpha - Fraction of available savings to salary sacrifice [0,1]
 * @param {Object} params - Optimization parameters
 * @returns {Object} { earliestAge, capUse, sacAmount, outsideAmount, viable }
 */
export function evaluateSplitSingle(alpha, params) {
  const {
    currentAge,
    targetSpend,
    annualSavingsBudget,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper,
    annualIncome,
    rReal,
    preservationAge,
    
    // Super settings
    sgRate,                    // Superannuation Guarantee rate (e.g. 0.12)
    concessionalCap,          // Annual concessional contribution cap
    superInsurance,           // Annual insurance premiums in super
    contributionsTaxRate      // Tax on concessional contributions (15%)
  } = params;

  // Calculate employer SG contribution
  const sgContribution = annualIncome * sgRate;
  
  // Calculate available headroom in concessional cap
  const concessionalHeadroom = Math.max(0, concessionalCap - sgContribution);
  
  // Calculate salary sacrifice amount (clamped to headroom)
  const desiredSAC = alpha * annualSavingsBudget;
  const actualSAC = Math.min(desiredSAC, concessionalHeadroom);
  const sacOverflow = desiredSAC - actualSAC;
  
  // Calculate contributions after 15% tax
  const netSGContribution = sgContribution * (1 - contributionsTaxRate);
  const netSACContribution = actualSAC * (1 - contributionsTaxRate);
  
  // Calculate outside investment amount
  const outsideAmount = annualSavingsBudget - actualSAC + sacOverflow;
  
  // Calculate cap utilization
  const totalConcessional = sgContribution + actualSAC;
  const capUse = totalConcessional / concessionalCap;
  
  // Simulate wealth accumulation to find earliest retirement age
  const earliestAge = findEarliestRetirementAge({
    currentAge,
    targetSpend,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper,
    annualOutsideContrib: outsideAmount,
    annualSuperContrib: netSGContribution + netSACContribution,
    superInsurance,
    rReal,
    preservationAge
  });

  return {
    earliestAge,
    capUse,
    sacAmount: actualSAC,
    outsideAmount,
    viable: earliestAge !== null,
    totalConcessional,
    overflow: sacOverflow
  };
}

/**
 * Evaluate a couple's contribution split for earliest retirement
 * 
 * @param {number} alpha1 - Person 1's salary sacrifice fraction [0,1]
 * @param {number} alpha2 - Person 2's salary sacrifice fraction [0,1]  
 * @param {Object} params - Couple optimization parameters
 * @returns {Object} { earliestAge, capUse1, capUse2, sac1, sac2, outside, viable }
 */
export function evaluateSplitCouple(alpha1, alpha2, params) {
  const {
    currentAge,
    targetSpend,
    annualSavingsBudget,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper1,
    currentSuper2,
    annualIncome1,
    annualIncome2,
    rReal,
    preservationAge1,
    preservationAge2,
    
    // Super settings per person
    sgRate,
    concessionalCap,
    superInsurance1,
    superInsurance2,
    contributionsTaxRate
  } = params;

  // Calculate SG contributions for both partners
  const sgContrib1 = annualIncome1 * sgRate;
  const sgContrib2 = annualIncome2 * sgRate;
  
  // Calculate individual headroom
  const headroom1 = Math.max(0, concessionalCap - sgContrib1);
  const headroom2 = Math.max(0, concessionalCap - sgContrib2);
  
  // Calculate salary sacrifice amounts (clamped to individual headroom)
  const desiredSAC1 = alpha1 * annualSavingsBudget * 0.5; // Split budget between partners
  const desiredSAC2 = alpha2 * annualSavingsBudget * 0.5;
  
  const actualSAC1 = Math.min(desiredSAC1, headroom1);
  const actualSAC2 = Math.min(desiredSAC2, headroom2);
  
  const overflow1 = desiredSAC1 - actualSAC1;
  const overflow2 = desiredSAC2 - actualSAC2;
  
  // Calculate net contributions after 15% tax
  const netSG1 = sgContrib1 * (1 - contributionsTaxRate);
  const netSG2 = sgContrib2 * (1 - contributionsTaxRate);
  const netSAC1 = actualSAC1 * (1 - contributionsTaxRate);
  const netSAC2 = actualSAC2 * (1 - contributionsTaxRate);
  
  // Calculate joint outside amount (includes overflow)
  const outsideAmount = annualSavingsBudget - actualSAC1 - actualSAC2 + overflow1 + overflow2;
  
  // Calculate cap utilization
  const capUse1 = (sgContrib1 + actualSAC1) / concessionalCap;
  const capUse2 = (sgContrib2 + actualSAC2) / concessionalCap;
  
  // Simulate wealth accumulation for couple
  const earliestAge = findEarliestRetirementAgeCouple({
    currentAge,
    targetSpend,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper1,
    currentSuper2,
    annualOutsideContrib: outsideAmount,
    annualSuperContrib1: netSG1 + netSAC1,
    annualSuperContrib2: netSG2 + netSAC2,
    superInsurance1,
    superInsurance2,
    rReal,
    preservationAge1,
    preservationAge2
  });

  return {
    earliestAge,
    capUse1,
    capUse2,
    sac1: actualSAC1,
    sac2: actualSAC2,
    outside: outsideAmount,
    viable: earliestAge !== null,
    overflow1,
    overflow2
  };
}

/**
 * Find earliest retirement age for single person using binary search
 */
function findEarliestRetirementAge(params) {
  const {
    currentAge,
    targetSpend,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper,
    annualOutsideContrib,
    annualSuperContrib,
    superInsurance,
    rReal,
    preservationAge
  } = params;

  // Binary search bounds
  const minAge = currentAge;
  const maxAge = Math.min(preservationAge + 40, lifeExpectancy - 1);
  
  let lo = minAge;
  let hi = maxAge;
  
  // Helper to check if retirement at age R is viable
  const isViableAtAge = (R) => {
    const yearsToRetirement = R - currentAge;
    if (yearsToRetirement < 0) return false;
    
    // Project wealth to retirement age
    const { outsideWealth, superWealth } = projectWealthSingle(
      yearsToRetirement,
      currentSavings,
      currentSuper,
      annualOutsideContrib,
      annualSuperContrib,
      superInsurance,
      rReal
    );
    
    // Evaluate DWZ stepped viability
    const stepped = computeDwzStepped(R, preservationAge, lifeExpectancy, outsideWealth, superWealth, rReal, bequest);
    return isSteppedPlanViable(stepped, targetSpend);
  };
  
  // Check if viable at latest reasonable age
  if (!isViableAtAge(hi)) {
    return null; // Not achievable
  }
  
  // Binary search for earliest viable age
  for (let i = 0; i < 20; i++) {
    if (lo >= hi) break;
    
    const mid = Math.floor((lo + hi) / 2);
    if (isViableAtAge(mid)) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  
  return hi;
}

/**
 * Find earliest retirement age for couple
 */
function findEarliestRetirementAgeCouple(params) {
  const {
    currentAge,
    targetSpend,
    bequest,
    lifeExpectancy,
    currentSavings,
    currentSuper1,
    currentSuper2,
    annualOutsideContrib,
    annualSuperContrib1,
    annualSuperContrib2,
    superInsurance1,
    superInsurance2,
    rReal,
    preservationAge1,
    preservationAge2
  } = params;

  const minAge = currentAge;
  const maxAge = Math.min(Math.max(preservationAge1, preservationAge2) + 40, lifeExpectancy - 1);
  
  let lo = minAge;
  let hi = maxAge;
  
  const isViableAtAge = (R) => {
    const yearsToRetirement = R - currentAge;
    if (yearsToRetirement < 0) return false;
    
    // Project wealth for both partners
    const { outsideWealth, superWealth1, superWealth2 } = projectWealthCouple(
      yearsToRetirement,
      currentSavings,
      currentSuper1,
      currentSuper2,
      annualOutsideContrib,
      annualSuperContrib1,
      annualSuperContrib2,
      superInsurance1,
      superInsurance2,
      rReal
    );
    
    // Use simplified couple DWZ evaluation (would need full couple DWZ engine)
    // For MVP, combine super wealth and use single-person logic
    const totalSuperWealth = superWealth1 + superWealth2;
    const earliestPreservation = Math.min(preservationAge1, preservationAge2);
    
    const stepped = computeDwzStepped(R, earliestPreservation, lifeExpectancy, outsideWealth, totalSuperWealth, rReal, bequest);
    return isSteppedPlanViable(stepped, targetSpend);
  };
  
  if (!isViableAtAge(hi)) {
    return null;
  }
  
  for (let i = 0; i < 20; i++) {
    if (lo >= hi) break;
    
    const mid = Math.floor((lo + hi) / 2);
    if (isViableAtAge(mid)) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  
  return hi;
}

/**
 * Project wealth accumulation for single person
 */
function projectWealthSingle(years, currentSavings, currentSuper, annualOutside, annualSuper, insurance, rReal) {
  let outsideWealth = Money.money(currentSavings);
  let superWealth = Money.money(currentSuper);
  
  const growthFactor = Money.add(1, rReal);
  
  for (let year = 0; year < years; year++) {
    // Grow existing wealth
    outsideWealth = Money.mul(outsideWealth, growthFactor);
    superWealth = Money.mul(superWealth, growthFactor);
    
    // Add contributions
    outsideWealth = Money.add(outsideWealth, annualOutside);
    superWealth = Money.add(superWealth, annualSuper);
    
    // Deduct insurance premiums from super
    superWealth = Money.sub(superWealth, insurance);
    superWealth = Money.max(superWealth, Money.money(0)); // Can't go negative
  }
  
  return {
    outsideWealth: Money.toNumber(outsideWealth),
    superWealth: Money.toNumber(superWealth)
  };
}

/**
 * Project wealth accumulation for couple
 */
function projectWealthCouple(years, currentSavings, currentSuper1, currentSuper2, annualOutside, annualSuper1, annualSuper2, insurance1, insurance2, rReal) {
  let outsideWealth = Money.money(currentSavings);
  let superWealth1 = Money.money(currentSuper1);
  let superWealth2 = Money.money(currentSuper2);
  
  const growthFactor = Money.add(1, rReal);
  
  for (let year = 0; year < years; year++) {
    // Grow existing wealth
    outsideWealth = Money.mul(outsideWealth, growthFactor);
    superWealth1 = Money.mul(superWealth1, growthFactor);
    superWealth2 = Money.mul(superWealth2, growthFactor);
    
    // Add contributions
    outsideWealth = Money.add(outsideWealth, annualOutside);
    superWealth1 = Money.add(superWealth1, annualSuper1);
    superWealth2 = Money.add(superWealth2, annualSuper2);
    
    // Deduct insurance premiums
    superWealth1 = Money.sub(superWealth1, insurance1);
    superWealth2 = Money.sub(superWealth2, insurance2);
    superWealth1 = Money.max(superWealth1, Money.money(0));
    superWealth2 = Money.max(superWealth2, Money.money(0));
  }
  
  return {
    outsideWealth: Money.toNumber(outsideWealth),
    superWealth1: Money.toNumber(superWealth1),
    superWealth2: Money.toNumber(superWealth2)
  };
}

/**
 * Optimize contribution split for single person
 * 
 * @param {Object} params - Optimization parameters  
 * @returns {Object} Optimal split recommendation
 */
export function optimizeSplitSingle(params) {
  let bestResult = { earliestAge: Infinity, alpha: 0 };
  
  // Coarse grid search (0 to 1 in steps of 0.05)
  for (let alpha = 0; alpha <= 1; alpha += 0.05) {
    const result = evaluateSplitSingle(alpha, params);
    if (result.viable && result.earliestAge < bestResult.earliestAge) {
      bestResult = { ...result, alpha };
    }
  }
  
  if (bestResult.earliestAge === Infinity) {
    return null; // No viable solution found
  }
  
  // Fine-tune around best result (±0.05 in steps of 0.01)
  const centerAlpha = bestResult.alpha;
  const minAlpha = Math.max(0, centerAlpha - 0.05);
  const maxAlpha = Math.min(1, centerAlpha + 0.05);
  
  for (let alpha = minAlpha; alpha <= maxAlpha; alpha += 0.01) {
    const result = evaluateSplitSingle(alpha, params);
    if (result.viable && result.earliestAge < bestResult.earliestAge) {
      bestResult = { ...result, alpha };
    }
  }
  
  return bestResult;
}

/**
 * Optimize contribution split for couple
 * 
 * @param {Object} params - Couple optimization parameters
 * @returns {Object} Optimal split recommendation
 */
export function optimizeSplitCouple(params) {
  let bestResult = { earliestAge: Infinity, alpha1: 0, alpha2: 0 };
  
  // Coarse 2D grid search
  const coarseSteps = [0, 0.25, 0.5, 0.75, 1.0];
  
  for (const alpha1 of coarseSteps) {
    for (const alpha2 of coarseSteps) {
      const result = evaluateSplitCouple(alpha1, alpha2, params);
      if (result.viable && result.earliestAge < bestResult.earliestAge) {
        bestResult = { ...result, alpha1, alpha2 };
      }
    }
  }
  
  if (bestResult.earliestAge === Infinity) {
    return null; // No viable solution found
  }
  
  // Fine-tune around best result (±0.25 in steps of 0.05)
  const centerAlpha1 = bestResult.alpha1;
  const centerAlpha2 = bestResult.alpha2;
  
  const minAlpha1 = Math.max(0, centerAlpha1 - 0.25);
  const maxAlpha1 = Math.min(1, centerAlpha1 + 0.25);
  const minAlpha2 = Math.max(0, centerAlpha2 - 0.25);
  const maxAlpha2 = Math.min(1, centerAlpha2 + 0.25);
  
  for (let alpha1 = minAlpha1; alpha1 <= maxAlpha1; alpha1 += 0.05) {
    for (let alpha2 = minAlpha2; alpha2 <= maxAlpha2; alpha2 += 0.05) {
      const result = evaluateSplitCouple(alpha1, alpha2, params);
      if (result.viable && result.earliestAge < bestResult.earliestAge) {
        bestResult = { ...result, alpha1, alpha2 };
      }
    }
  }
  
  return bestResult;
}