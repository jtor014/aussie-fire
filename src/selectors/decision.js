import { kpisFromState } from './kpis.js';
import { dwzFromSingleState, maxSpendDWZSingleWithConstraint } from '../core/dwz_single.js';
import { computeDwzStepped, isSteppedPlanViable, earliestFireAgeSteppedDWZ, getSteppedConstraint } from '../core/dwz_stepped.js';

/**
 * Unified decision selector for Australian FIRE Calculator
 * 
 * Returns a single source of truth for retirement decisions that all UI components
 * should read from. Determines whether to use DWZ or SWR approach and provides
 * all necessary data for display.
 * 
 * @param {Object} state - Current application state
 * @param {Object} rules - Australian tax/super rules
 * @returns {Object} Decision object with mode, feasibility, and all display data
 */
export function decisionFromState(state, rules) {
  const {
    dieWithZeroMode,
    retirementAge,
    annualExpenses,
    lifeExpectancy,
    safeWithdrawalRate = 4.0
  } = state;

  // Always compute KPIs for underlying data
  const kpis = kpisFromState(state, rules);
  
  if (dieWithZeroMode) {
    // === DWZ MODE ===
    // Compute stepped DWZ values if in single mode
    let steppedDWZ = null;
    let canRetireAtTarget = false;
    let shortfall = 0;
    let earliestFireAge = null;
    
    if (state.planningAs === 'single') {
      // Get wealth at retirement
      const yearsToRetirement = retirementAge - state.currentAge;
      let W_out = state.currentSavings || 0;
      let W_sup = state.currentSuper || 0;
      
      if (yearsToRetirement > 0) {
        const returnRate = kpis.returnRate || 0.05;
        const growthFactor = Math.pow(1 + returnRate, yearsToRetirement);
        
        // Outside wealth growth with savings
        const annualSavings = kpis.annualSavings || 0;
        if (Math.abs(returnRate) < 1e-9) {
          W_out = W_out + annualSavings * yearsToRetirement;
        } else {
          W_out = W_out * growthFactor + annualSavings * ((growthFactor - 1) / returnRate);
        }
        
        // Super growth with contributions
        const superContribs = kpis.superContribs?.net || 0;
        if (Math.abs(returnRate) < 1e-9) {
          W_sup = W_sup + superContribs * yearsToRetirement;
        } else {
          W_sup = W_sup * growthFactor + superContribs * ((growthFactor - 1) / returnRate);
        }
      }
      
      // Compute stepped spend
      const P = rules.preservation_age || 60;
      const r_real = kpis.returnRate || 0.05;
      steppedDWZ = computeDwzStepped(retirementAge, P, lifeExpectancy, W_out, W_sup, r_real);
      
      // Check viability
      canRetireAtTarget = isSteppedPlanViable(steppedDWZ, annualExpenses);
      
      // Calculate shortfall based on limiting phase
      const constraint = getSteppedConstraint(steppedDWZ, annualExpenses);
      if (constraint === 'pre-super') {
        shortfall = annualExpenses - steppedDWZ.S_pre;
      } else if (constraint === 'post-super') {
        shortfall = annualExpenses - steppedDWZ.S_post;
      } else if (constraint === 'both') {
        shortfall = Math.max(
          annualExpenses - steppedDWZ.S_pre,
          annualExpenses - steppedDWZ.S_post
        );
      }
      
      // Calculate earliest FIRE age using stepped logic
      const assumptions = {
        nominalReturnOutside: state.expectedReturn / 100 || 0.085,
        nominalReturnSuper: state.expectedReturn / 100 || 0.085,
        inflation: state.inflationRate / 100 || 0.025
      };
      
      const dwzParams = dwzFromSingleState({
        currentAge: state.currentAge,
        longevity: lifeExpectancy,
        liquidStart: state.currentSavings || 0,
        superStart: state.currentSuper || 0,
        income: state.annualIncome || 0,
        extraSuper: state.additionalSuperContributions || 0
      }, assumptions, rules);
      
      earliestFireAge = earliestFireAgeSteppedDWZ(dwzParams, annualExpenses, lifeExpectancy);
    } else {
      // Fallback to original calculation for non-single mode
      canRetireAtTarget = kpis.sustainableSpend >= annualExpenses;
      earliestFireAge = kpis.earliestFireAge;
      shortfall = canRetireAtTarget ? 0 : annualExpenses - kpis.sustainableSpend;
    }
    
    // Calculate binding constraint at earliest FIRE age
    let bindingConstraintAtEarliest = null;
    if (earliestFireAge && state.planningAs === 'single') {
      const assumptions = {
        nominalReturnOutside: state.expectedReturn / 100 || 0.085,
        nominalReturnSuper: state.expectedReturn / 100 || 0.085,
        inflation: state.inflationRate / 100 || 0.025
      };
      
      const dwzParams = dwzFromSingleState({
        currentAge: state.currentAge,
        longevity: lifeExpectancy,
        liquidStart: state.currentSavings || 0,
        superStart: state.currentSuper || 0,
        income: state.annualIncome || 0,
        extraSuper: state.additionalSuperContributions || 0
      }, assumptions, rules);
      
      const earliestResult = maxSpendDWZSingleWithConstraint(dwzParams, earliestFireAge, lifeExpectancy);
      bindingConstraintAtEarliest = earliestResult.constraint;
    }
    
    // Calculate SWR comparison for the comparison strip
    const swrFireNumber = annualExpenses * (100 / safeWithdrawalRate);
    const swrEarliestAge = calculateSWREarliestAge(kpis.totalWealthAtRetirement, swrFireNumber, retirementAge);
    
    return {
      mode: 'DWZ',
      canRetireAtTarget,
      targetAge: retirementAge,
      earliestFireAge,
      shortfall,
      bindingConstraintAtTarget: kpis.bindingConstraint,
      bindingConstraintAtEarliest,
      kpis,
      
      // Stepped DWZ values
      dwz: steppedDWZ ? {
        S_pre: steppedDWZ.S_pre,
        S_post: steppedDWZ.S_post,
        constraint: getSteppedConstraint(steppedDWZ, annualExpenses),
        n_b: steppedDWZ.n_b,
        n_p: steppedDWZ.n_p
      } : null,
      
      // Comparison data for DWZ vs SWR strip
      comparison: {
        swrEarliestAge,
        dwzEarliestAge: earliestFireAge,
        yearsEarlier: swrEarliestAge && earliestFireAge ? swrEarliestAge - earliestFireAge : null,
        lifeExpectancy
      }
    };
  } else {
    // === TRADITIONAL SWR MODE ===
    const canRetireAtTarget = kpis.totalWealthAtRetirement >= kpis.fireNumber;
    const shortfall = canRetireAtTarget ? 0 : kpis.fireNumber - kpis.totalWealthAtRetirement;
    
    return {
      mode: 'SWR',
      canRetireAtTarget,
      targetAge: retirementAge,
      earliestFireAge: null, // SWR mode doesn't calculate earliest FIRE age
      shortfall,
      bindingConstraintAtTarget: null, // Only applicable to DWZ mode
      bindingConstraintAtEarliest: null,
      kpis,
      
      // No comparison in SWR mode
      comparison: null
    };
  }
}

