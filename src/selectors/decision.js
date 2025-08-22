import { dwzFromSingleState, maxSpendDWZSingleWithConstraint } from '../core/dwz_single.js';
import { computeDwzStepped, isSteppedPlanViable, earliestFireAgeSteppedDWZ, getSteppedConstraint } from '../core/dwz_stepped.js';

/**
 * DWZ-only decision selector for Australian FIRE Calculator
 * 
 * Returns a single source of truth for retirement decisions that all UI components
 * should read from. Uses Die-With-Zero methodology exclusively with stepped
 * spending and bequest support.
 * 
 * @param {Object} state - Current application state
 * @param {Object} rules - Australian tax/super rules
 * @returns {Object} DWZ decision object with viability, timing, and spending data
 */
export function decisionFromState(state, rules) {
  const {
    retirementAge,
    annualExpenses,
    lifeExpectancy,
    bequest = 0
  } = state;

  // Calculate real return rate
  const nominalReturn = state.expectedReturn / 100 || 0.085;
  const inflation = state.inflationRate / 100 || 0.025;
  const realReturn = (nominalReturn - inflation) / (1 + inflation);

  // Get wealth at retirement
  const yearsToRetirement = retirementAge - state.currentAge;
  let W_out = state.currentSavings || 0;
  let W_sup = state.currentSuper || 0;
  
  if (yearsToRetirement > 0) {
    const growthFactor = Math.pow(1 + realReturn, yearsToRetirement);
    
    // Outside wealth growth with savings
    const netIncome = state.annualIncome || 0;
    const netExpenses = state.annualExpenses || 0;
    const taxRate = 0.325; // Rough estimate for middle income
    const annualSavings = Math.max(0, netIncome * (1 - taxRate) - netExpenses);
    
    if (Math.abs(realReturn) < 1e-9) {
      W_out = W_out + annualSavings * yearsToRetirement;
    } else {
      W_out = W_out * growthFactor + annualSavings * ((growthFactor - 1) / realReturn);
    }
    
    // Super growth with contributions
    const superContribRate = 0.115; // Superannuation Guarantee rate
    const superContribs = (state.annualIncome || 0) * superContribRate + (state.additionalSuperContributions || 0);
    
    if (Math.abs(realReturn) < 1e-9) {
      W_sup = W_sup + superContribs * yearsToRetirement;
    } else {
      W_sup = W_sup * growthFactor + superContribs * ((growthFactor - 1) / realReturn);
    }
  }
  
  // Compute stepped DWZ spend
  const P = rules.preservation_age || 60;
  const steppedDWZ = computeDwzStepped(retirementAge, P, lifeExpectancy, W_out, W_sup, realReturn, bequest);
  
  // Check viability at target age
  const canRetireAtTarget = isSteppedPlanViable(steppedDWZ, annualExpenses);
  
  // Determine shortfall phase and amount
  let shortfallPhase = null;
  const constraint = getSteppedConstraint(steppedDWZ, annualExpenses);
  if (constraint === 'pre-super') {
    shortfallPhase = 'pre';
  } else if (constraint === 'post-super') {
    shortfallPhase = 'post';
  } else if (constraint === 'both') {
    // Use the phase with larger shortfall
    const preShortfall = annualExpenses - steppedDWZ.S_pre;
    const postShortfall = annualExpenses - steppedDWZ.S_post;
    shortfallPhase = preShortfall > postShortfall ? 'pre' : 'post';
  }
  
  // Calculate earliest FIRE age using stepped logic
  let earliestFireAge = null;
  const assumptions = {
    nominalReturnOutside: nominalReturn,
    nominalReturnSuper: nominalReturn,
    inflation: inflation
  };
  
  const dwzParams = dwzFromSingleState({
    currentAge: state.currentAge,
    longevity: lifeExpectancy,
    liquidStart: state.currentSavings || 0,
    superStart: state.currentSuper || 0,
    income: state.annualIncome || 0,
    extraSuper: state.additionalSuperContributions || 0
  }, assumptions, rules);
  
  earliestFireAge = earliestFireAgeSteppedDWZ(dwzParams, annualExpenses, lifeExpectancy, bequest);

  return {
    canRetireAtTarget,
    targetAge: retirementAge,
    earliestFireAge,
    shortfallPhase,
    kpis: {
      S_pre: steppedDWZ.S_pre,
      S_post: steppedDWZ.S_post,
      planSpend: Math.max(steppedDWZ.S_pre, steppedDWZ.S_post)
    },
    bequest,
    preservationAge: P
  };
}

/**
 * Get display-ready decision summary for UI components
 * @param {Object} decision - Decision object from decisionFromState
 * @returns {Object} Formatted strings and values for display
 */
export function getDecisionDisplay(decision) {
  const { canRetireAtTarget, targetAge, earliestFireAge, shortfallPhase, kpis } = decision;
  
  // Format sustainable spend as pre/post
  let sustainableSpendDisplay;
  let statusDetail = null;
  
  if (kpis.S_pre > 0 && kpis.S_post > 0 && Math.abs(kpis.S_pre - kpis.S_post) > 1000) {
    // Stepped spending with meaningful difference
    const preFmt = Math.round(kpis.S_pre).toLocaleString();
    const postFmt = Math.round(kpis.S_post).toLocaleString();
    sustainableSpendDisplay = `$${preFmt} / $${postFmt} per year`;
    
    // Add phase-specific status
    if (shortfallPhase === 'pre') {
      statusDetail = 'Shortfall pre-super';
    } else if (shortfallPhase === 'post') {
      statusDetail = 'Shortfall post-super';
    }
  } else {
    // Single value or very similar values
    const planSpend = Math.round(kpis.planSpend).toLocaleString();
    sustainableSpendDisplay = `$${planSpend}/yr`;
  }
  
  return {
    primaryMessage: canRetireAtTarget 
      ? `Can retire at ${targetAge} with DWZ`
      : `Cannot retire at ${targetAge} with DWZ`,
    
    sustainableSpend: sustainableSpendDisplay,
    
    status: canRetireAtTarget ? 'success' : 'warning',
    
    statusDetail,
    
    earliestMessage: earliestFireAge 
      ? `Earliest FIRE: ${earliestFireAge}`
      : 'Earliest FIRE: Not achievable'
  };
}