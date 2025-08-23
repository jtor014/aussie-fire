/**
 * Contribution Split Optimizer for DWZ Age-Band Engine
 * 
 * Optimizes the split between salary sacrifice to super vs outside ETF investments
 * to minimize the earliest retirement age for a given target spending level.
 * 
 * Uses grid search with pruning for performance while respecting contribution caps,
 * tax treatment, and insurance deductions.
 */
import Decimal from 'decimal.js-light';
import { solveSustainableSpending, findEarliestRetirement } from '../dwz_age_band.js';

/**
 * Calculate headroom available for salary sacrifice contributions
 * @param {Object} params
 * @param {number} params.salary - Annual salary
 * @param {number} params.sgPct - Superannuation Guarantee percentage (e.g., 0.115 for 11.5%)
 * @param {number} params.concessionalCap - Annual concessional contributions cap
 * @returns {number} Available headroom for additional salary sacrifice
 */
export function computeHeadroom({ salary, sgPct = 0.115, concessionalCap = 30000 }) {
  const sgContribution = Math.min(salary * sgPct, concessionalCap);
  return Math.max(0, concessionalCap - sgContribution);
}

/**
 * Apply 15% contributions tax to salary sacrifice amount
 * @param {number} sac - Pre-tax salary sacrifice amount
 * @returns {number} Net amount landing in super after contributions tax
 */
export function applyContribTax(sac) {
  return sac * 0.85; // 15% contributions tax
}

/**
 * Project wealth balances to retirement age R
 * @param {Object} household - Household parameters
 * @param {number} sac1 - Person 1 annual salary sacrifice
 * @param {number} sac2 - Person 2 annual salary sacrifice (0 for single)
 * @param {number} outside - Annual outside investment
 * @param {Object} assumptions - Return rates and other assumptions
 * @returns {Object} Projected balances at retirement
 */
export function projectBalancesToR(household, sac1, sac2, outside, assumptions) {
  const { 
    currentAge, 
    retirementAge, 
    currentOutside = 0, 
    currentSuper1 = 0, 
    currentSuper2 = 0,
    insurance1 = 0,
    insurance2 = 0,
    salary1 = 0,
    salary2 = 0,
    sgPct = 0.115
  } = household;
  
  const { nominalReturn, inflation } = assumptions;
  const realReturn = nominalReturn.sub(inflation).div(inflation.add(1));
  
  const yearsToRetirement = retirementAge - currentAge;
  
  if (yearsToRetirement <= 0) {
    return {
      outsideWealth: new Decimal(currentOutside),
      superWealth1: new Decimal(currentSuper1),
      superWealth2: new Decimal(currentSuper2)
    };
  }
  
  // Calculate total annual contributions
  const sgContrib1 = salary1 * sgPct;
  const sgContrib2 = salary2 * sgPct;
  const totalSuperContrib1 = sgContrib1 + applyContribTax(sac1);
  const totalSuperContrib2 = sgContrib2 + applyContribTax(sac2);
  
  let projectedOutside = new Decimal(currentOutside);
  let projectedSuper1 = new Decimal(currentSuper1);
  let projectedSuper2 = new Decimal(currentSuper2);
  
  // Handle zero return case
  if (realReturn.abs().lt(1e-9)) {
    projectedOutside = projectedOutside.add(new Decimal(outside).mul(yearsToRetirement));
    projectedSuper1 = projectedSuper1.add(new Decimal(totalSuperContrib1 - insurance1).mul(yearsToRetirement));
    projectedSuper2 = projectedSuper2.add(new Decimal(totalSuperContrib2 - insurance2).mul(yearsToRetirement));
  } else {
    const growthFactor = realReturn.add(1).pow(yearsToRetirement);
    const annuityFactor = growthFactor.sub(1).div(realReturn);
    
    // Project outside wealth
    projectedOutside = projectedOutside.mul(growthFactor).add(new Decimal(outside).mul(annuityFactor));
    
    // Project super wealth (net of insurance)
    const netSuperContrib1 = Math.max(0, totalSuperContrib1 - insurance1);
    const netSuperContrib2 = Math.max(0, totalSuperContrib2 - insurance2);
    
    projectedSuper1 = projectedSuper1.mul(growthFactor).add(new Decimal(netSuperContrib1).mul(annuityFactor));
    projectedSuper2 = projectedSuper2.mul(growthFactor).add(new Decimal(netSuperContrib2).mul(annuityFactor));
  }
  
  return {
    outsideWealth: projectedOutside,
    superWealth1: projectedSuper1,
    superWealth2: projectedSuper2
  };
}

