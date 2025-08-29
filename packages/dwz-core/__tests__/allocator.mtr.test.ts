import { describe, test, expect } from 'vitest';
import { allocateConcessionalByMTR } from '../src/optimizer/allocateConcessional';

describe('allocateConcessionalByMTR', () => {
  test('prioritises higher MTR first', () => {
    const result = allocateConcessionalByMTR(20000, [
      { id: 0, headroom: 30000, mtr: 0.47 },
      { id: 1, headroom: 30000, mtr: 0.345 },
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    
    expect(person0).toBeCloseTo(20000, 0);
    expect(person1).toBeCloseTo(0, 0);
    expect(result.totalAllocated).toBeCloseTo(20000, 0);
  });

  test('splits pro-rata within equal MTR group', () => {
    const result = allocateConcessionalByMTR(30000, [
      { id: 0, headroom: 10000, mtr: 0.345 },
      { id: 1, headroom: 20000, mtr: 0.345 },
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    
    // Should split 30k as 10k/20k pro-rata: person0 gets 1/3, person1 gets 2/3
    expect(person0).toBeCloseTo(10000, 0);
    expect(person1).toBeCloseTo(20000, 0);
    expect(result.totalAllocated).toBeCloseTo(30000, 0);
  });

  test('handles SG consuming full cap', () => {
    const result = allocateConcessionalByMTR(15000, [
      { id: 0, headroom: 0, mtr: 0.37 },      // Cap fully consumed by SG
      { id: 1, headroom: 5000, mtr: 0.37 },  // Some headroom left
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    
    expect(person0).toBeCloseTo(0, 0);        // No headroom
    expect(person1).toBeCloseTo(5000, 0);     // Gets all available headroom
    expect(result.totalAllocated).toBeCloseTo(5000, 0);
  });

  test('multiple MTR tiers with partial allocation', () => {
    const result = allocateConcessionalByMTR(25000, [
      { id: 0, headroom: 10000, mtr: 0.47 },   // Highest MTR
      { id: 1, headroom: 15000, mtr: 0.345 },  // Middle MTR
      { id: 2, headroom: 20000, mtr: 0.19 },   // Lowest MTR
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    const person2 = result.perPerson.find(p => p.id === 2)!.ssGross;
    
    // Should fill person0 completely (10k), then person1 gets remaining 15k
    expect(person0).toBeCloseTo(10000, 0);
    expect(person1).toBeCloseTo(15000, 0);
    expect(person2).toBeCloseTo(0, 0);        // Nothing left for lowest MTR
    expect(result.totalAllocated).toBeCloseTo(25000, 0);
  });

  test('equal MTR pro-rata with overflow', () => {
    const result = allocateConcessionalByMTR(50000, [
      { id: 0, headroom: 15000, mtr: 0.37 },
      { id: 1, headroom: 10000, mtr: 0.37 },
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    
    // Total headroom is 25k, but we have 50k to allocate
    // Should allocate pro-rata by headroom: 15k + 10k = 25k total
    expect(person0).toBeCloseTo(15000, 0);
    expect(person1).toBeCloseTo(10000, 0);
    expect(result.totalAllocated).toBeCloseTo(25000, 0);
  });

  test('zero allocation scenarios', () => {
    // Zero total to allocate
    const result1 = allocateConcessionalByMTR(0, [
      { id: 0, headroom: 10000, mtr: 0.37 }
    ]);
    expect(result1.totalAllocated).toBe(0);

    // Zero headroom
    const result2 = allocateConcessionalByMTR(10000, [
      { id: 0, headroom: 0, mtr: 0.37 }
    ]);
    expect(result2.totalAllocated).toBe(0);

    // Empty people array
    const result3 = allocateConcessionalByMTR(10000, []);
    expect(result3.totalAllocated).toBe(0);
    expect(result3.perPerson).toEqual([]);
  });

  test('negative headroom is clamped to zero', () => {
    const result = allocateConcessionalByMTR(10000, [
      { id: 0, headroom: -5000, mtr: 0.47 },   // Negative headroom
      { id: 1, headroom: 15000, mtr: 0.345 },
    ]);
    
    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    
    expect(person0).toBeCloseTo(0, 0);        // Negative clamped to 0
    expect(person1).toBeCloseTo(10000, 0);
    expect(result.totalAllocated).toBeCloseTo(10000, 0);
  });
});

describe('allocateConcessionalByMTR - Invariant Tests', () => {
  test('sum invariant: total allocated equals min(totalSS, sum of headroom)', () => {
    const scenarios = [
      // Under-allocated (total < headroom)
      { total: 15000, people: [{ id: 0, headroom: 10000, mtr: 0.47 }, { id: 1, headroom: 20000, mtr: 0.345 }] },
      // Over-allocated (total > headroom)
      { total: 40000, people: [{ id: 0, headroom: 10000, mtr: 0.47 }, { id: 1, headroom: 15000, mtr: 0.345 }] },
      // Exact fit
      { total: 25000, people: [{ id: 0, headroom: 10000, mtr: 0.47 }, { id: 1, headroom: 15000, mtr: 0.345 }] }
    ];

    scenarios.forEach(scenario => {
      const result = allocateConcessionalByMTR(scenario.total, scenario.people);
      const totalHeadroom = scenario.people.reduce((sum, p) => sum + Math.max(0, p.headroom), 0);
      const expectedAllocation = Math.min(scenario.total, totalHeadroom);
      
      expect(result.totalAllocated).toBeCloseTo(expectedAllocation, 1); // Within $1
      
      // Sum of per-person allocations should equal totalAllocated
      const sumPerPerson = result.perPerson.reduce((sum, p) => sum + p.ssGross, 0);
      expect(sumPerPerson).toBeCloseTo(result.totalAllocated, 1);
    });
  });

  test('MTR preference invariant: higher MTR person should not get less when MTR increases', () => {
    const basePeople = [
      { id: 0, headroom: 20000, mtr: 0.37 },
      { id: 1, headroom: 20000, mtr: 0.345 }
    ];

    const result1 = allocateConcessionalByMTR(25000, basePeople);
    const person0Base = result1.perPerson.find(p => p.id === 0)!.ssGross;

    // Increase person 0's MTR
    const higherMTRPeople = [
      { id: 0, headroom: 20000, mtr: 0.47 }, // Higher MTR
      { id: 1, headroom: 20000, mtr: 0.345 }
    ];

    const result2 = allocateConcessionalByMTR(25000, higherMTRPeople);
    const person0Higher = result2.perPerson.find(p => p.id === 0)!.ssGross;

    // Higher MTR should get same or more allocation (unless hitting cap)
    expect(person0Higher).toBeGreaterThanOrEqual(person0Base);
  });

  test('cap constraint invariant: no person exceeds their headroom', () => {
    const testCases = [
      { total: 50000, people: [{ id: 0, headroom: 5000, mtr: 0.47 }, { id: 1, headroom: 8000, mtr: 0.345 }] },
      { total: 100000, people: [{ id: 0, headroom: 15000, mtr: 0.47 }, { id: 1, headroom: 0, mtr: 0.37 }] }
    ];

    testCases.forEach(testCase => {
      const result = allocateConcessionalByMTR(testCase.total, testCase.people);
      
      result.perPerson.forEach((allocation, index) => {
        const person = testCase.people.find(p => p.id === allocation.id)!;
        expect(allocation.ssGross).toBeLessThanOrEqual(Math.max(0, person.headroom) + 0.01); // Within penny
      });
    });
  });

  test('MTR grouping invariant: equal MTRs split pro-rata by headroom', () => {
    const result = allocateConcessionalByMTR(30000, [
      { id: 0, headroom: 10000, mtr: 0.37 },
      { id: 1, headroom: 5000, mtr: 0.37 },   // Same MTR
      { id: 2, headroom: 15000, mtr: 0.37 },  // Same MTR
    ]);

    const person0 = result.perPerson.find(p => p.id === 0)!.ssGross;
    const person1 = result.perPerson.find(p => p.id === 1)!.ssGross;
    const person2 = result.perPerson.find(p => p.id === 2)!.ssGross;

    // Total headroom: 30k, perfect fit
    // Should split pro-rata: 10k/30k = 1/3, 5k/30k = 1/6, 15k/30k = 1/2
    expect(person0).toBeCloseTo(10000, 0);
    expect(person1).toBeCloseTo(5000, 0);
    expect(person2).toBeCloseTo(15000, 0);
  });

  test('precision invariant: allocation precision to nearest dollar', () => {
    const result = allocateConcessionalByMTR(10000.67, [
      { id: 0, headroom: 15000.33, mtr: 0.37 }
    ]);

    const allocation = result.perPerson.find(p => p.id === 0)!.ssGross;
    expect(allocation % 1).toBeCloseTo(0, 2); // Should be whole dollars
  });
});