import * as Money from '../lib/money.js';
import { annuityFactor } from './dwz_math.js';

/**
 * Compute DWZ stepped spend schedule
 * 
 * Splits retirement into two phases:
 * - Pre-super (bridge): R to P, funded by outside wealth only
 * - Post-super: P to L, funded by remaining super wealth
 * 
 * This provides more realistic spending patterns as super becomes accessible,
 * allowing higher post-preservation spending when combined wealth is available.
 * 
 * @param {number} R - Retirement age
 * @param {number} P - Preservation age (when super becomes accessible)
 * @param {number} L - Life expectancy
 * @param {number|Decimal} W_out - Outside wealth at retirement (real dollars)
 * @param {number|Decimal} W_sup - Super wealth at retirement (real dollars)
 * @param {number} r - Real return rate (already adjusted for inflation)
 * @returns {Object} { S_pre, S_post, n_b, n_p, W_P, viable }
 */
export function computeDwzStepped(R, P, L, W_out, W_sup, r) {
  // Convert inputs to Decimal for precision
  const outsideWealth = Money.money(W_out);
  const superWealth = Money.money(W_sup);
  
  // Calculate periods
  const n_b = Math.max(0, P - R);  // Bridge years (pre-super)
  const n_p = Math.max(0, L - P);  // Post-preservation years
  
  // Initialize result
  const result = {
    S_pre: 0,
    S_post: 0,
    n_b,
    n_p,
    W_P: 0,
    viable: false
  };
  
  // Case 1: No bridge period (R >= P)
  if (n_b === 0) {
    // All wealth available immediately
    const totalWealth = Money.add(outsideWealth, superWealth);
    const retirementYears = L - R;
    
    if (retirementYears > 0) {
      const annuity = annuityFactor(retirementYears, r);
      result.S_post = Money.toNumber(Money.div(totalWealth, annuity));
      result.S_pre = 0; // No pre-super phase
      result.W_P = Money.toNumber(totalWealth);
      result.viable = true;
    }
    
    return result;
  }
  
  // Case 2: Bridge period exists (R < P)
  
  // Pre-super spend: Exhaust outside wealth by preservation age
  const bridgeAnnuity = annuityFactor(n_b, r);
  const S_pre_decimal = Money.div(outsideWealth, bridgeAnnuity);
  result.S_pre = Money.toNumber(S_pre_decimal);
  
  // Super grows during bridge period
  const growthFactor = Money.pow(Money.add(1, r), n_b);
  const W_P_decimal = Money.mul(superWealth, growthFactor);
  result.W_P = Money.toNumber(W_P_decimal);
  
  // Post-super spend: Use grown super wealth for remaining years
  if (n_p > 0) {
    const postAnnuity = annuityFactor(n_p, r);
    const S_post_decimal = Money.div(W_P_decimal, postAnnuity);
    result.S_post = Money.toNumber(S_post_decimal);
  } else {
    // Edge case: Die exactly at preservation age
    result.S_post = 0;
  }
  
  result.viable = result.S_pre > 0 && (n_p === 0 || result.S_post > 0);
  
  return result;
}

/**
 * Check if a stepped DWZ plan is viable at retirement age R
 * 
 * A plan is viable if:
 * - No bridge period OR pre-super spend >= required spend
 * - AND post-super spend >= required spend
 * 
 * @param {Object} stepped - Result from computeDwzStepped
 * @param {number} requiredSpend - Annual spending requirement
 * @returns {boolean} True if the plan is viable
 */
export function isSteppedPlanViable(stepped, requiredSpend) {
  const { S_pre, S_post, n_b, n_p } = stepped;
  
  // Check pre-super phase (if it exists)
  const preSuperOk = n_b === 0 || S_pre >= requiredSpend;
  
  // Check post-super phase (if it exists)
  const postSuperOk = n_p === 0 || S_post >= requiredSpend;
  
  return preSuperOk && postSuperOk;
}

/**
 * Find the earliest FIRE age using stepped DWZ logic
 * 
 * Uses binary search to find the smallest retirement age R where
 * the stepped plan is viable for the required spending level.
 * 
 * @param {Object} params - DWZ parameters (A, P, L, W_out_initial, W_sup_initial, etc.)
 * @param {number} requiredSpend - Annual spending requirement
 * @param {number} L - Life expectancy to use
 * @returns {number|null} Earliest viable retirement age, or null if not achievable
 */
export function earliestFireAgeSteppedDWZ(params, requiredSpend, L) {
  const { A, P, Bout, Bsup, c_out, c_sup, rWorkOut, rWorkSup, rRetOut } = params;
  
  // Binary search bounds
  let lo = A;
  let hi = Math.min(L - 1, A + 60);
  
  // Helper to compute wealth at retirement age R
  const getWealthAtR = (R) => {
    const n0 = Math.max(0, R - A);
    
    // Outside wealth at R (with contributions until R)
    let W_out;
    if (n0 === 0) {
      W_out = Bout;
    } else if (Math.abs(rWorkOut) < 1e-9) {
      W_out = Bout + c_out * n0;
    } else {
      const growthFactor = Math.pow(1 + rWorkOut, n0);
      const contributionFV = c_out * ((growthFactor - 1) / rWorkOut);
      W_out = Bout * growthFactor + contributionFV;
    }
    
    // Super wealth at R (with contributions until R)
    let W_sup;
    if (n0 === 0) {
      W_sup = Bsup;
    } else if (Math.abs(rWorkSup) < 1e-9) {
      W_sup = Bsup + c_sup * n0;
    } else {
      const growthFactor = Math.pow(1 + rWorkSup, n0);
      const contributionFV = c_sup * ((growthFactor - 1) / rWorkSup);
      W_sup = Bsup * growthFactor + contributionFV;
    }
    
    return { W_out, W_sup };
  };
  
  // Check if retirement at hi is viable
  const { W_out: W_out_hi, W_sup: W_sup_hi } = getWealthAtR(hi);
  const steppedHi = computeDwzStepped(hi, P, L, W_out_hi, W_sup_hi, rRetOut);
  
  if (!isSteppedPlanViable(steppedHi, requiredSpend)) {
    return null; // Not achievable even at latest reasonable age
  }
  
  // Binary search for earliest viable age
  for (let i = 0; i < 20; i++) {
    if (lo >= hi) break;
    
    const mid = Math.floor((lo + hi) / 2);
    const { W_out, W_sup } = getWealthAtR(mid);
    const stepped = computeDwzStepped(mid, P, L, W_out, W_sup, rRetOut);
    
    if (isSteppedPlanViable(stepped, requiredSpend)) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  
  return hi;
}

/**
 * Get the limiting constraint for a stepped DWZ plan
 * 
 * @param {Object} stepped - Result from computeDwzStepped
 * @param {number} requiredSpend - Annual spending requirement
 * @returns {string} 'pre-super', 'post-super', 'both', or 'viable'
 */
export function getSteppedConstraint(stepped, requiredSpend) {
  const { S_pre, S_post, n_b, n_p } = stepped;
  
  const preSuperFails = n_b > 0 && S_pre < requiredSpend;
  const postSuperFails = n_p > 0 && S_post < requiredSpend;
  
  if (preSuperFails && postSuperFails) return 'both';
  if (preSuperFails) return 'pre-super';
  if (postSuperFails) return 'post-super';
  return 'viable';
}