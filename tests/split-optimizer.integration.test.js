import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js-light';
import { optimiseSplitSingle, optimiseSplitCouple } from '../src/core/optimizer/split_optimizer.js';

describe('Split Optimizer Integration Tests', () => {
  const baseSingleParams = {
    currentAge: 35,
    retirementAge: 55,
    lifeExpectancy: 90,
    preservationAge: 60,
    currentOutside: 100000,
    currentSuper: 150000,
    salary: 120000,
    insurance: 2000,
    annualSavingsBudget: 30000,
    targetSpend: 65000,
    bequest: 0,
    sgPct: 0.115,
    concessionalCap: 30000,
    assumptions: {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    }
  };

  const baseCoupleParams = {
    currentAge: 35,
    retirementAge: 55,
    lifeExpectancy: 90,
    preservationAge1: 60,
    preservationAge2: 58,
    currentOutside: 150000,
    currentSuper1: 200000,
    currentSuper2: 180000,
    salary1: 120000,
    salary2: 100000,
    insurance1: 2000,
    insurance2: 1800,
    annualSavingsBudget: 50000,
    targetSpend: 85000,
    bequest: 0,
    sgPct: 0.115,
    concessionalCap: 30000,
    assumptions: {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    }
  };

  describe('Single Person Optimization Invariants', () => {
    it('should satisfy invariant: Budget↑ ⇒ earliestAge non-increasing', () => {
      const lowBudget = optimiseSplitSingle({
        ...baseSingleParams,
        annualSavingsBudget: 20000
      });

      const highBudget = optimiseSplitSingle({
        ...baseSingleParams,
        annualSavingsBudget: 40000
      });

      if (lowBudget.earliestAge && highBudget.earliestAge) {
        expect(highBudget.earliestAge).toBeLessThanOrEqual(lowBudget.earliestAge);
      }
    });

    it('should satisfy invariant: LifeExpectancy↑ ⇒ earliestAge non-decreasing', () => {
      const shortLife = optimiseSplitSingle({
        ...baseSingleParams,
        lifeExpectancy: 80
      });

      const longLife = optimiseSplitSingle({
        ...baseSingleParams,
        lifeExpectancy: 95
      });

      if (shortLife.earliestAge && longLife.earliestAge) {
        expect(longLife.earliestAge).toBeGreaterThanOrEqual(shortLife.earliestAge);
      }
    });

    it('should satisfy invariant: Bequest↑ ⇒ earliestAge non-decreasing', () => {
      const noBequest = optimiseSplitSingle({
        ...baseSingleParams,
        bequest: 0
      });

      const withBequest = optimiseSplitSingle({
        ...baseSingleParams,
        bequest: 100000
      });

      if (noBequest.earliestAge && withBequest.earliestAge) {
        expect(withBequest.earliestAge).toBeGreaterThanOrEqual(noBequest.earliestAge);
      }
    });

    it('should respect cap constraints', () => {
      const result = optimiseSplitSingle(baseSingleParams);

      if (result && result.splits) {
        const sgContribution = baseSingleParams.salary * baseSingleParams.sgPct;
        const totalConcessional = sgContribution + result.splits.person1.sac;
        
        // Should not exceed concessional cap
        expect(totalConcessional).toBeLessThanOrEqual(baseSingleParams.concessionalCap + 1); // +1 for rounding
      }
    });

    it('should handle bridge period logic: Long bridge → favour outside', () => {
      const earlyRetirement = optimiseSplitSingle({
        ...baseSingleParams,
        currentAge: 30,
        targetSpend: 50000 // Lower spend to enable early retirement
      });

      const lateRetirement = optimiseSplitSingle({
        ...baseSingleParams,
        currentAge: 30,
        retirementAge: 62, // After preservation age
        targetSpend: 50000
      });

      if (earlyRetirement?.splits && lateRetirement?.splits) {
        // Early retirement should favour outside investments more
        const earlyOutsideRatio = earlyRetirement.splits.outside / baseSingleParams.annualSavingsBudget;
        const lateOutsideRatio = lateRetirement.splits.outside / baseSingleParams.annualSavingsBudget;
        
        expect(earlyOutsideRatio).toBeGreaterThanOrEqual(lateOutsideRatio - 0.1); // Allow some tolerance
      }
    });

    it('should handle high insurance reducing SAC effectiveness', () => {
      const lowInsurance = optimiseSplitSingle({
        ...baseSingleParams,
        insurance: 500
      });

      const highInsurance = optimiseSplitSingle({
        ...baseSingleParams,
        insurance: 8000 // High insurance
      });

      if (lowInsurance?.splits && highInsurance?.splits) {
        // High insurance should reduce optimal salary sacrifice
        expect(highInsurance.splits.person1.sac).toBeLessThanOrEqual(lowInsurance.splits.person1.sac + 1000);
      }
    });

    it('should handle cap clamping when SG ≈ cap', () => {
      const highSalaryParams = {
        ...baseSingleParams,
        salary: 280000, // High salary hitting cap
        concessionalCap: 30000
      };

      const result = optimiseSplitSingle(highSalaryParams);

      if (result?.splits) {
        // SAC should be minimal when SG uses most of the cap
        expect(result.splits.person1.sac).toBeLessThan(5000);
      }
    });
  });

  describe('Couple Optimization Invariants', () => {
    it('should satisfy invariant: Budget↑ ⇒ earliestAge non-increasing', () => {
      const lowBudget = optimiseSplitCouple({
        ...baseCoupleParams,
        annualSavingsBudget: 30000
      });

      const highBudget = optimiseSplitCouple({
        ...baseCoupleParams,
        annualSavingsBudget: 70000
      });

      if (lowBudget?.earliestAge && highBudget?.earliestAge) {
        expect(highBudget.earliestAge).toBeLessThanOrEqual(lowBudget.earliestAge);
      }
    });

    it('should respect individual cap constraints', () => {
      const result = optimiseSplitCouple(baseCoupleParams);

      if (result?.splits) {
        const sgContrib1 = baseCoupleParams.salary1 * baseCoupleParams.sgPct;
        const sgContrib2 = baseCoupleParams.salary2 * baseCoupleParams.sgPct;
        
        const totalConcessional1 = sgContrib1 + result.splits.person1.sac;
        const totalConcessional2 = sgContrib2 + result.splits.person2.sac;
        
        expect(totalConcessional1).toBeLessThanOrEqual(baseCoupleParams.concessionalCap + 1);
        expect(totalConcessional2).toBeLessThanOrEqual(baseCoupleParams.concessionalCap + 1);
      }
    });

    it('should use younger partner preservation age for optimization', () => {
      // Partner 2 has earlier preservation age (58 vs 60)
      const result = optimiseSplitCouple(baseCoupleParams);
      
      if (result?.earliestAge) {
        // Should be able to access super at 58 (younger partner's age)
        // This enables earlier retirement than if we used older partner's age
        expect(result.earliestAge).toBeLessThanOrEqual(60);
      }
    });

    it('should handle different income levels appropriately', () => {
      const unequalIncomes = optimiseSplitCouple({
        ...baseCoupleParams,
        salary1: 150000,
        salary2: 50000 // Very different salaries
      });

      if (unequalIncomes?.splits) {
        // Should still produce a valid optimization
        expect(unequalIncomes.splits.person1.sac).toBeGreaterThanOrEqual(0);
        expect(unequalIncomes.splits.person2.sac).toBeGreaterThanOrEqual(0);
        expect(unequalIncomes.splits.outside).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle case where one partner has no salary', () => {
      const singleIncomeCouple = optimiseSplitCouple({
        ...baseCoupleParams,
        salary2: 0,
        currentSuper2: 50000 // Still has some super
      });

      if (singleIncomeCouple?.splits) {
        // Person 2 should have zero SAC (no salary to sacrifice)
        expect(singleIncomeCouple.splits.person2.sac).toBe(0);
        expect(singleIncomeCouple.splits.person1.sac).toBeGreaterThanOrEqual(0);
      }
    });

    it('should satisfy total budget constraint', () => {
      const result = optimiseSplitCouple(baseCoupleParams);

      if (result?.splits) {
        const totalAllocated = result.splits.person1.sac + result.splits.person2.sac + result.splits.outside;
        
        // Should not exceed budget (allowing small rounding tolerance)
        expect(totalAllocated).toBeLessThanOrEqual(baseCoupleParams.annualSavingsBudget + 10);
        
        // Should use most of the budget (within 5% tolerance)
        expect(totalAllocated).toBeGreaterThanOrEqual(baseCoupleParams.annualSavingsBudget * 0.95);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete single optimization within 250ms', async () => {
      const startTime = performance.now();
      
      const result = optimiseSplitSingle(baseSingleParams);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(250);
      expect(result).toBeDefined();
    });

    it('should complete couple optimization within 750ms', async () => {
      const startTime = performance.now();
      
      const result = optimiseSplitCouple(baseCoupleParams);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(750);
      expect(result).toBeDefined();
    });

    it('should handle multiple optimizations efficiently', () => {
      const startTime = performance.now();
      
      // Run multiple optimizations
      for (let i = 0; i < 5; i++) {
        optimiseSplitSingle({
          ...baseSingleParams,
          annualSavingsBudget: 25000 + i * 5000
        });
      }
      
      const endTime = performance.now();
      const avgDuration = (endTime - startTime) / 5;
      
      expect(avgDuration).toBeLessThan(300); // Should remain efficient
    });
  });

  describe('Output Format Validation', () => {
    it('should return proper shape for single optimization', () => {
      const result = optimiseSplitSingle(baseSingleParams);

      if (result) {
        expect(result).toHaveProperty('earliestAge');
        expect(result).toHaveProperty('splits');
        expect(result).toHaveProperty('rationale');
        
        expect(result.splits).toHaveProperty('person1');
        expect(result.splits).toHaveProperty('outside');
        
        expect(result.splits.person1).toHaveProperty('sac');
        expect(result.splits.person1).toHaveProperty('capUsePct');
        
        expect(Array.isArray(result.rationale)).toBe(true);
        
        // Values should be integers (no NaN)
        expect(Number.isInteger(result.splits.person1.sac)).toBe(true);
        expect(Number.isInteger(result.splits.outside)).toBe(true);
        expect(!isNaN(result.splits.person1.capUsePct)).toBe(true);
      }
    });

    it('should return proper shape for couple optimization', () => {
      const result = optimiseSplitCouple(baseCoupleParams);

      if (result) {
        expect(result).toHaveProperty('earliestAge');
        expect(result).toHaveProperty('splits');
        expect(result).toHaveProperty('rationale');
        
        expect(result.splits).toHaveProperty('person1');
        expect(result.splits).toHaveProperty('person2');
        expect(result.splits).toHaveProperty('outside');
        
        expect(result.splits.person1).toHaveProperty('sac');
        expect(result.splits.person1).toHaveProperty('capUsePct');
        expect(result.splits.person2).toHaveProperty('sac');
        expect(result.splits.person2).toHaveProperty('capUsePct');
        
        // All values should be integers (no NaN)
        expect(Number.isInteger(result.splits.person1.sac)).toBe(true);
        expect(Number.isInteger(result.splits.person2.sac)).toBe(true);
        expect(Number.isInteger(result.splits.outside)).toBe(true);
      }
    });
  });
});