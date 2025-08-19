import { describe, it, expect } from 'vitest';
import { dwzFromSingleState, maxSpendDWZSingle, earliestFireAgeDWZSingle } from '../src/core/dwz_single.js';
import { pmt } from '../src/core/dwz_math.js';

const assumptions = { nominalReturnOutside: 0.06, nominalReturnSuper: 0.06, inflation: 0.025 };
const rules = { preservation_age: 60 };

describe('DWZ single', () => {
  it('monotone: later retirement => >= spend', () => {
    const p = dwzFromSingleState({ currentAge: 30, liquidStart: 100_000, superStart: 200_000, income: 100_000 }, assumptions, rules);
    const w50 = maxSpendDWZSingle(p, 50, 90);
    const w55 = maxSpendDWZSingle(p, 55, 90);
    expect(w55).toBeGreaterThanOrEqual(w50 - 1e-6);
  });
  
  it('earliest FIRE returns an age or null', () => {
    const p = dwzFromSingleState({ currentAge: 30, liquidStart: 50_000, superStart: 100_000, income: 100_000 }, assumptions, rules);
    const age = earliestFireAgeDWZSingle(p, 40_000, 90);
    expect(age === null || (age >= 30 && age < 90)).toBe(true);
  });

  it('bridge constraint: R<P limits spend to outside-only capacity', () => {
    // Screenshot scenario: R=40, P=60, outside=50k, super=100k, real r≈3.35%
    const realReturn = 0.0335; // 6% nominal - 2.5% inflation ≈ 3.35%
    const testAssumptions = { nominalReturnOutside: realReturn + 0.025, nominalReturnSuper: realReturn + 0.025, inflation: 0.025 };
    const p = dwzFromSingleState({ 
      currentAge: 30, 
      liquidStart: 50_000, 
      superStart: 100_000, 
      income: 0 // no income during retirement
    }, testAssumptions, rules);
    
    const W = maxSpendDWZSingle(p, 40, 85);
    
    // Bridge period is 20 years (40-60), outside-only cap should be around $4.1k/yr
    const bridgeCap = pmt(50_000, realReturn, 20);
    
    // W should be close to bridge cap, not higher (within $100)
    expect(W).toBeLessThanOrEqual(bridgeCap + 100);
    expect(W).toBeGreaterThan(bridgeCap - 100);
    expect(W).toBeLessThan(6000); // Should be well below $7.6k from screenshot
  });

  it('r=0 case matches closed form', () => {
    // When returns are 0, should match simple division
    const zeroAssumptions = { nominalReturnOutside: 0.025, nominalReturnSuper: 0.025, inflation: 0.025 };
    const p = dwzFromSingleState({ 
      currentAge: 30, 
      liquidStart: 50_000, 
      superStart: 100_000, 
      income: 0
    }, zeroAssumptions, rules);
    
    const W = maxSpendDWZSingle(p, 40, 80);
    
    // With r≈0: W should be min(outside/(P-R), total/(L-R))
    const bridgeLimit = 50_000 / (60 - 40); // $2,500/yr
    const totalLimit = (50_000 + 100_000) / (80 - 40); // $3,750/yr
    const expected = Math.min(bridgeLimit, totalLimit);
    
    expect(Math.abs(W - expected)).toBeLessThan(50); // Within $50
  });
});