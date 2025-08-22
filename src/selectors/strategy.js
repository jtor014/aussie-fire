import { optimizeSplitSingle, optimizeSplitCouple } from '../core/optimizer/split_optimizer.js';

/**
 * Generate DWZ strategy recommendations from application state
 * 
 * Analyzes current financial situation and returns optimized contribution
 * split recommendations for earliest retirement at target spending level.
 * 
 * @param {Object} state - Current application state
 * @param {Object} rules - Australian tax/super rules
 * @returns {Object} Strategy recommendations for UI display
 */
export function dwzStrategyFromState(state, rules) {
  const {
    planningAs,
    currentAge,
    targetSpend = state.annualExpenses,
    annualSavingsBudget = 50000,
    bequest = 0,
    lifeExpectancy,
    currentSavings = 0,
    currentSuper = 0,
    annualIncome = 0,
    expectedReturn = 8.5,
    inflationRate = 2.5,
    
    // Couple-specific
    partnerB = {},
    
    // Super settings (from rules or state)
    superInsurancePremiums = 1000
  } = state;

  // Calculate real return rate
  const nominalReturn = expectedReturn / 100;
  const inflation = inflationRate / 100;
  const rReal = (nominalReturn - inflation) / (1 + inflation);
  
  // Australian super settings
  const sgRate = rules.superannuation_guarantee_rate || 0.115; // 11.5% for 2024
  const concessionalCap = rules.concessional_contribution_cap || 27500; // 2024 cap
  const contributionsTaxRate = 0.15; // 15% tax on concessional contributions
  const preservationAge = rules.preservation_age || 60;

  if (planningAs === 'single') {
    return generateSingleStrategy({
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
      sgRate,
      concessionalCap,
      superInsurance: superInsurancePremiums,
      contributionsTaxRate
    });
  } else {
    return generateCoupleStrategy({
      currentAge,
      targetSpend,
      annualSavingsBudget,
      bequest,
      lifeExpectancy,
      currentSavings,
      currentSuper1: currentSuper,
      currentSuper2: partnerB.currentSuper || 0,
      annualIncome1: annualIncome,
      annualIncome2: partnerB.annualIncome || 0,
      rReal,
      preservationAge1: preservationAge,
      preservationAge2: preservationAge, // Assume same for MVP
      sgRate,
      concessionalCap,
      superInsurance1: superInsurancePremiums,
      superInsurance2: partnerB.superInsurancePremiums || 1000,
      contributionsTaxRate
    });
  }
}

/**
 * Generate strategy recommendation for single person
 */
function generateSingleStrategy(params) {
  const optimization = optimizeSplitSingle(params);
  
  if (!optimization) {
    return {
      viable: false,
      message: `Cannot achieve $${params.targetSpend.toLocaleString()}/yr target spend with current savings budget`,
      recommendations: null
    };
  }

  const {
    alpha,
    earliestAge,
    sacAmount,
    outsideAmount,
    capUse,
    totalConcessional,
    overflow
  } = optimization;

  // Calculate employer SG contribution for display
  const sgContribution = params.annualIncome * params.sgRate;
  
  return {
    viable: true,
    earliestRetirementAge: earliestAge,
    targetSpend: params.targetSpend,
    bequest: params.bequest,
    lifeExpectancy: params.lifeExpectancy,
    
    recommendations: {
      salarysacrifice: {
        amount: Math.round(sacAmount),
        percentage: Math.round((sacAmount / params.annualSavingsBudget) * 100)
      },
      outsideInvestment: {
        amount: Math.round(outsideAmount),
        percentage: Math.round((outsideAmount / params.annualSavingsBudget) * 100)
      },
      totalBudget: params.annualSavingsBudget
    },
    
    capAnalysis: {
      employerSG: Math.round(sgContribution),
      salarysacrifice: Math.round(sacAmount),
      totalConcessional: Math.round(totalConcessional),
      concessionalCap: params.concessionalCap,
      capUtilization: Math.round(capUse * 100),
      overflow: Math.round(overflow),
      hasOverflow: overflow > 100 // Meaningful overflow threshold
    },
    
    rationale: generateRationale({
      alpha,
      earliestAge,
      capUse,
      overflow,
      targetSpend: params.targetSpend,
      preservationAge: params.preservationAge
    })
  };
}

/**
 * Generate strategy recommendation for couple
 */
