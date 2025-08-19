import { real, pmt, fv, remain } from "./dwz_math.js";
import { calcSuperContribs } from "./super.js";

export function dwzPersonFromState(person, assumptions, rules) {
  const rOut = real(assumptions.nominalReturnOutside, assumptions.inflation);
  const rSup = real(assumptions.nominalReturnSuper, assumptions.inflation);
  const { employer, additional: yourExtra = 0 } = calcSuperContribs(person.income || 0, person.extraSuper || 0, 0, rules);
  return {
    A: person.currentAge, L: person.longevity ?? 90, P: person.preservationAge ?? (rules.preservation_age ?? 60),
    rWorkOut: rOut, rWorkSup: rSup, rRetOut: rOut, rRetSup: rSup,
    Bout: person.liquidStart || 0, Bsup: person.superStart || 0,
    c_out: 0, c_sup: (employer || 0) + (yourExtra || 0),
  };
}

// Helper to calculate at-retirement balances for couples
export function getCoupleAtRetirementBalances(pA, pB, R) {
  const n0a = Math.max(0, R - pA.A);
  const n0b = Math.max(0, R - pB.A);
  
  const outAtRA = fv(pA.Bout, pA.c_out, pA.rWorkOut, n0a);
  const outAtRB = fv(pB.Bout, pB.c_out, pB.rWorkOut, n0b);
  const supAtRA = fv(pA.Bsup, pA.c_sup, pA.rWorkSup, n0a);
  const supAtRB = fv(pB.Bsup, pB.c_sup, pB.rWorkSup, n0b);

  return {
    pA: { outAtR: outAtRA, supAtR: supAtRA, rRetOut: pA.rRetOut, rRetSup: pA.rRetSup, P: pA.P },
    pB: { outAtR: outAtRB, supAtR: supAtRB, rRetOut: pB.rRetOut, rRetSup: pB.rRetSup, P: pB.P },
    Lh: Math.max(pA.L, pB.L)
  };
}

const blended = (pA, pB) => (pA.rRetSup + pB.rRetSup) / 2;

export function maxSpendDWZCouple(pA, pB, R, Lh) {
  R = Math.max(R, pA.A, pB.A); const L = Math.max(Lh ?? Math.max(pA.L, pB.L), R + 1);
  const n0a = R - pA.A, n0b = R - pB.A;

  // balances at R
  let out = fv(pA.Bout, pA.c_out, pA.rWorkOut, n0a) + fv(pB.Bout, pB.c_out, pB.rWorkOut, n0b);
  let supA = fv(pA.Bsup, pA.c_sup, pA.rWorkSup, n0a);
  let supB = fv(pB.Bsup, pB.c_sup, pB.rWorkSup, n0b);

  let unlocked = 0;
  if (R >= pA.P) { unlocked += supA; supA = 0; }
  if (R >= pB.P) { unlocked += supB; supB = 0; }

  const t1 = Math.min(pA.P, pB.P, L);
  const t2 = Math.min(Math.max(pA.P, pB.P), L);
  const t3 = L;

  let W = Infinity;
  // seg1
  if (R < t1) {
    const n1 = t1 - R;
    const bothLocked = (R < pA.P) && (R < pB.P);
    if (bothLocked) {
      W = Math.min(W, pmt(out, pA.rRetOut, n1));
      out = remain(out, W, pA.rRetOut, n1);
      supA *= Math.pow(1 + pA.rRetSup, n1); supB *= Math.pow(1 + pB.rRetSup, n1);
    } else {
      const pool = out + unlocked;
      W = Math.min(W, pmt(pool, blended(pA, pB), n1));
      out = remain(pool, W, blended(pA, pB), n1);
      unlocked = 0;
      supA *= Math.pow(1 + pA.rRetSup, n1); supB *= Math.pow(1 + pB.rRetSup, n1);
    }
  }
  if (t1 === pA.P && supA > 0) { unlocked += supA; supA = 0; }
  if (t1 === pB.P && supB > 0) { unlocked += supB; supB = 0; }

  // seg2
  if (t2 > t1) {
    const n2 = t2 - t1;
    const pool = out + unlocked;
    W = Math.min(W, pmt(pool, blended(pA, pB), n2));
    out = remain(pool, W, blended(pA, pB), n2);
    if (supA > 0) supA *= Math.pow(1 + pA.rRetSup, n2);
    if (supB > 0) supB *= Math.pow(1 + pB.rRetSup, n2);
  }
  if (t2 === pA.P && supA > 0) { unlocked += supA; supA = 0; }
  if (t2 === pB.P && supB > 0) { unlocked += supB; supB = 0; }

  // seg3
  const n3 = t3 - t2;
  if (n3 <= 0) return 0;
  const pool3 = out + unlocked;
  W = Math.min(W, pmt(pool3, blended(pA, pB), n3));
  return Math.max(0, W);
}

export function earliestFireAgeDWZCouple(pA, pB, requiredSpend, Lh) {
  let lo = Math.max(pA.A, pB.A);
  let hi = Math.min(lo + 60, Math.max(pA.L, pB.L) - 1);
  if (maxSpendDWZCouple(pA, pB, hi, Lh) + 1e-6 < requiredSpend) return null;
  for (let i = 0; i < 20; i++) {
    const mid = Math.floor((lo + hi) / 2);
    (maxSpendDWZCouple(pA, pB, mid, Lh) >= requiredSpend) ? (hi = mid) : (lo = mid + 1);
  }
  return hi;
}