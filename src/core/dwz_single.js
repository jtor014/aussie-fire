import { real, pmt, fv, remain, EPS } from "./dwz_math.js";
import { calcSuperContribs } from "./super.js";

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
  const n0 = R - p.A;
  let out = fv(p.Bout, p.c_out, p.rWorkOut, n0);
  let sup = fv(p.Bsup, p.c_sup, p.rWorkSup, n0);

  // segments: (R->min(P,T)) (min->T)
  const t1 = Math.min(p.P, T), t2 = T;
  let W = Infinity;

  // segment 1: before preservation (outside only)
  if (R < t1) {
    const n1 = t1 - R;
    W = Math.min(W, pmt(out, p.rRetOut, n1));
    out = remain(out, W, p.rRetOut, n1);
    sup *= Math.pow(1 + p.rRetSup, n1); // grows locked
  }
  // segment 2: after preservation (outside + super)
  const n2 = t2 - t1;
  if (n2 > 0) {
    const pool = out + sup;
    W = Math.min(W, pmt(pool, p.rRetSup, n2));
  }
  return Math.max(0, W);
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