import { describe, it, expect } from 'vitest';
import { 
  evaluateSplitSingle, 
  evaluateSplitCouple,
  optimizeSplitSingle,
  optimizeSplitCouple 
} from '../src/core/optimizer/split_optimizer.js';

describe('Split Optimizer - Single Person', () => {
  const baseParams = {
    currentAge: 40,
    targetSpend: 60000,
    annualSavingsBudget: 50000,
    bequest: 0,
    lifeExpectancy: 85,
    currentSavings: 100000,
    currentSuper: 150000,
    annualIncome: 100000,
    rReal: 0.04,
    preservationAge: 60,
    
    // Super settings
    sgRate: 0.115,
    concessionalCap: 27500,
    superInsurance: 1000,
    contributionsTaxRate: 0.15
  };

  /**
   * Test basic single split evaluation
   */
  it('Should evaluate single split correctly', () => {
    const result = evaluateSplitSingle(0.5, baseParams);
    
    expect(result).toBeDefined();
    expect(result.viable).toBeDefined();
    expect(result.sacAmount).toBeGreaterThanOrEqual(0);
    expect(result.outsideAmount).toBeGreaterThanOrEqual(0);
    expect(result.capUse).toBeGreaterThanOrEqual(0);
    expect(result.capUse).toBeLessThanOrEqual(1);
    
    // Verify overflow is properly handled - overflow should be added to outside amount
    const expectedTotal = baseParams.annualSavingsBudget + result.overflow;
    const actualTotal = result.sacAmount + result.outsideAmount;
    
    // Total allocation should equal budget plus any overflow
    expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1);
  });

  /**
   * Test cap enforcement
   */
  it('Should enforce concessional cap limits', () => {
    const highAlphaParams = { ...baseParams, annualSavingsBudget: 100000 };
    
    // With alpha = 1.0 (all to super), should hit cap limits
    const result = evaluateSplitSingle(1.0, highAlphaParams);
    
    // Calculate expected cap headroom
    const sgContrib = highAlphaParams.annualIncome * highAlphaParams.sgRate;
    const maxSAC = Math.max(0, highAlphaParams.concessionalCap - sgContrib);
    
    expect(result.sacAmount).toBeLessThanOrEqual(maxSAC + 1); // Allow for rounding
    expect(result.totalConcessional).toBeLessThanOrEqual(highAlphaParams.concessionalCap + 1);
    
    // Overflow should go to outside
    if (result.overflow > 0) {
      expect(result.outsideAmount).toBeGreaterThan(highAlphaParams.annualSavingsBudget - result.sacAmount - 1000);
    }
  });

  /**
   * Test insurance impact
   */
  it('Should account for insurance premiums', () => {
    const lowInsuranceParams = { ...baseParams, superInsurance: 500 };
    const highInsuranceParams = { ...baseParams, superInsurance: 3000 };
    
    const lowResult = evaluateSplitSingle(0.8, lowInsuranceParams);
    const highResult = evaluateSplitSingle(0.8, highInsuranceParams);
    
    // Higher insurance should generally lead to later retirement or require more contributions
    if (lowResult.viable && highResult.viable) {
      expect(highResult.earliestAge).toBeGreaterThanOrEqual(lowResult.earliestAge);
    }
  });

  /**
   * Test optimization finds reasonable solution
   */
  it('Should find optimal split for single person', () => {
    const optimization = optimizeSplitSingle(baseParams);
    
    if (optimization) {
      expect(optimization.viable).toBe(true);
      expect(optimization.alpha).toBeGreaterThanOrEqual(0);
      expect(optimization.alpha).toBeLessThanOrEqual(1);
      expect(optimization.earliestAge).toBeGreaterThanOrEqual(baseParams.currentAge);
      expect(optimization.earliestAge).toBeLessThanOrEqual(baseParams.lifeExpectancy);
      
      // Verify the solution is actually viable
      const verification = evaluateSplitSingle(optimization.alpha, baseParams);
      expect(verification.viable).toBe(true);
      expect(Math.abs(verification.earliestAge - optimization.earliestAge)).toBeLessThanOrEqual(1);
    }
  });
});

