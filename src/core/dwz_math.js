import * as Money from "../lib/money.js";

// shared math helpers (all REAL rates)
export const EPS = 1e-9;
export const real = (nom, infl) => Money.toNumber(Money.sub(Money.div(Money.add(1, nom), Money.add(1, infl)), 1));

export function pmt(A, r, n) {
  if (n <= 0) return Infinity;
  if (Math.abs(r) < EPS) return Money.toNumber(Money.div(A, n));
  const factor = Money.div(r, Money.sub(1, Money.pow(Money.add(1, r), -n)));
  return Money.toNumber(Money.mul(A, factor));
}
export function fv(B, c, r, n) {
  if (n <= 0) return B;
  if (Math.abs(r) < EPS) return Money.toNumber(Money.add(B, Money.mul(c, n)));
  const term1 = Money.mul(B, Money.pow(Money.add(1, r), n));
  const term2 = Money.mul(c, Money.div(Money.sub(Money.pow(Money.add(1, r), n), 1), r));
  return Money.toNumber(Money.add(term1, term2));
}
export function remain(A, W, r, n) {
  if (n <= 0) return A;
  if (Math.abs(r) < EPS) return Money.toNumber(Money.sub(A, Money.mul(W, n)));
  const term1 = Money.mul(A, Money.pow(Money.add(1, r), n));
  const term2 = Money.mul(W, Money.div(Money.sub(Money.pow(Money.add(1, r), n), 1), r));
  return Money.toNumber(Money.sub(term1, term2));
}