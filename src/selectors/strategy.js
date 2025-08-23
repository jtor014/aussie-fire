import { optimiseSplitSingle, optimiseSplitCouple } from '../core/optimizer/split_optimizer.js';
import Decimal from 'decimal.js-light';

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

  // Calculate return rates for age-band engine
  const nominalReturn = new Decimal(expectedReturn / 100 || 0.085);
  const inflation = new Decimal(inflationRate / 100 || 0.025);
  
  // Australian super settings
  const sgPct = 0.115; // 11.5% for 2024
  const concessionalCap = 30000; // 2024-25 cap
  const preservationAge = 60; // Default preservation age
  
  // Build assumptions object
  const assumptions = { nominalReturn, inflation };

  if (planningAs === 'single') {
    return generateSingleStrategy({
      currentAge,
      retirementAge: currentAge + 30, // Placeholder for optimization
      lifeExpectancy,
      preservationAge,
      currentOutside: currentSavings,
      currentSuper,
      salary: annualIncome,
      insurance: superInsurancePremiums,
      annualSavingsBudget,
      targetSpend,
      bequest,
      sgPct,
      concessionalCap,
      assumptions
    });
  } else {
    return generateCoupleStrategy({
      currentAge,
      retirementAge: currentAge + 30, // Placeholder for optimization
      lifeExpectancy,
      preservationAge1: preservationAge,
      preservationAge2: preservationAge,
      currentOutside: currentSavings,
      currentSuper1: currentSuper,
      currentSuper2: partnerB.currentSuper || 0,
      salary1: annualIncome,
      salary2: partnerB.annualIncome || 0,
      insurance1: superInsurancePremiums,
      insurance2: partnerB.superInsurancePremiums || 1000,
      annualSavingsBudget,
      targetSpend,
      bequest,
      sgPct,
      concessionalCap,
      assumptions
    });
  }
}

/**
 * Generate strategy recommendation for single person
 */
function generateSingleStrategy(params) {
  const optimization = optimiseSplitSingle(params);
  
  if (!optimization || !optimization.earliestAge) {
    return {
      viable: false,
      message: `Cannot achieve $${params.targetSpend.toLocaleString()}/yr target spend with current savings budget`,
      recommendations: null
    };
  }

  const { earliestAge, splits, rationale } = optimization;
  const { person1, outside } = splits;

  // Calculate employer SG contribution for display
  const sgContribution = params.salary * params.sgPct;
  
  return {
    viable: true,
    earliestRetirementAge: earliestAge,
    targetSpend: params.targetSpend,
    bequest: params.bequest,
    lifeExpectancy: params.lifeExpectancy,
    
    recommendations: {
      salarysacrifice: {
        amount: person1.sac,
        percentage: Math.round((person1.sac / params.annualSavingsBudget) * 100)
      },
      outsideInvestment: {
        amount: outside,
        percentage: Math.round((outside / params.annualSavingsBudget) * 100)
      },
      totalBudget: params.annualSavingsBudget
    },
    
    capAnalysis: {
      employerSG: Math.round(sgContribution),
      salarysacrifice: person1.sac,
      totalConcessional: Math.round(sgContribution + person1.sac),
      concessionalCap: params.concessionalCap,
      capUtilization: person1.capUsePct,
      overflow: Math.max(0, params.annualSavingsBudget - person1.sac - outside),
      hasOverflow: (params.annualSavingsBudget - person1.sac - outside) > 100
    },
    
    rationale: rationale || []
  };
}

/**
 * Generate strategy recommendation for couple
 */
function generateCoupleStrategy(params) {
  const optimization = optimiseSplitCouple(params);
  
  if (!optimization || !optimization.earliestAge) {
    return {
      viable: false,
      message: `Cannot achieve $${params.targetSpend.toLocaleString()}/yr target spend with current savings budget`,
      recommendations: null
    };
  }

  const { earliestAge, splits, rationale } = optimization;
  const { person1, person2, outside } = splits;

  // Calculate employer SG contributions
  const sgContrib1 = params.salary1 * params.sgPct;
  const sgContrib2 = params.salary2 * params.sgPct;
  
  return {
    viable: true,
    earliestRetirementAge: earliestAge,
    targetSpend: params.targetSpend,
    bequest: params.bequest,
    lifeExpectancy: params.lifeExpectancy,
    
    recommendations: {
      person1: {
        salarysacrifice: person1.sac,
        capUtilization: person1.capUsePct
      },
      person2: {
        salarysacrifice: person2.sac, 
        capUtilization: person2.capUsePct
      },
      outsideInvestment: {
        amount: outside,
        percentage: Math.round((outside / params.annualSavingsBudget) * 100)
      },
      totalBudget: params.annualSavingsBudget
    },
    
    capAnalysis: {
      person1: {
        employerSG: Math.round(sgContrib1),
        salarysacrifice: person1.sac,
        totalConcessional: Math.round(sgContrib1 + person1.sac),
        capUtilization: person1.capUsePct,
        overflow: Math.max(0, (params.annualSavingsBudget * 0.5) - person1.sac)
      },
      person2: {
        employerSG: Math.round(sgContrib2),
        salarysacrifice: person2.sac,
        totalConcessional: Math.round(sgContrib2 + person2.sac),
        capUtilization: person2.capUsePct,
        overflow: Math.max(0, (params.annualSavingsBudget * 0.5) - person2.sac)
      },
      concessionalCap: params.concessionalCap
    },
    
    rationale: rationale || []
  };
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
          salarysacrifice: recommendations.person2.salarysacrifice,
          capUse: recommendations.person2.capUtilization
        },
        outside: recommendations.outsideInvestment.amount
      },
      
      summary: `Retire at ${earliestRetirementAge} with $${Math.round(recommendations.person1.salarysacrifice).toLocaleString()} + $${Math.round(recommendations.person2.salarysacrifice).toLocaleString()} salary sacrifice + $${Math.round(recommendations.outsideInvestment.amount).toLocaleString()} outside investments.`,
      
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
        salarysacrifice: recommendations.salarysacrifice.amount,
        outside: recommendations.outsideInvestment.amount,
        capUse: capAnalysis.capUtilization
      },
      
      summary: `Retire at ${earliestRetirementAge} with $${Math.round(recommendations.salarysacrifice.amount).toLocaleString()} salary sacrifice (${capAnalysis.capUtilization}% of cap) + $${Math.round(recommendations.outsideInvestment.amount).toLocaleString()} outside investments.`,
      
      rationale: rationale,
      canOptimize: true
    };
  }
}