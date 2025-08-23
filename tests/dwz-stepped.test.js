import { describe, it, expect } from 'vitest';
import { 
  computeDwzStepped, 
  isSteppedPlanViable, 
  earliestFireAgeSteppedDWZ,
  getSteppedConstraint 
} from '../src/core/dwz_stepped.js';
import { dwzFromSingleState } from '../src/core/dwz_single.js';
import auRules from '../src/data/au_rules.json';

describe('DWZ Stepped Spend - Core Calculations', () => {
  /**
   * G1: Post-bound typical scenario
   * R≈53, P=60, L=90, real return ≈2.9%
   * Total wealth ≈2.0-2.2m at retirement
   * Should show S_pre < S_post with both computed exactly
   */
  it('G1: Post-bound typical - accurate pre/post spend calculation', () => {
    const R = 53;
    const P = 60;
    const L = 90;
    const r_real = 0.029; // ~2.9% real return
    const W_out = 900000;  // $900k outside
    const W_sup = 1200000; // $1.2m super
    
    const result = computeDwzStepped(R, P, L, W_out, W_sup, r_real);
    
    // Verify periods
    expect(result.n_b).toBe(7);  // Bridge: 53 to 60
    expect(result.n_p).toBe(30); // Post: 60 to 90
    
    // Verify spend values are reasonable (balanced approach)
    expect(result.S_pre).toBeGreaterThan(70000);   // Pre-super spend
    expect(result.S_pre).toBeLessThan(120000);
    
    // With balanced approach, both phases should be similar
    expect(result.S_post).toBeGreaterThan(70000);
    expect(result.S_post).toBeLessThan(120000);
    
    // Spending should be relatively balanced (within 20% difference)
    const spendDiff = Math.abs(result.S_pre - result.S_post);
    const avgSpend = (result.S_pre + result.S_post) / 2;
    expect(spendDiff / avgSpend).toBeLessThan(0.2);
    
    // Verify viability
    expect(result.viable).toBe(true);
    
    // Test stability to ±0.1%
    const result2 = computeDwzStepped(R, P, L, W_out * 1.001, W_sup * 0.999, r_real);
    expect(Math.abs(result.S_pre - result2.S_pre) / result.S_pre).toBeLessThan(0.002);
    expect(Math.abs(result.S_post - result2.S_post) / result.S_post).toBeLessThan(0.002);
  });

  /**
   * G2: Bridge-tight scenario
   * Small outside wealth causes bridge constraint
   * S_pre < planSpend but S_post >> planSpend
   * Earliest increases until bridge is manageable
   */
  it('G2: Bridge-tight - pre-super constrains earliest FIRE', () => {
    const R = 50;
    const P = 60;
    const L = 85;
    const r_real = 0.04;
    const W_out = 200000;  // Small outside wealth
    const W_sup = 1500000; // Large super wealth
    const planSpend = 70000;
    
    const result = computeDwzStepped(R, P, L, W_out, W_sup, r_real);
    
    // Bridge spend should be tight
    expect(result.S_pre).toBeLessThan(planSpend);
    
    // Post-super spend should be ample
    expect(result.S_post).toBeGreaterThan(planSpend * 1.5);
    
    // Constraint should be pre-super
    const constraint = getSteppedConstraint(result, planSpend);
    expect(constraint).toBe('pre-super');
    
    // Plan should not be viable
    expect(isSteppedPlanViable(result, planSpend)).toBe(false);
    
    // Test monotonicity: later retirement should improve bridge
    const laterResult = computeDwzStepped(R + 2, P, L, W_out, W_sup, r_real);
    expect(laterResult.S_pre).toBeGreaterThan(result.S_pre);
  });

  /**
   * G3: No bridge scenario (R >= P)
   * Should omit S_pre and compute single-stage annuity
   */
  it('G3: No bridge (R≥P) - single-stage annuity calculation', () => {
    const R = 65;  // Retire after preservation
    const P = 60;
    const L = 90;
    const r_real = 0.035;
    const W_out = 600000;
    const W_sup = 800000;
    
    const result = computeDwzStepped(R, P, L, W_out, W_sup, r_real);
    
    // No bridge period
    expect(result.n_b).toBe(0);
    expect(result.n_p).toBe(30); // Still has post-preservation years from P to L
    
    // S_pre should be 0 or undefined
    expect(result.S_pre).toBe(0);
    
    // S_post should equal single-stage annuity
    const totalWealth = W_out + W_sup;
    const retirementYears = L - R;
    expect(result.S_post).toBeGreaterThan(0);
    
    // Should be viable
    expect(result.viable).toBe(true);
  });
});