/**
 * Calculate earliest FIRE age using traditional SWR approach
 * @param {number} totalWealth - Total wealth at target retirement age
 * @param {number} fireNumber - Required FIRE number (expenses / SWR)
 * @param {number} targetAge - Target retirement age
 * @returns {number|null} Earliest age when FIRE number is reached, or null if not achievable
 */
function calculateSWREarliestAge(totalWealth, fireNumber, targetAge) {
  // Simple calculation: if we already have enough at target age, 
  // we could have retired earlier when wealth first hit the FIRE number
  if (totalWealth >= fireNumber) {
    // This is a simplified calculation - in reality we'd need to work backwards
    // through the wealth accumulation curve to find when it first hit fireNumber
    // For now, assume we could retire a few years earlier proportional to excess wealth
    const excessRatio = totalWealth / fireNumber;
    const yearsEarlier = Math.min(5, Math.floor((excessRatio - 1) * 10)); // Max 5 years earlier
    return Math.max(targetAge - yearsEarlier, targetAge - 10); // Don't go more than 10 years back
  }
  
  return null; // Not achievable with SWR at any reasonable age
}

/**
 * Get the constraint caption for the earliest FIRE age
 * @param {string} constraint - 'bridge' or 'post'
 * @param {number} earliestAge - The earliest FIRE age
 * @returns {string} Caption explaining the constraint
 */
function getEarliestConstraintCaption(constraint, earliestAge) {
  if (constraint === 'bridge') {
    return `Earliest is bridge-limited at ${earliestAge}; changing life expectancy won't move it unless outside savings or plan changes.`;
  } else if (constraint === 'post') {
    return `Earliest is horizon-limited; shortening life expectancy can bring it earlier.`;
  }
  return '';
}

