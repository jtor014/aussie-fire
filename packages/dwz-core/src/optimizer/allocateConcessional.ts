export interface PersonHeadroom {
  id: number;                 // index within household
  headroom: number;           // remaining concessional cap (gross)
  mtr: number;                // marginal tax rate incl Medicare (0..1)
}

export interface AllocationResult {
  perPerson: { id: number; ssGross: number }[];
  totalAllocated: number;
}

/**
 * Allocate total salary-sacrifice (gross) across people:
 *  1) Fill highest-MTR headroom first (tax benefit priority)
 *  2) If multiple people share the same MTR (within 1bp), split pro-rata by headroom
 */
export function allocateConcessionalByMTR(
  totalGross: number,
  people: PersonHeadroom[]
): AllocationResult {
  const eps = 1e-9;
  let remaining = Math.max(0, totalGross);
  const result: AllocationResult = { 
    perPerson: people.map(p => ({ id: p.id, ssGross: 0 })), 
    totalAllocated: 0 
  };
  
  if (remaining <= eps || people.length === 0) return result;

  // Work on a copy; clamp headroom >= 0
  let pool = people.map(p => ({ ...p, headroom: Math.max(0, p.headroom) }));

  // Group by (approx) equal MTR, high to low
  const groups = groupByMTR(pool).sort((a, b) => b.mtr - a.mtr);
  
  for (const g of groups) {
    if (remaining <= eps) break;
    const totalHeadroom = g.items.reduce((s, p) => s + p.headroom, 0);
    if (totalHeadroom <= eps) continue;
    
    // Calculate allocation for this MTR group
    const groupAllocation = Math.min(remaining, totalHeadroom);
    
    // Pro-rata by headroom within group
    for (const p of g.items) {
      if (remaining <= eps) break;
      const share = (p.headroom / totalHeadroom) * groupAllocation;
      const alloc = Math.min(p.headroom, share);
      
      if (alloc > eps) {
        const slot = result.perPerson.find(x => x.id === p.id)!;
        const roundedAlloc = Math.round(alloc);
        slot.ssGross += roundedAlloc;
        result.totalAllocated += roundedAlloc;
        remaining -= alloc; // Use unrounded for remaining calculation to avoid accumulation errors
        p.headroom -= alloc;
      }
    }
  }
  
  return result;
}

function groupByMTR(list: PersonHeadroom[]) {
  const eps = 1e-4; // 1bp tolerance for equal MTR
  const sorted = [...list].sort((a, b) => b.mtr - a.mtr);
  const groups: { mtr: number; items: PersonHeadroom[] }[] = [];
  
  for (const p of sorted) {
    const g = groups.find(grp => Math.abs(grp.mtr - p.mtr) <= eps);
    if (g) {
      g.items.push(p);
    } else {
      groups.push({ mtr: p.mtr, items: [p] });
    }
  }
  
  return groups;
}