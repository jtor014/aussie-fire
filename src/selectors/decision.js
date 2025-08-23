import { dwzFromSingleState, maxSpendDWZSingleWithConstraint } from '../core/dwz_single.js';
import { computeDwzStepped, isSteppedPlanViable, earliestFireAgeSteppedDWZ, getSteppedConstraint } from '../core/dwz_stepped.js';
import { solveSustainableSpending, findEarliestRetirement, checkConstraintViolations } from '../core/dwz_age_band.js';
import Decimal from 'decimal.js-light';

/**
 * DWZ-only decision selector for Australian FIRE Calculator
 * 
 * Returns a single source of truth for retirement decisions that all UI components
 * should read from. Uses Die-With-Zero methodology with age-band spending
 * multipliers and bequest support.
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

  // Calculate return rates
  const nominalReturn = new Decimal(state.expectedReturn / 100 || 0.085);
  const inflation = new Decimal(state.inflationRate / 100 || 0.025);
  const realReturn = nominalReturn.sub(inflation).div(inflation.add(1));

  // Preservation age - use default 60 for now (can be enhanced later for age-specific lookup)
  const P = 60;

  // Calculate wealth at retirement age
  function getWealthAtAge(targetAge) {
    const yearsToRetirement = targetAge - state.currentAge;
    let W_out = new Decimal(state.currentSavings || 0);
    let W_sup = new Decimal(state.currentSuper || 0);
    
    if (yearsToRetirement > 0) {
      // Outside wealth growth with savings
      const netIncome = new Decimal(state.annualIncome || 0);
      const netExpenses = new Decimal(state.annualExpenses || 0);
      const taxRate = new Decimal(0.325);
      const savingsCalc = netIncome.mul(new Decimal(1).sub(taxRate)).sub(netExpenses);
      const annualSavings = savingsCalc.gt(0) ? savingsCalc : new Decimal(0);
      
      if (realReturn.abs().lt(1e-9)) {
        W_out = W_out.add(annualSavings.mul(yearsToRetirement));
      } else {
        const growthFactor = realReturn.add(1).pow(yearsToRetirement);
        const annuityFactor = growthFactor.sub(1).div(realReturn);
        W_out = W_out.mul(growthFactor).add(annualSavings.mul(annuityFactor));
      }
      
      // Super growth with contributions
      const superContribRate = new Decimal(0.115);
      const superContribs = netIncome.mul(superContribRate).add(state.additionalSuperContributions || 0);
      
      if (realReturn.abs().lt(1e-9)) {
        W_sup = W_sup.add(superContribs.mul(yearsToRetirement));
      } else {
        const growthFactor = realReturn.add(1).pow(yearsToRetirement);
        const annuityFactor = growthFactor.sub(1).div(realReturn);
        W_sup = W_sup.mul(growthFactor).add(superContribs.mul(annuityFactor));
      }
    }
    
    return { outsideWealth: W_out, superWealth: W_sup };
  }

  // Find earliest retirement using age-band engine
  const earliestResult = findEarliestRetirement({
    currentAge: state.currentAge,
    maxRetirementAge: Math.min(P, lifeExpectancy - 5), // Don't retire too close to death
    currentOutside: new Decimal(state.currentSavings || 0),
    currentSuper: new Decimal(state.currentSuper || 0),
    annualSavings: new Decimal(Math.max(0, (state.annualIncome || 0) * 0.675 - (state.annualExpenses || 0))),
    annualSuperContrib: new Decimal((state.annualIncome || 0) * 0.115 + (state.additionalSuperContributions || 0)),
    nominalReturn: nominalReturn,
    inflation: inflation,
    lifeExpectancy,
    preservationAge: P,
    bequest: new Decimal(bequest),
    minSpending: new Decimal(annualExpenses)
  });

  // T-015: Always use earliest age (no pinned mode)
  const targetAge = earliestResult.earliestAge || retirementAge;

  // Get wealth at target age
  const { outsideWealth, superWealth } = getWealthAtAge(targetAge);

  // Solve sustainable spending at target age
  const solution = solveSustainableSpending({
    retirementAge: targetAge,
    lifeExpectancy,
    outsideWealth,
    superWealth,
    preservationAge: P,
    realReturn,
    bequest: new Decimal(bequest)
  });

  // Check if viable at target spending level
  const canRetireAtTarget = solution.sustainableAnnual.gte(annualExpenses);

  // Check constraint violations
  const constraints = checkConstraintViolations({
    retirementAge: targetAge,
    lifeExpectancy,
    outsideWealth,
    superWealth,
    preservationAge: P,
    realReturn,
    bequest: new Decimal(bequest),
    sustainableSpending: solution.sustainableAnnual
  });

  // Determine shortfall phase
  let shortfallPhase = null;
  if (!canRetireAtTarget) {
    if (!constraints.bridgeViable && !constraints.postViable) {
      shortfallPhase = 'both';
    } else if (!constraints.bridgeViable) {
      shortfallPhase = 'pre';
    } else if (!constraints.postViable) {
      shortfallPhase = 'post';
    }
  }

  // Generate backward-compatible S_pre and S_post values
  // For age bands, we approximate by using band multipliers
  const bands = solution.bands;
  let S_pre = solution.sustainableAnnual;
  let S_post = solution.sustainableAnnual;

  // Find representative spending for pre-super (bridge) period
  const bridgeBand = bands.find(band => band.startAge < P && band.endAge > targetAge);
  if (bridgeBand) {
    S_pre = solution.sustainableAnnual.mul(bridgeBand.multiplier);
  }

  // Find representative spending for post-super period  
  const postBand = bands.find(band => band.startAge >= P);
  if (postBand) {
    S_post = solution.sustainableAnnual.mul(postBand.multiplier);
  }

  return {
    canRetireAtTarget,
    targetAge,
    earliestFireAge: earliestResult.earliestAge,
    shortfallPhase,
    kpis: {
      sustainableAnnual: solution.sustainableAnnual.toNumber(),
      bands: bands.map(band => ({
        ...band,
        multiplier: band.multiplier.toNumber()
      })),
      // Backward compatibility
      S_pre: S_pre.toNumber(),
      S_post: S_post.toNumber(),
      planSpend: S_pre.gt(S_post) ? S_pre.toNumber() : S_post.toNumber()
    },
    bequest,
    preservationAge: P,
    constraintAtEarliest: earliestResult.earliestAge ? {
      bridgeViable: constraints.bridgeViable,
      postViable: constraints.postViable
    } : null
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