import * as Money from '../lib/money.js';
import { computeDwzStepped } from '../core/dwz_stepped.js';

/**
 * Generate wealth depletion path data for charting
 * 
 * Shows the trajectory of total wealth from retirement to life expectancy,
 * with stepped spending and bequest target.
 * 
 * @param {Object} params - Parameters for depletion calculation
 * @param {number} params.R - Retirement age
 * @param {number} params.P - Preservation age
 * @param {number} params.L - Life expectancy
 * @param {number} params.W_out - Outside wealth at retirement (real dollars)
 * @param {number} params.W_sup - Super wealth at retirement (real dollars)
 * @param {number} params.r - Real return rate
 * @param {number} params.S_pre - Pre-super spending rate
 * @param {number} params.S_post - Post-super spending rate
 * @param {number} params.bequest - Target bequest amount
 * @returns {Array} Array of { age, total, outside, super, spend } objects
 */
export function generateDepletionPath(params) {
  const { R, P, L, W_out, W_sup, r, S_pre, S_post, bequest = 0 } = params;
  
  const path = [];
  
  // Initialize wealth tracking
  let outsideWealth = Money.money(W_out);
  let superWealth = Money.money(W_sup);
  
  // Generate path from retirement to life expectancy
  for (let age = R; age <= L; age++) {
    // Determine current spending rate
    const currentSpend = age < P ? S_pre : S_post;
    
    // Record current state
    path.push({
      age,
      total: Money.toNumber(Money.add(outsideWealth, superWealth)),
      outside: Money.toNumber(outsideWealth),
      super: Money.toNumber(superWealth),
      spend: currentSpend
    });
    
    // Don't update wealth for the final year (L)
    if (age === L) break;
    
    // Update wealth for next year
    if (age < P) {
      // Pre-preservation: spend from outside only
      outsideWealth = Money.sub(
        Money.mul(outsideWealth, Money.add(1, r)),
        currentSpend
      );
      
      // Super continues to grow
      superWealth = Money.mul(superWealth, Money.add(1, r));
      
      // Ensure outside doesn't go negative
      if (Money.toNumber(outsideWealth) < 0) {
        outsideWealth = Money.money(0);
      }
    } else {
      // Post-preservation: spend from combined pool
      // For simplicity, deplete proportionally
      const totalWealth = Money.add(outsideWealth, superWealth);
      const totalAfterSpend = Money.sub(
        Money.mul(totalWealth, Money.add(1, r)),
        currentSpend
      );
      
      if (Money.toNumber(totalAfterSpend) > 0) {
        // Allocate remaining wealth proportionally
        const outsideRatio = Money.toNumber(outsideWealth) / Money.toNumber(totalWealth);
        const superRatio = 1 - outsideRatio;
        
        outsideWealth = Money.mul(totalAfterSpend, outsideRatio);
        superWealth = Money.mul(totalAfterSpend, superRatio);
      } else {
        // Depleted
        outsideWealth = Money.money(0);
        superWealth = Money.money(0);
      }
    }
  }
  
  return path;
}

/**
 * Calculate wealth depletion path from decision state
 * 
 * @param {Object} state - Application state
 * @param {Object} decision - Decision object from decisionFromState
 * @param {Object} rules - Australian tax/super rules
 * @returns {Object} { path, markers, annotations }
 */
export function depletionFromDecision(state, decision, rules) {
  if (!decision.kpis) {
    return null;
  }
  
  const { targetAge: R, kpis } = decision;
  const P = rules.preservation_age || 60;
  const L = state.lifeExpectancy;
  const bequest = state.bequest || 0;
  
  // Get wealth at retirement
  const yearsToRetirement = R - state.currentAge;
  const returnRate = (state.expectedReturn / 100 - state.inflationRate / 100) || 0.05;
  
  let W_out = state.currentSavings || 0;
  let W_sup = state.currentSuper || 0;
  
  if (yearsToRetirement > 0) {
    const growthFactor = Math.pow(1 + returnRate, yearsToRetirement);
    
    // Outside wealth growth with savings
    const annualSavings = state.annualIncome - state.annualExpenses - 
                         (state.annualIncome * 0.325); // Rough tax estimate
    if (Math.abs(returnRate) < 1e-9) {
      W_out = W_out + annualSavings * yearsToRetirement;
    } else {
      W_out = W_out * growthFactor + annualSavings * ((growthFactor - 1) / returnRate);
    }
    
    // Super growth with contributions
    const superContrib = state.annualIncome * 0.115; // SG rate
    if (Math.abs(returnRate) < 1e-9) {
      W_sup = W_sup + superContrib * yearsToRetirement;
    } else {
      W_sup = W_sup * growthFactor + superContrib * ((growthFactor - 1) / returnRate);
    }
  }
  
  // Generate path
  const path = generateDepletionPath({
    R,
    P,
    L,
    W_out,
    W_sup,
    r: returnRate,
    S_pre: kpis.S_pre,
    S_post: kpis.S_post,
    bequest
  });
  
  // Create markers and annotations
  const markers = [
    {
      x: P,
      label: 'Super unlocks',
      type: 'preservation'
    },
    {
      x: L,
      label: `Life expectancy (${L})`,
      type: 'horizon'
    }
  ];
  
  const annotations = [];
  
  // Add bequest annotation if applicable
  if (bequest > 0) {
    annotations.push({
      x: L,
      y: bequest,
      label: `Bequest: $${Math.round(bequest).toLocaleString()}`
    });
  }
  
  // Add spend step annotation
  if (kpis.S_pre > 0 && Math.abs(kpis.S_post - kpis.S_pre) > 1000) {
    annotations.push({
      x: P,
      y1: kpis.S_pre,
      y2: kpis.S_post,
      label: 'Spend increases',
      type: 'step'
    });
  }
  
  return {
    path,
    markers,
    annotations
  };
}