/**
 * Get display-ready decision summary for UI components
 * @param {Object} decision - Decision object from decisionFromState
 * @returns {Object} Formatted strings and values for display
 */
export function getDecisionDisplay(decision) {
  const { mode, canRetireAtTarget, targetAge, earliestFireAge, shortfall, kpis, bindingConstraintAtEarliest, dwz } = decision;
  
  if (mode === 'DWZ') {
    // Format sustainable spend based on stepped or flat DWZ
    let sustainableSpendDisplay;
    let statusDetail = null;
    
    if (dwz && dwz.n_b > 0) {
      // Stepped DWZ with bridge period
      const preFmt = Math.round(dwz.S_pre).toLocaleString();
      const postFmt = Math.round(dwz.S_post).toLocaleString();
      sustainableSpendDisplay = `$${preFmt} / $${postFmt} per year`;
      
      // Add phase-specific status
      if (dwz.constraint === 'pre-super') {
        statusDetail = 'Shortfall pre-super';
      } else if (dwz.constraint === 'post-super') {
        statusDetail = 'Shortfall post-super';
      } else if (dwz.constraint === 'both') {
        statusDetail = 'Shortfall both phases';
      }
    } else if (dwz && dwz.n_b === 0) {
      // No bridge period, single spend value
      sustainableSpendDisplay = `$${Math.round(dwz.S_post).toLocaleString()}/yr`;
    } else {
      // Fallback to original display
      sustainableSpendDisplay = `$${Math.round(kpis.sustainableSpend).toLocaleString()}/yr`;
    }
    
    return {
      primaryMessage: canRetireAtTarget 
        ? `Can retire at ${targetAge} with DWZ`
        : `Cannot retire at ${targetAge} with DWZ`,
      
      sustainableSpend: sustainableSpendDisplay,
      
      status: canRetireAtTarget ? 'success' : 'warning',
      
      statusDetail,
      
      shortfallMessage: shortfall > 0 
        ? `Shortfall: $${Math.round(shortfall).toLocaleString()}/yr`
        : null,
        
      earliestMessage: earliestFireAge 
        ? `Earliest FIRE: ${earliestFireAge}`
        : 'Earliest FIRE: Not achievable',
        
      // Add constraint caption for earliest FIRE age
      earliestConstraintCaption: earliestFireAge && bindingConstraintAtEarliest 
        ? getEarliestConstraintCaption(bindingConstraintAtEarliest, earliestFireAge)
        : null,
        
      // Add stepped mode indicator
      steppedModeCaption: dwz && dwz.n_b > 0
        ? 'DWZ uses a stepped spend: outside-only before preservation, higher after super unlocks.'
        : null
    };
  } else {
    return {
      primaryMessage: canRetireAtTarget 
        ? `On track to retire at ${targetAge}`
        : `Behind target for ${targetAge}`,
        
      sustainableSpend: `$${Math.round(kpis.totalWealthAtRetirement * 0.04).toLocaleString()}/yr (4% rule)`,
      
      status: canRetireAtTarget ? 'success' : 'warning',
      
      shortfallMessage: shortfall > 0 
        ? `Shortfall: $${Math.round(shortfall).toLocaleString()}`
        : null,
        
      earliestMessage: null // SWR mode doesn't show earliest FIRE
    };
  }
}

/**
 * Get comparison strip data for DWZ mode
 * @param {Object} decision - Decision object from decisionFromState
 * @returns {Object|null} Comparison data or null if not applicable
 */
export function getComparisonStrip(decision) {
  if (decision.mode !== 'DWZ' || !decision.comparison) {
    return null;
  }
  
  const { swrEarliestAge, dwzEarliestAge, yearsEarlier, lifeExpectancy } = decision.comparison;
  
  return {
    swrText: swrEarliestAge 
      ? `SWR (infinite horizon): retire at ${swrEarliestAge}`
      : 'SWR (infinite horizon): not achievable in reasonable timeframe',
      
    dwzText: dwzEarliestAge
      ? `DWZ @ L=${lifeExpectancy}: earliest FIRE = ${dwzEarliestAge}`
      : `DWZ @ L=${lifeExpectancy}: not achievable`,
      
    benefitText: yearsEarlier && yearsEarlier > 0
      ? `You retire **${yearsEarlier} years earlier** with DWZ.`
      : dwzEarliestAge && swrEarliestAge && dwzEarliestAge <= swrEarliestAge
      ? 'DWZ enables earlier retirement than infinite horizon planning.'
      : 'Consider adjusting life expectancy or increasing savings for earlier retirement.'
  };
}