/**
 * Evaluate sustainable spending at specific retirement age
 * @param {number} retirementAge - The retirement age to test
 * @param {Object} params - Household and financial parameters  
 * @param {Object} projectedWealth - Wealth balances at retirement age
 * @param {Object} assumptions - Return and other assumptions
 * @returns {Object} Sustainable spending evaluation result
 */
export function evaluateSustainableSpending(retirementAge, params, projectedWealth, assumptions) {
  const { 
    lifeExpectancy, 
    preservationAge, 
    targetSpend = 50000,
    bequest = 0 
  } = params;
  
  const { nominalReturn, inflation } = assumptions;
  const realReturn = nominalReturn.sub(inflation).div(inflation.add(1));
  
  // For couples, combine super wealth and use younger person's preservation age
  const totalSuperWealth = projectedWealth.superWealth1.add(projectedWealth.superWealth2 || 0);
  
  // Solve sustainable spending at this retirement age
  const solution = solveSustainableSpending({
    retirementAge,
    lifeExpectancy,
    outsideWealth: projectedWealth.outsideWealth,
    superWealth: totalSuperWealth,
    preservationAge,
    realReturn,
    bequest: new Decimal(bequest)
  });
  
  return {
    sustainableSpending: solution.sustainableAnnual,
    bands: solution.bands,
    viable: solution.sustainableAnnual.gte(targetSpend)
  };
}

/**
 * Find earliest viable retirement age through binary search
 * @param {Object} params - Search parameters
 * @param {Object} assumptions - Return assumptions
 * @returns {number|null} Earliest viable retirement age or null
 */
export function findEarliestViableAge(params, assumptions) {
  const { currentAge, lifeExpectancy, preservationAge, targetSpend } = params;
  
  const minAge = currentAge;
  const maxAge = Math.min(preservationAge, lifeExpectancy - 5);
  
  // Binary search for earliest viable age
  let low = minAge;
  let high = maxAge;
  let bestAge = null;
  
  for (let iterations = 0; iterations < 20 && low <= high; iterations++) {
    const testAge = Math.floor((low + high) / 2);
    
    // Project wealth to this test age
    const testHousehold = { ...params, retirementAge: testAge };
    const projectedWealth = projectBalancesToR(testHousehold, params.sac1 || 0, params.sac2 || 0, params.outside || 0, assumptions);
    
    // Test if viable at this age
    const evaluation = evaluateSustainableSpending(testAge, params, projectedWealth, assumptions);
    
    if (evaluation.viable) {
      bestAge = testAge;
      high = testAge - 1; // Look for earlier age
    } else {
      low = testAge + 1; // Need later age
    }
  }
  
  return bestAge;
}

/**
 * Optimize contribution split for single person
 * @param {Object} params - Single person optimization parameters
 * @returns {Object} Optimal split strategy
 */