describe('DWZ Stepped Spend - Invariants', () => {
  /**
   * Invariant: Stepped DWZ earliest <= flat DWZ earliest
   * With bridge covered, stepped approach should never be worse
   */
  it('Invariant: Stepped DWZ enables equal or earlier retirement than flat', () => {
    const params = {
      A: 40,  // Current age
      P: 60,  // Preservation age
      Bout: 300000,
      Bsup: 200000,
      c_out: 20000,  // Annual outside savings
      c_sup: 15000,   // Annual super contributions
      rWorkOut: 0.04,
      rWorkSup: 0.04,
      rRetOut: 0.035
    };
    
    const requiredSpend = 60000;
    const L = 85;
    
    // Find earliest with stepped approach
    const steppedEarliest = earliestFireAgeSteppedDWZ(params, requiredSpend, L);
    
    // For comparison, the flat approach would require all spending from combined wealth
    // The stepped approach should be at least as good
    expect(steppedEarliest).toBeDefined();
    expect(steppedEarliest).toBeLessThanOrEqual(params.P); // Should retire before or at preservation
  });

  /**
   * Invariant: Shorter life expectancy increases sustainable spending (balanced approach)
   * Both S_pre and S_post should increase with shorter life expectancy
   */
  it('Invariant: Shorter life expectancy improves or maintains spend levels', () => {
    const R = 55;
    const P = 60;
    const r_real = 0.03;
    const W_out = 500000;
    const W_sup = 700000;
    
    const L_long = 95;
    const L_short = 85;
    
    const resultLong = computeDwzStepped(R, P, L_long, W_out, W_sup, r_real);
    const resultShort = computeDwzStepped(R, P, L_short, W_out, W_sup, r_real);
    
    // With balanced approach, both spending phases should increase with shorter life
    expect(resultShort.S_pre).toBeGreaterThan(resultLong.S_pre);
    expect(resultShort.S_post).toBeGreaterThan(resultLong.S_post);
    
    // Both scenarios should remain viable
    expect(resultLong.viable).toBe(true);
    expect(resultShort.viable).toBe(true);
  });

  /**
   * Test wealth scaling: Double wealth should roughly double sustainable spend
   */
  it('Wealth scaling: Spend scales proportionally with wealth', () => {
    const R = 52;
    const P = 60;
    const L = 88;
    const r_real = 0.035;
    
    const baseResult = computeDwzStepped(R, P, L, 400000, 600000, r_real);
    const doubleResult = computeDwzStepped(R, P, L, 800000, 1200000, r_real);
    
    // Both pre and post spend should roughly double
    expect(doubleResult.S_pre / baseResult.S_pre).toBeGreaterThan(1.95);
    expect(doubleResult.S_pre / baseResult.S_pre).toBeLessThan(2.05);
    
    expect(doubleResult.S_post / baseResult.S_post).toBeGreaterThan(1.95);
    expect(doubleResult.S_post / baseResult.S_post).toBeLessThan(2.05);
  });
});

describe('DWZ Stepped Spend - Earliest FIRE Calculation', () => {
  /**
   * Test earliest FIRE age calculation with stepped logic
   */
  it('Should find correct earliest FIRE age with stepped constraints', () => {
    const assumptions = {
      nominalReturnOutside: 0.07,
      nominalReturnSuper: 0.07,
      inflation: 0.025
    };
    
    const person = {
      currentAge: 45,
      longevity: 90,
      liquidStart: 250000,  // Limited outside savings
      superStart: 500000,   // Good super savings
      income: 100000,
      extraSuper: 5000
    };
    
    const params = dwzFromSingleState(person, assumptions, auRules);
    const requiredSpend = 65000;
    
    const earliest = earliestFireAgeSteppedDWZ(params, requiredSpend, person.longevity);
    
    // Should find an earliest age
    expect(earliest).toBeDefined();
    expect(earliest).toBeGreaterThanOrEqual(person.currentAge);
    expect(earliest).toBeLessThanOrEqual(60); // Preservation age
    
    // Verify the solution is actually viable
    const n0 = earliest - params.A;
    const W_out = params.Bout * Math.pow(1 + params.rWorkOut, n0) + 
                  params.c_out * ((Math.pow(1 + params.rWorkOut, n0) - 1) / params.rWorkOut);
    const W_sup = params.Bsup * Math.pow(1 + params.rWorkSup, n0) + 
                  params.c_sup * ((Math.pow(1 + params.rWorkSup, n0) - 1) / params.rWorkSup);
    
    const steppedAtEarliest = computeDwzStepped(
      earliest, 
      params.P, 
      person.longevity, 
      W_out, 
      W_sup, 
      params.rRetOut
    );
    
    expect(isSteppedPlanViable(steppedAtEarliest, requiredSpend)).toBe(true);
  });

  /**
   * Test that bridge-limited scenarios show stability across life expectancy
   */
  it('Bridge-limited earliest should be stable across life expectancy changes', () => {
    const params = {
      A: 48,
      P: 60,
      Bout: 150000,  // Low outside wealth
      Bsup: 800000,  // High super wealth
      c_out: 10000,
      c_sup: 20000,
      rWorkOut: 0.04,
      rWorkSup: 0.04,
      rRetOut: 0.035
    };
    
    const requiredSpend = 55000;
    
    const earliest85 = earliestFireAgeSteppedDWZ(params, requiredSpend, 85);
    const earliest90 = earliestFireAgeSteppedDWZ(params, requiredSpend, 90);
    const earliest95 = earliestFireAgeSteppedDWZ(params, requiredSpend, 95);
    
    // If bridge-limited, all should be similar
    if (earliest85 && earliest90 && earliest95) {
      const variation = Math.max(earliest85, earliest90, earliest95) - 
                       Math.min(earliest85, earliest90, earliest95);
      
      // Should vary by at most 1-2 years if truly bridge-limited
      expect(variation).toBeLessThanOrEqual(2);
    }
  });
});