describe('Split Optimizer - Couple', () => {
  const coupleParams = {
    currentAge: 42,
    targetSpend: 80000,
    annualSavingsBudget: 70000,
    bequest: 0,
    lifeExpectancy: 87,
    currentSavings: 150000,
    currentSuper1: 200000,
    currentSuper2: 180000,
    annualIncome1: 90000,
    annualIncome2: 70000,
    rReal: 0.035,
    preservationAge1: 60,
    preservationAge2: 60,
    
    // Super settings
    sgRate: 0.115,
    concessionalCap: 27500,
    superInsurance1: 1200,
    superInsurance2: 800,
    contributionsTaxRate: 0.15
  };

  /**
   * Test basic couple split evaluation
   */
  it('Should evaluate couple split correctly', () => {
    const result = evaluateSplitCouple(0.6, 0.4, coupleParams);
    
    expect(result).toBeDefined();
    expect(result.viable).toBeDefined();
    expect(result.sac1).toBeGreaterThanOrEqual(0);
    expect(result.sac2).toBeGreaterThanOrEqual(0);
    expect(result.outside).toBeGreaterThanOrEqual(0);
    expect(result.capUse1).toBeGreaterThanOrEqual(0);
    expect(result.capUse2).toBeGreaterThanOrEqual(0);
    
    // Verify overflow is properly handled
    const expectedTotal = coupleParams.annualSavingsBudget + result.overflow1 + result.overflow2;
    const actualTotal = result.sac1 + result.sac2 + result.outside;
    
    // Total allocation should equal budget plus any overflow
    expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(1);
  });

  /**
   * Test asymmetric caps handling
   */
  it('Should handle asymmetric income/caps correctly', () => {
    const asymmetricParams = {
      ...coupleParams,
      annualIncome1: 120000, // Higher income = lower headroom due to SG
      annualIncome2: 40000   // Lower income = more headroom
    };
    
    const result = evaluateSplitCouple(0.8, 0.8, asymmetricParams);
    
    // Person 2 should have more headroom due to lower SG
    const sg1 = asymmetricParams.annualIncome1 * asymmetricParams.sgRate;
    const sg2 = asymmetricParams.annualIncome2 * asymmetricParams.sgRate;
    const headroom1 = Math.max(0, asymmetricParams.concessionalCap - sg1);
    const headroom2 = Math.max(0, asymmetricParams.concessionalCap - sg2);
    
    expect(headroom2).toBeGreaterThan(headroom1);
    
    // Result should reflect this asymmetry
    if (result.viable && headroom2 > headroom1) {
      expect(result.capUse2).toBeLessThanOrEqual(result.capUse1);
    }
  });

  /**
   * Test couple optimization
   */
  it('Should find optimal split for couple', () => {
    const optimization = optimizeSplitCouple(coupleParams);
    
    if (optimization) {
      expect(optimization.viable).toBe(true);
      expect(optimization.alpha1).toBeGreaterThanOrEqual(0);
      expect(optimization.alpha1).toBeLessThanOrEqual(1);
      expect(optimization.alpha2).toBeGreaterThanOrEqual(0);
      expect(optimization.alpha2).toBeLessThanOrEqual(1);
      expect(optimization.earliestAge).toBeGreaterThanOrEqual(coupleParams.currentAge);
      
      // Verify solution
      const verification = evaluateSplitCouple(optimization.alpha1, optimization.alpha2, coupleParams);
      expect(verification.viable).toBe(true);
    }
  });
});

describe('Split Optimizer - Edge Cases', () => {
  /**
   * Test impossible targets
   */
  it('Should handle impossible spending targets', () => {
    const impossibleParams = {
      currentAge: 55,
      targetSpend: 500000, // Very high target - impossible with low savings
      annualSavingsBudget: 10000, // Very low savings budget
      bequest: 0,
      lifeExpectancy: 75, // Short life expectancy makes it harder
      currentSavings: 10000, // Very low starting wealth
      currentSuper: 20000,
      annualIncome: 50000,
      rReal: 0.02, // Low returns
      preservationAge: 60,
      sgRate: 0.115,
      concessionalCap: 27500,
      superInsurance: 2000, // High insurance drag
      contributionsTaxRate: 0.15
    };
    
    const result = optimizeSplitSingle(impossibleParams);
    expect(result).toBeNull(); // Should return null for impossible scenarios
  });

  /**
   * Test very late life expectancy
   */
  it('Should handle edge case parameters', () => {
    const edgeParams = {
      currentAge: 55,
      targetSpend: 40000,
      annualSavingsBudget: 30000,
      bequest: 100000, // Large bequest
      lifeExpectancy: 100, // Very long life
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 90000,
      rReal: 0.02, // Low returns
      preservationAge: 60,
      sgRate: 0.115,
      concessionalCap: 27500,
      superInsurance: 2000, // High insurance
      contributionsTaxRate: 0.15
    };
    
    const result = optimizeSplitSingle(edgeParams);
    
    // Should still find a solution or gracefully fail
    if (result) {
      expect(result.viable).toBe(true);
      expect(result.alpha).toBeGreaterThanOrEqual(0);
      expect(result.alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe('Split Optimizer - Golden Path Tests', () => {
  /**
   * Test monotonicity: higher target spend should require earlier alpha* or later retirement
   */
  it('Should show sensible response to target spend changes', () => {
    const baseParams = {
      currentAge: 45,
      annualSavingsBudget: 60000,
      bequest: 0,
      lifeExpectancy: 85,
      currentSavings: 150000,
      currentSuper: 200000,
      annualIncome: 100000,
      rReal: 0.04,
      preservationAge: 60,
      sgRate: 0.115,
      concessionalCap: 27500,
      superInsurance: 1000,
      contributionsTaxRate: 0.15
    };
    
    const lowSpendResult = optimizeSplitSingle({ ...baseParams, targetSpend: 50000 });
    const highSpendResult = optimizeSplitSingle({ ...baseParams, targetSpend: 70000 });
    
    if (lowSpendResult && highSpendResult && lowSpendResult.viable && highSpendResult.viable) {
      // Higher spend should require later retirement (monotonic relationship)
      expect(highSpendResult.earliestAge).toBeGreaterThanOrEqual(lowSpendResult.earliestAge);
    }
  });
});