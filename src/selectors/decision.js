import { kpisFromState } from './kpis.js';

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
    const canRetireAtTarget = kpis.sustainableSpend >= annualExpenses;
    const earliestFireAge = kpis.earliestFireAge;
    const shortfall = canRetireAtTarget ? 0 : annualExpenses - kpis.sustainableSpend;
    
    // Calculate SWR comparison for the comparison strip
    const swrFireNumber = annualExpenses * (100 / safeWithdrawalRate);
    const swrEarliestAge = calculateSWREarliestAge(kpis.totalWealthAtRetirement, swrFireNumber, retirementAge);
    
    return {
      mode: 'DWZ',
      canRetireAtTarget,
      targetAge: retirementAge,
      earliestFireAge,
      shortfall,
      bindingConstraint: kpis.bindingConstraint,
      kpis,
      
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
      bindingConstraint: null, // Only applicable to DWZ mode
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
 * Get display-ready decision summary for UI components
 * @param {Object} decision - Decision object from decisionFromState
 * @returns {Object} Formatted strings and values for display
 */
export function getDecisionDisplay(decision) {
  const { mode, canRetireAtTarget, targetAge, earliestFireAge, shortfall, kpis } = decision;
  
  if (mode === 'DWZ') {
    return {
      primaryMessage: canRetireAtTarget 
        ? `Can retire at ${targetAge} with DWZ`
        : `Cannot retire at ${targetAge} with DWZ`,
      
      sustainableSpend: `$${Math.round(kpis.sustainableSpend).toLocaleString()}/yr`,
      
      status: canRetireAtTarget ? 'success' : 'warning',
      
      shortfallMessage: shortfall > 0 
        ? `Shortfall: $${Math.round(shortfall).toLocaleString()}/yr`
        : null,
        
      earliestMessage: earliestFireAge 
        ? `Earliest FIRE: ${earliestFireAge}`
        : 'Earliest FIRE: Not achievable'
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