function generateCoupleStrategy(params) {
  const optimization = optimizeSplitCouple(params);
  
  if (!optimization) {
    return {
      viable: false,
      message: `Cannot achieve $${params.targetSpend.toLocaleString()}/yr target spend with current savings budget`,
      recommendations: null
    };
  }

  const {
    alpha1,
    alpha2,
    earliestAge,
    sac1,
    sac2,
    outside,
    capUse1,
    capUse2,
    overflow1,
    overflow2
  } = optimization;

  // Calculate employer SG contributions
  const sgContrib1 = params.annualIncome1 * params.sgRate;
  const sgContrib2 = params.annualIncome2 * params.sgRate;
  
  return {
    viable: true,
    earliestRetirementAge: earliestAge,
    targetSpend: params.targetSpend,
    bequest: params.bequest,
    lifeExpectancy: params.lifeExpectancy,
    
    recommendations: {
      person1: {
        salarysacrifice: Math.round(sac1),
        capUtilization: Math.round(capUse1 * 100)
      },
      person2: {
        salarysacrifice: Math.round(sac2), 
        capUtilization: Math.round(capUse2 * 100)
      },
      outsideInvestment: {
        amount: Math.round(outside),
        percentage: Math.round((outside / params.annualSavingsBudget) * 100)
      },
      totalBudget: params.annualSavingsBudget
    },
    
    capAnalysis: {
      person1: {
        employerSG: Math.round(sgContrib1),
        salarysacrifice: Math.round(sac1),
        totalConcessional: Math.round(sgContrib1 + sac1),
        capUtilization: Math.round(capUse1 * 100),
        overflow: Math.round(overflow1)
      },
      person2: {
        employerSG: Math.round(sgContrib2),
        salarysacrifice: Math.round(sac2),
        totalConcessional: Math.round(sgContrib2 + sac2),
        capUtilization: Math.round(capUse2 * 100),
        overflow: Math.round(overflow2)
      },
      concessionalCap: params.concessionalCap
    },
    
    rationale: generateCoupleRationale({
      alpha1,
      alpha2,
      earliestAge,
      capUse1,
      capUse2,
      targetSpend: params.targetSpend,
      preservationAge1: params.preservationAge1,
      preservationAge2: params.preservationAge2
    })
  };
}

/**
 * Generate explanation of why this split is recommended
 */
function generateRationale({ alpha, earliestAge, capUse, overflow, targetSpend, preservationAge }) {
  const reasons = [];
  
  // Main optimization result
  reasons.push(`This allocation enables retirement at age ${earliestAge} for $${targetSpend.toLocaleString()}/yr spending.`);
  
  // Cap utilization insights
  if (capUse > 0.9) {
    reasons.push('Your concessional cap is nearly fully utilized, maximizing tax-advantaged super growth.');
  } else if (capUse < 0.5) {
    reasons.push('You have significant unused concessional cap space for additional tax benefits.');
  }
  
  // Overflow handling
  if (overflow > 1000) {
    reasons.push(`$${Math.round(overflow).toLocaleString()} exceeds your cap and flows to outside investments.`);
  }
  
  // Phase-specific insights
  if (earliestAge < preservationAge) {
    reasons.push('Early retirement relies on outside investments during the bridge period to age 60.');
  } else {
    reasons.push('Retirement timing allows immediate access to superannuation benefits.');
  }
  
  return reasons;
}

/**
 * Generate explanation for couple's split recommendation
 */
function generateCoupleRationale({ alpha1, alpha2, earliestAge, capUse1, capUse2, targetSpend, preservationAge1, preservationAge2 }) {
  const reasons = [];
  
  reasons.push(`This allocation enables joint retirement at age ${earliestAge} for $${targetSpend.toLocaleString()}/yr household spending.`);
  
  // Compare cap utilization between partners
  if (Math.abs(capUse1 - capUse2) > 0.2) {
    const higherPartner = capUse1 > capUse2 ? 1 : 2;
    const lowerPartner = capUse1 > capUse2 ? 2 : 1;
    reasons.push(`Person ${higherPartner} has higher cap utilization, while Person ${lowerPartner} has more headroom.`);
  }
  
  // Preservation age differences
  if (preservationAge1 !== preservationAge2) {
    const earlierAge = Math.min(preservationAge1, preservationAge2);
    reasons.push(`Optimization accounts for different preservation ages, with super access beginning at ${earlierAge}.`);
  }
  
  return reasons;
}

/**
 * Get display-ready strategy data for UI components
 * 
 * @param {Object} strategy - Strategy object from dwzStrategyFromState
 * @returns {Object} Formatted data for Strategy card display
 */
export function getStrategyDisplay(strategy) {
  if (!strategy.viable) {
    return {
      viable: false,
      title: 'Strategy Analysis',
      message: strategy.message,
      canOptimize: false
    };
  }

  const { recommendations, capAnalysis, rationale, earliestRetirementAge, targetSpend } = strategy;
  
  if (recommendations.person1) {
    // Couple display
    return {
      viable: true,
      title: 'Optimal Contribution Strategy (Couple)',
      earliestAge: earliestRetirementAge,
      targetSpend,
      
      splits: {
        person1: {
          salarysacrifice: recommendations.person1.salarysacrifice,
          capUse: recommendations.person1.capUtilization
        },
        person2: {
          salaryService: recommendations.person2.salaryService,
          capUse: recommendations.person2.capUtilization
        },
        outside: recommendations.outsideInvestment.amount
      },
      
      summary: `Retire at ${earliestRetirementAge} with $${Math.round(recommendations.person1.salaryService).toLocaleString()} + $${Math.round(recommendations.person2.salaryService).toLocaleString()} salary sacrifice + $${Math.round(recommendations.outsideInvestment.amount).toLocaleString()} outside investments.`,
      
      rationale: rationale,
      canOptimize: true
    };
  } else {
    // Single display
    return {
      viable: true,
      title: 'Optimal Contribution Strategy',
      earliestAge: earliestRetirementAge,
      targetSpend,
      
      splits: {
        salaryService: recommendations.salaryService.amount,
        outside: recommendations.outsideInvestment.amount,
        capUse: capAnalysis.capUtilization
      },
      
      summary: `Retire at ${earliestRetirementAge} with $${Math.round(recommendations.salaryService.amount).toLocaleString()} salary sacrifice (${capAnalysis.capUtilization}% of cap) + $${Math.round(recommendations.outsideInvestment.amount).toLocaleString()} outside investments.`,
      
      rationale: rationale,
      canOptimize: true
    };
  }
}