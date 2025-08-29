/** Distribute household recommended salary-sacrifice (gross) across people by remaining cap.
 * Greedy fill: allocate to person 0..n up to their remaining cap until the budget is exhausted.
 */
export function splitSalarySacrifice(
  totalRecommendedGross: number,
  remainingCaps: number[]
): number[] {
  const out = remainingCaps.map(() => 0);
  let remaining = Math.max(0, totalRecommendedGross);
  for (let i = 0; i < remainingCaps.length && remaining > 0; i++) {
    const take = Math.min(remainingCaps[i], remaining);
    out[i] = Math.max(0, Math.round(take));
    remaining -= take;
  }
  return out;
}