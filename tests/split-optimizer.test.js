import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js-light';
import { 
  optimiseSplitSingle,
  optimiseSplitCouple 
} from '../src/core/optimizer/split_optimizer.js';

describe('Split Optimizer - Single Person', () => {
  const baseParams = {
    currentAge: 30,
    retirementAge: 50,
    lifeExpectancy: 85,
    preservationAge: 60,
    currentOutside: 50000,
    currentSuper: 100000,
    salary: 100000,
    insurance: 1000,
    annualSavingsBudget: 50000,
    targetSpend: 60000,
    bequest: 0,
    sgPct: 0.115,
    concessionalCap: 30000,
    assumptions: {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    }
  };

  it('Should find optimal split for single person', () => {
    const result = optimiseSplitSingle(baseParams);
    
    expect(result).toBeDefined();
    if (result.earliestAge) {
      expect(result.earliestAge).toBeGreaterThanOrEqual(baseParams.currentAge);
      expect(result.earliestAge).toBeLessThanOrEqual(baseParams.preservationAge);
      expect(result.splits).toBeDefined();
      expect(result.splits.person1).toBeDefined();
      expect(result.splits.outside).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(Array.isArray(result.rationale)).toBe(true);
    }
  });

  it('Should handle low budget scenarios gracefully', () => {
    const lowBudgetParams = {
      ...baseParams,
      annualSavingsBudget: 5000, // Very low budget
      targetSpend: 80000 // High target
    };
    
    const result = optimiseSplitSingle(lowBudgetParams);
    
    // Should either find a solution or return null for earliest age
    if (result.earliestAge === null) {
      expect(result.splits.outside).toBeGreaterThanOrEqual(0);
    } else {
      expect(result.earliestAge).toBeGreaterThan(lowBudgetParams.currentAge);
    }
  });

  it('Should respect budget constraints', () => {
    const result = optimiseSplitSingle(baseParams);
    
    if (result.splits) {
      const totalSpent = result.splits.person1.sac + result.splits.outside;
      expect(totalSpent).toBeLessThanOrEqual(baseParams.annualSavingsBudget + 1); // Allow rounding
    }
  });
});

describe('Split Optimizer - Couple', () => {
  const coupleParams = {
    currentAge: 35,
    retirementAge: 55,
    lifeExpectancy: 88,
    preservationAge1: 60,
    preservationAge2: 60,
    currentOutside: 75000,
    currentSuper1: 120000,
    currentSuper2: 100000,
    salary1: 90000,
    salary2: 75000,
    insurance1: 1200,
    insurance2: 800,
    annualSavingsBudget: 70000,
    targetSpend: 80000,
    bequest: 0,
    sgPct: 0.115,
    concessionalCap: 30000,
    assumptions: {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    }
  };

  it('Should find optimal split for couple', () => {
    const result = optimiseSplitCouple(coupleParams);
    
    expect(result).toBeDefined();
    if (result.earliestAge) {
      expect(result.earliestAge).toBeGreaterThanOrEqual(coupleParams.currentAge);
      expect(result.splits).toBeDefined();
      expect(result.splits.person1).toBeDefined();
      expect(result.splits.person2).toBeDefined();
      expect(result.splits.outside).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(Array.isArray(result.rationale)).toBe(true);
    }
  });

  it('Should respect individual cap constraints', () => {
    const result = optimiseSplitCouple(coupleParams);
    
    if (result.splits) {
      // Each person's SAC should respect their headroom
      const sg1 = coupleParams.salary1 * coupleParams.sgPct;
      const sg2 = coupleParams.salary2 * coupleParams.sgPct;
      const headroom1 = Math.max(0, coupleParams.concessionalCap - sg1);
      const headroom2 = Math.max(0, coupleParams.concessionalCap - sg2);
      
      expect(result.splits.person1.sac).toBeLessThanOrEqual(headroom1 + 1); // Allow rounding
      expect(result.splits.person2.sac).toBeLessThanOrEqual(headroom2 + 1);
    }
  });

  it('Should respect total budget constraint', () => {
    const result = optimiseSplitCouple(coupleParams);
    
    if (result.splits) {
      const totalSpent = result.splits.person1.sac + result.splits.person2.sac + result.splits.outside;
      expect(totalSpent).toBeLessThanOrEqual(coupleParams.annualSavingsBudget + 1); // Allow rounding
    }
  });
});

describe('Split Optimizer - Edge Cases', () => {
  const baseAssumptions = {
    nominalReturn: new Decimal(0.085),
    inflation: new Decimal(0.025)
  };

  it('Should handle impossible scenarios', () => {
    const impossibleParams = {
      currentAge: 55,
      retirementAge: 60,
      lifeExpectancy: 65,
      preservationAge: 60,
      currentOutside: 1000, // Very low
      currentSuper: 2000, // Very low
      salary: 30000, // Low salary
      insurance: 500,
      annualSavingsBudget: 5000, // Low budget
      targetSpend: 200000, // Impossible target
      bequest: 0,
      sgPct: 0.115,
      concessionalCap: 30000,
      assumptions: baseAssumptions
    };
    
    const result = optimiseSplitSingle(impossibleParams);
    
    // Should return result but with null earliest age
    expect(result).toBeDefined();
    expect(result.earliestAge).toBe(null);
  });

  it('Should handle zero savings budget', () => {
    const zeroParams = {
      currentAge: 40,
      retirementAge: 60,
      lifeExpectancy: 85,
      preservationAge: 60,
      currentOutside: 100000,
      currentSuper: 200000,
      salary: 80000,
      insurance: 1000,
      annualSavingsBudget: 0, // No additional savings
      targetSpend: 50000,
      bequest: 0,
      sgPct: 0.115,
      concessionalCap: 30000,
      assumptions: baseAssumptions
    };
    
    const result = optimiseSplitSingle(zeroParams);
    
    expect(result).toBeDefined();
    expect(result.splits.person1.sac).toBe(0);
    expect(result.splits.outside).toBe(0);
  });
});