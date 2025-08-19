// shared math helpers (all REAL rates)
export const EPS = 1e-9;
export const real = (nom, infl) => (1 + nom) / (1 + infl) - 1;

export function pmt(A, r, n) {
  if (n <= 0) return Infinity;
  if (Math.abs(r) < EPS) return A / n;
  return A * (r / (1 - Math.pow(1 + r, -n)));
}
export function fv(B, c, r, n) {
  if (n <= 0) return B;
  if (Math.abs(r) < EPS) return B + c * n;
  return B * Math.pow(1 + r, n) + c * ((Math.pow(1 + r, n) - 1) / r);
}
export function remain(A, W, r, n) {
  if (n <= 0) return A;
  if (Math.abs(r) < EPS) return A - W * n;
  return A * Math.pow(1 + r, n) - W * ((Math.pow(1 + r, n) - 1) / r);
}