import { real, pmt, fv, EPS, annuityFactor } from "./dwz_math.js";  // eslint-disable-line no-unused-vars
import { calcSuperContribs } from "./super.js";
import * as Money from "../lib/money.js";

// builder from your existing person A state
export function dwzFromSingleState(person, assumptions, rules) {
  const rOut = real(assumptions.nominalReturnOutside, assumptions.inflation);
  const rSup = real(assumptions.nominalReturnSuper, assumptions.inflation);
  const { employer, additional: yourExtra = 0 } = calcSuperContribs(person.income || 0, person.extraSuper || 0, 0, rules);

  const baseParams = {
    A: person.currentAge, L: person.longevity ?? 90, P: rules.preservation_age ?? 60,
    rWorkOut: rOut, rWorkSup: rSup, rRetOut: rOut, rRetSup: rSup,
    Bout: person.liquidStart || 0, Bsup: person.superStart || 0,
    c_out: 0, c_sup: (employer || 0) + (yourExtra || 0),
  };

  return baseParams;
}

// Helper to calculate at-retirement balances for a given retirement age
export function getAtRetirementBalances(p, R) {
  const n0 = Math.max(0, R - p.A);
  const outAtR = fv(p.Bout, p.c_out, p.rWorkOut, n0);
  const supAtR = fv(p.Bsup, p.c_sup, p.rWorkSup, n0);
  return { outAtR, supAtR, rRetOut: p.rRetOut, rRetSup: p.rRetSup, P: p.P };
}

export function maxSpendDWZSingleWithConstraint(p, R, L) {
  R = Math.max(R, p.A); 
  const lifeExp = Math.max(L ?? p.L, R + 1);
  
  // Get at-retirement balances (in real dollars)
  const n0 = Math.max(0, R - p.A);
  const W_out = Money.money(fv(p.Bout, p.c_out, p.rWorkOut, n0));
  const W_sup = Money.money(fv(p.Bsup, p.c_sup, p.rWorkSup, n0));
  
  // Calculate periods using the formula from ticket
  const n_b = Math.max(0, p.P - R);  // bridge years: max(0, P - R)
  const n_p = Math.max(0, lifeExp - p.P);  // post-preservation years: L - P
  const r_real = p.rRetOut;  // real return rate already calculated
  
  // Case 1: R >= P (no bridge period needed)
  if (R >= p.P) {
    const totalWealth = Money.add(W_out, W_sup);
    const retirementYears = lifeExp - R;
    const annuity = annuityFactor(retirementYears, r_real);
    
    return {
      spend: Money.toNumber(Money.div(totalWealth, annuity)),
      constraint: 'post'
    };
  }
  
  // Case 2: R < P (bridge period exists)
  // Calculate bridge constraint: S_bridge = W_out / a(n_b, r_real)
  let S_bridge = Infinity;
  if (n_b > 0) {
    const bridgeAnnuity = annuityFactor(n_b, r_real);
    S_bridge = Money.toNumber(Money.div(W_out, bridgeAnnuity));
  }
  
  // Calculate post-preservation constraint if post-preservation period exists
  let S_post = Infinity;
  if (n_p > 0) {
    // W_P = (W_out + W_sup) * (1 + r_real)^(n_b)
    const totalWealthAtR = Money.add(W_out, W_sup);
    const growthFactor = Money.pow(Money.add(1, r_real), n_b);
    const W_P = Money.mul(totalWealthAtR, growthFactor);
    
    // Denominator: a(n_b, r_real) * (1 + r_real)^(n_b) + a(n_p, r_real)
    const bridgeAnnuity = annuityFactor(n_b, r_real);
    const postAnnuity = annuityFactor(n_p, r_real);
    const bridgeTerm = Money.mul(bridgeAnnuity, growthFactor);
    const denominator = Money.add(bridgeTerm, postAnnuity);
    
    S_post = Money.toNumber(Money.div(W_P, denominator));
  }
  
  // S = min(S_bridge, S_post) and determine which constraint is binding
  const S_bridge_num = S_bridge === Infinity ? Number.MAX_VALUE : S_bridge;
  const S_post_num = S_post === Infinity ? Number.MAX_VALUE : S_post;
  
  if (S_bridge_num <= S_post_num) {
    return {
      spend: Math.max(0, S_bridge),
      constraint: 'bridge'
    };
  } else {
    return {
      spend: Math.max(0, S_post),
      constraint: 'post'
    };
  }
}

export function maxSpendDWZSingle(p, R, L) {
  return maxSpendDWZSingleWithConstraint(p, R, L).spend;
}

export function earliestFireAgeDWZSingle(p, requiredSpend, L) {
  let lo = p.A, hi = Math.min(p.L - 1, lo + 60);
  if (maxSpendDWZSingle(p, hi, L) + 1e-6 < requiredSpend) return null;
  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((lo + hi) / 2);
    (maxSpendDWZSingle(p, mid, L) >= requiredSpend) ? (hi = mid) : (lo = mid + 1);
  }
  return hi;
}