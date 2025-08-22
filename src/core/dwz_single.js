import { real, pmt, fv, EPS } from "./dwz_math.js";  // eslint-disable-line no-unused-vars
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

export function maxSpendDWZSingle(p, R, L) {
  R = Math.max(R, p.A); const T = Math.max(L ?? p.L, R + 1);
  
  // Get at-retirement balances
  const n0 = Math.max(0, R - p.A);
  const outAtR = fv(p.Bout, p.c_out, p.rWorkOut, n0);
  const supAtR = fv(p.Bsup, p.c_sup, p.rWorkSup, n0);
  
  const n1 = Math.max(0, Math.min(T - R, p.P - R));  // pre-preserve years
  const n2 = Math.max(0, T - Math.max(R, p.P));      // post-preserve years
  const rO = p.rRetOut, rS = p.rRetSup;

  // Special case: if R >= P, no bridge constraint, just use combined pool
  if (R >= p.P) {
    const totAtR = outAtR + supAtR;
    return pmt(totAtR, rO, T - R);
  }

  // Bridge case: R < P, must respect outside-only constraint
  // Use the min of two constraints: bridge period + post-preservation period
  
  // Constraint 1: Bridge period (outside only)
  const bridgeConstraint = pmt(outAtR, rO, n1);
  
  // Constraint 2: If there's a post-preservation period, check if that's tighter
  if (n2 > 0) {
    // What's left in outside after bridge period at this spend rate
    const remain = (W) => Money.toNumber(
      Money.sub(
        Money.mul(outAtR, Money.pow(Money.add(1, rO), n1)),
        Money.mul(W, Money.div(Money.sub(Money.pow(Money.add(1, rO), n1), 1), rO))
      )
    );
    // Super grows during bridge period
    const supAtP = Money.toNumber(Money.mul(supAtR, Money.pow(Money.add(1, rS), n1)));
    
    // Binary search to find W where post-preservation constraint is satisfied
    let lo = 0, hi = bridgeConstraint;
    
    for (let i = 0; i < 60; i++) {
      const W = (lo + hi) / 2;
      const outAtP = remain(W);
      
      if (outAtP < -EPS) {
        // Bridge broke
        hi = W;
        continue;
      }
      
      const totAtP = outAtP + supAtP;
      const end = Money.toNumber(
        Money.sub(
          Money.mul(totAtP, Money.pow(Money.add(1, rO), n2)),
          Money.mul(W, Money.div(Money.sub(Money.pow(Money.add(1, rO), n2), 1), rO))
        )
      );
      
      if (end < -EPS) {
        hi = W;
      } else {
        lo = W;
      }
      
      if (Math.abs(hi - lo) < EPS) break;
    }
    
    return Math.max(0, lo);
  } else {
    // No post-preservation period, just use bridge constraint
    return Math.max(0, bridgeConstraint);
  }
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