export function optimiseSplitSingle(params) {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    preservationAge = 60,
    currentOutside = 0,
    currentSuper = 0,
    salary = 0,
    insurance = 0,
    annualSavingsBudget = 0,
    targetSpend = 50000,
    bequest = 0,
    sgPct = 0.115,
    concessionalCap = 30000,
    assumptions = { nominalReturn: new Decimal(0.085), inflation: new Decimal(0.025) }
  } = params;
  
  const headroom = computeHeadroom({ salary, sgPct, concessionalCap });
  const stepSize = 500;
  
  let bestStrategy = {
    earliestAge: null,
    sustainableSpending: new Decimal(0),
    sac: 0,
    outside: annualSavingsBudget,
    capUsePct: 0
  };
  
  // Limit grid search for performance
  const maxSteps = Math.min(Math.floor(headroom / stepSize) + 1, 40); // Max 40 iterations
  
  // Grid search over salary sacrifice amounts
  for (let i = 0; i <= maxSteps; i++) {
    const sac = Math.min(i * stepSize, headroom);
    const outside = Math.max(0, annualSavingsBudget - sac);
    
    // Project balances to retirement
    const household = {
      currentAge,
      retirementAge,
      currentOutside,
      currentSuper1: currentSuper,
      currentSuper2: 0,
      insurance1: insurance,
      insurance2: 0,
      salary1: salary,
      salary2: 0,
      sgPct
    };
    
    const projectedWealth = projectBalancesToR(household, sac, 0, outside, assumptions);
    
    // Find earliest viable retirement age for this split
    const earliestAge = findEarliestViableAge({
      currentAge,
      lifeExpectancy,
      preservationAge,
      targetSpend,
      bequest,
      sac1: sac,
      sac2: 0,
      outside
    }, assumptions);
    
    // Update best strategy if this is better
    if (earliestAge !== null) {
      const isBetter = bestStrategy.earliestAge === null ||
                      earliestAge < bestStrategy.earliestAge;
      
      if (isBetter) {
        bestStrategy = {
          earliestAge: earliestAge,
          sustainableSpending: new Decimal(0), // Will be computed later if needed
          sac,
          outside,
          capUsePct: headroom > 0 ? (sac / headroom) * 100 : 0
        };
      }
    }
  }
  
  // Generate rationale
  const rationale = [];
  const bridgeYears = preservationAge - (bestStrategy.earliestAge || retirementAge);
  
  if (bridgeYears > 10) {
    rationale.push("Long bridge period favours outside investments");
  } else if (bridgeYears < 5) {
    rationale.push("Short bridge period favours super contributions");
  }
  
  if (bestStrategy.capUsePct > 90) {
    rationale.push("Concessional cap fully utilized");
  } else if (bestStrategy.capUsePct < 10) {
    rationale.push("Super contributions minimized for liquidity");
  }
  
  if (insurance > salary * 0.01) {
    rationale.push("High insurance reduces super contribution effectiveness");
  }
  
  return {
    earliestAge: bestStrategy.earliestAge,
    splits: {
      person1: {
        sac: Math.round(bestStrategy.sac),
        capUsePct: Math.round(bestStrategy.capUsePct * 10) / 10
      },
      outside: Math.round(bestStrategy.outside)
    },
    rationale
  };
}

/**
 * Optimize contribution split for couple
 * @param {Object} params - Couple optimization parameters
 * @returns {Object} Optimal split strategy
 */
