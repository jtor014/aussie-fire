import { allocateConcessionalByMTR, type PersonHeadroom } from 'dwz-core';

/** 
 * Distribute household recommended salary-sacrifice (gross) across people.
 * Uses MTR-priority allocation: highest MTR first, then pro-rata by remaining cap.
 * 
 * @param totalRecommendedGross - Total salary sacrifice to allocate (gross)
 * @param remainingCaps - Array of remaining concessional cap per person
 * @param mtrs - Array of marginal tax rates per person (optional, defaults to equal)
 * @returns Array of recommended salary sacrifice per person
 */
export function splitSalarySacrifice(
  totalRecommendedGross: number,
  remainingCaps: number[],
  mtrs?: number[]
): number[] {
  // Build PersonHeadroom array for the allocator
  const people: PersonHeadroom[] = remainingCaps.map((cap, i) => ({
    id: i,
    headroom: Math.max(0, cap),
    mtr: mtrs?.[i] ?? 0.32 // Default to 32% if MTR not provided
  }));
  
  // Use the MTR-aware allocator
  const result = allocateConcessionalByMTR(totalRecommendedGross, people);
  
  // Extract the per-person allocations in order
  return remainingCaps.map((_, i) => {
    const person = result.perPerson.find(p => p.id === i);
    return Math.round(person?.ssGross ?? 0);
  });
}