export function optimiseSplitCouple(params) {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    preservationAge1 = 60,
    preservationAge2 = 60,
    currentOutside = 0,
    currentSuper1 = 0,
    currentSuper2 = 0,
    salary1 = 0,
    salary2 = 0,
    insurance1 = 0,
    insurance2 = 0,
    annualSavingsBudget = 0,
    targetSpend = 50000,
    bequest = 0,
    sgPct = 0.115,
    concessionalCap = 30000,
    assumptions = { nominalReturn: new Decimal(0.085), inflation: new Decimal(0.025) }
  } = params;
  
  const headroom1 = computeHeadroom({ salary: salary1, sgPct, concessionalCap });
  const headroom2 = computeHeadroom({ salary: salary2, sgPct, concessionalCap });
  const stepSize = 500;
  
  // Use younger partner's preservation age for optimization
  const effectivePreservationAge = Math.min(preservationAge1, preservationAge2);
  
  let bestStrategy = {
    earliestAge: null,
    sustainableSpending: new Decimal(0),
    sac1: 0,
    sac2: 0,
    outside: annualSavingsBudget,
    capUsePct1: 0,
    capUsePct2: 0
  };
  
  // Coarse grid search for performance - limit to prevent timeout
  const maxSteps1 = Math.min(Math.floor(headroom1 / stepSize) + 1, 12);
  const maxSteps2 = Math.min(Math.floor(headroom2 / stepSize) + 1, 12);
  
  for (let i1 = 0; i1 <= maxSteps1; i1++) {
    const sac1 = Math.min(i1 * stepSize, headroom1);
    
    for (let i2 = 0; i2 <= maxSteps2; i2++) {
      const sac2 = Math.min(i2 * stepSize, headroom2);
      const totalSac = sac1 + sac2;
      
      if (totalSac > annualSavingsBudget) continue; // Budget constraint
      
      const outside = Math.max(0, annualSavingsBudget - totalSac);
      
      // Project balances to retirement
      const household = {
        currentAge,
        retirementAge,
        currentOutside,
        currentSuper1,
        currentSuper2,
        insurance1,
        insurance2,
        salary1,
        salary2,
        sgPct
      };
      
      const projectedWealth = projectBalancesToR(household, sac1, sac2, outside, assumptions);
      
      // Find earliest viable retirement age for this split
      const earliestAge = findEarliestViableAge({
        currentAge,
        lifeExpectancy,
        preservationAge: effectivePreservationAge,
        targetSpend,
        bequest,
        sac1,
        sac2,
        outside
      }, assumptions);
      
      // Update best strategy if this is better
      if (earliestAge !== null) {
        const isBetter = bestStrategy.earliestAge === null ||
                        earliestAge < bestStrategy.earliestAge ||
                        (earliestAge === bestStrategy.earliestAge && outside > bestStrategy.outside);
        
        if (isBetter) {
          bestStrategy = {
            earliestAge: earliestAge,
            sustainableSpending: new Decimal(0), // Will be computed later if needed
            sac1,
            sac2,
            outside,
            capUsePct1: headroom1 > 0 ? (sac1 / headroom1) * 100 : 0,
            capUsePct2: headroom2 > 0 ? (sac2 / headroom2) * 100 : 0
          };
        }
      }
    }
  }
  
  // Generate rationale
  const rationale = [];
  const bridgeYears = effectivePreservationAge - (bestStrategy.earliestAge || retirementAge);
  
  if (bridgeYears > 10) {
    rationale.push("Long bridge period favours outside investments");
  } else if (bridgeYears < 5) {
    rationale.push("Short bridge period favours super contributions");
  }
  
  if (bestStrategy.capUsePct1 > 90 && bestStrategy.capUsePct2 > 90) {
    rationale.push("Both partners' concessional caps fully utilized");
  } else if (bestStrategy.capUsePct1 > 90) {
    rationale.push("Partner 1 concessional cap fully utilized");
  } else if (bestStrategy.capUsePct2 > 90) {
    rationale.push("Partner 2 concessional cap fully utilized");
  }
  
  if (bestStrategy.sac1 > bestStrategy.sac2 + 1000) {
    rationale.push("Higher contributions favoured for partner 1");
  } else if (bestStrategy.sac2 > bestStrategy.sac1 + 1000) {
    rationale.push("Higher contributions favoured for partner 2");
  }
  
  const totalInsurance = insurance1 + insurance2;
  if (totalInsurance > (salary1 + salary2) * 0.01) {
    rationale.push("Insurance premiums reduce super contribution effectiveness");
  }
  
  return {
    earliestAge: bestStrategy.earliestAge,
    splits: {
      person1: {
        sac: Math.round(bestStrategy.sac1),
        capUsePct: Math.round(bestStrategy.capUsePct1 * 10) / 10
      },
      person2: {
        sac: Math.round(bestStrategy.sac2),
        capUsePct: Math.round(bestStrategy.capUsePct2 * 10) / 10
      },
      outside: Math.round(bestStrategy.outside)
    },
    rationale
  };
}