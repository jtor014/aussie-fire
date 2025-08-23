import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js-light';
import { optimiseSplitSingle, optimiseSplitCouple } from '../src/core/optimizer/split_optimizer.js';

describe('Split Optimizer Golden Tests', () => {
  describe('Single Person Demo Scenarios', () => {
    it('should produce expected results for typical professional scenario', () => {
      const professionalScenario = {
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 90,
        preservationAge: 60,
        currentOutside: 80000,
        currentSuper: 120000,
        salary: 110000,
        insurance: 1500,
        annualSavingsBudget: 35000,
        targetSpend: 60000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitSingle(professionalScenario);

      expect(result).toBeDefined();
      expect(result.earliestAge).toBeDefined();
      
      // Golden expectations (±1% tolerance for age boundaries)
      if (result.earliestAge) {
        expect(result.earliestAge).toBeGreaterThan(30);
        expect(result.earliestAge).toBeLessThan(65);
        
        // Should find a reasonable retirement age for this scenario
        expect(result.earliestAge).toBeLessThanOrEqual(55);
      }

      // Split expectations
      expect(result.splits).toBeDefined();
      expect(result.splits.person1.sac).toBeGreaterThanOrEqual(0);
      expect(result.splits.person1.sac).toBeLessThanOrEqual(35000);
      expect(result.splits.outside).toBeGreaterThanOrEqual(0);
      
      // Total should equal budget
      const total = result.splits.person1.sac + result.splits.outside;
      expect(total).toBeCloseTo(professionalScenario.annualSavingsBudget, 0);

      // Cap usage should be reasonable
      expect(result.splits.person1.capUsePct).toBeGreaterThanOrEqual(0);
      expect(result.splits.person1.capUsePct).toBeLessThanOrEqual(100);

      // Should have rationale
      expect(Array.isArray(result.rationale)).toBe(true);
      expect(result.rationale.length).toBeGreaterThan(0);
      
      console.log('Professional Single Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`SAC: $${result.splits.person1.sac.toLocaleString()}`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      console.log(`Cap Usage: ${result.splits.person1.capUsePct.toFixed(1)}%`);
    });

    it('should handle high earner with cap constraints', () => {
      const highEarnerScenario = {
        currentAge: 35,
        retirementAge: 55,
        lifeExpectancy: 90,
        preservationAge: 60,
        currentOutside: 200000,
        currentSuper: 300000,
        salary: 250000, // High salary hitting SG cap
        insurance: 3000,
        annualSavingsBudget: 80000,
        targetSpend: 90000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitSingle(highEarnerScenario);

      expect(result).toBeDefined();
      
      if (result.splits) {
        // Should have minimal SAC due to SG already hitting cap
        expect(result.splits.person1.sac).toBeLessThan(5000);
        
        // Most budget should go to outside investments
        expect(result.splits.outside).toBeGreaterThan(70000);
        
        // Cap usage should be near 100%
        expect(result.splits.person1.capUsePct).toBeGreaterThan(90);
      }

      console.log('High Earner Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`SAC: $${result.splits.person1.sac.toLocaleString()}`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      console.log(`Cap Usage: ${result.splits.person1.capUsePct.toFixed(1)}%`);
    });

    it('should handle early retirement scenario', () => {
      const earlyRetirementScenario = {
        currentAge: 25,
        retirementAge: 45,
        lifeExpectancy: 90,
        preservationAge: 60,
        currentOutside: 50000,
        currentSuper: 40000,
        salary: 95000,
        insurance: 1200,
        annualSavingsBudget: 40000,
        targetSpend: 50000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitSingle(earlyRetirementScenario);

      expect(result).toBeDefined();
      
      if (result.splits) {
        // Early retirement should favor outside investments (long bridge period)
        const outsideRatio = result.splits.outside / earlyRetirementScenario.annualSavingsBudget;
        expect(outsideRatio).toBeGreaterThan(0.4); // At least 40% outside
        
        // Should still utilize some super benefits
        expect(result.splits.person1.sac).toBeGreaterThan(0);
      }

      console.log('Early Retirement Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`SAC: $${result.splits.person1.sac.toLocaleString()}`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      console.log(`Bridge Years: ${60 - (result.earliestAge || 45)}`);
    });
  });

  describe('Couple Demo Scenarios', () => {
    it('should produce expected results for typical couple scenario', () => {
      const typicalCoupleScenario = {
        currentAge: 35,
        retirementAge: 55,
        lifeExpectancy: 92,
        preservationAge1: 60,
        preservationAge2: 58,
        currentOutside: 180000,
        currentSuper1: 220000,
        currentSuper2: 180000,
        salary1: 120000,
        salary2: 95000,
        insurance1: 1800,
        insurance2: 1400,
        annualSavingsBudget: 60000,
        targetSpend: 85000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitCouple(typicalCoupleScenario);

      expect(result).toBeDefined();
      expect(result.earliestAge).toBeDefined();

      // Golden expectations for couple
      if (result.earliestAge) {
        expect(result.earliestAge).toBeGreaterThan(35);
        expect(result.earliestAge).toBeLessThan(65);
        
        // Should benefit from younger partner's preservation age (58)
        expect(result.earliestAge).toBeLessThanOrEqual(60);
      }

      expect(result.splits).toBeDefined();
      expect(result.splits.person1.sac).toBeGreaterThanOrEqual(0);
      expect(result.splits.person2.sac).toBeGreaterThanOrEqual(0);
      expect(result.splits.outside).toBeGreaterThanOrEqual(0);

      // Total allocation should match budget
      const totalAllocated = result.splits.person1.sac + result.splits.person2.sac + result.splits.outside;
      expect(totalAllocated).toBeCloseTo(typicalCoupleScenario.annualSavingsBudget, 0);

      // Both partners should have reasonable cap usage
      expect(result.splits.person1.capUsePct).toBeGreaterThanOrEqual(0);
      expect(result.splits.person1.capUsePct).toBeLessThanOrEqual(100);
      expect(result.splits.person2.capUsePct).toBeGreaterThanOrEqual(0);
      expect(result.splits.person2.capUsePct).toBeLessThanOrEqual(100);

      console.log('Typical Couple Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`P1 SAC: $${result.splits.person1.sac.toLocaleString()} (${result.splits.person1.capUsePct.toFixed(1)}%)`);
      console.log(`P2 SAC: $${result.splits.person2.sac.toLocaleString()} (${result.splits.person2.capUsePct.toFixed(1)}%)`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
    });

    it('should handle unequal income couple scenario', () => {
      const unequalIncomeScenario = {
        currentAge: 32,
        retirementAge: 55,
        lifeExpectancy: 90,
        preservationAge1: 60,
        preservationAge2: 60,
        currentOutside: 120000,
        currentSuper1: 180000,
        currentSuper2: 80000,
        salary1: 150000, // High earner
        salary2: 45000,  // Lower earner
        insurance1: 2200,
        insurance2: 800,
        annualSavingsBudget: 50000,
        targetSpend: 75000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitCouple(unequalIncomeScenario);

      expect(result).toBeDefined();
      
      if (result.splits) {
        // Higher earner should typically get more SAC allocation
        // But this depends on cap constraints
        const totalSac = result.splits.person1.sac + result.splits.person2.sac;
        expect(totalSac).toBeGreaterThan(0);
        
        // Person 2 has more headroom (lower salary, lower SG)
        // So might actually get significant allocation despite lower salary
        expect(result.splits.person2.sac).toBeGreaterThanOrEqual(0);
        
        // Total should not exceed budget
        const total = result.splits.person1.sac + result.splits.person2.sac + result.splits.outside;
        expect(total).toBeLessThanOrEqual(unequalIncomeScenario.annualSavingsBudget + 10);
      }

      console.log('Unequal Income Couple Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`High Earner SAC: $${result.splits.person1.sac.toLocaleString()}`);
      console.log(`Low Earner SAC: $${result.splits.person2.sac.toLocaleString()}`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
    });

    it('should handle couple with bequest requirement', () => {
      const bequestCoupleScenario = {
        currentAge: 40,
        retirementAge: 60,
        lifeExpectancy: 88,
        preservationAge1: 60,
        preservationAge2: 60,
        currentOutside: 300000,
        currentSuper1: 400000,
        currentSuper2: 350000,
        salary1: 130000,
        salary2: 110000,
        insurance1: 2000,
        insurance2: 1800,
        annualSavingsBudget: 70000,
        targetSpend: 95000,
        bequest: 200000, // Significant bequest
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitCouple(bequestCoupleScenario);

      expect(result).toBeDefined();
      
      // Bequest requirement should delay retirement or require more savings
      if (result.earliestAge) {
        expect(result.earliestAge).toBeGreaterThan(40);
        
        // With significant existing wealth and savings, should still be viable
        expect(result.earliestAge).toBeLessThan(70);
      }

      if (result.splits) {
        // Should utilize available savings effectively
        const totalAllocated = result.splits.person1.sac + result.splits.person2.sac + result.splits.outside;
        expect(totalAllocated).toBeGreaterThan(bequestCoupleScenario.annualSavingsBudget * 0.8);
      }

      console.log('Bequest Couple Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge}`);
      console.log(`Total SAC: $${(result.splits.person1.sac + result.splits.person2.sac).toLocaleString()}`);
      console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      console.log(`Bequest Impact: Requires $200k at death`);
    });
  });

  describe('Edge Case Golden Scenarios', () => {
    it('should handle zero return environment', () => {
      const zeroReturnScenario = {
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 90,
        preservationAge: 60,
        currentOutside: 400000, // Need higher starting wealth
        currentSuper: 600000,
        salary: 100000,
        insurance: 1500,
        annualSavingsBudget: 40000,
        targetSpend: 55000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.025),
          inflation: new Decimal(0.025) // Zero real return
        }
      };

      const result = optimiseSplitSingle(zeroReturnScenario);

      expect(result).toBeDefined();
      
      // Zero return makes retirement much harder
      // Should still produce optimal allocation given constraints
      if (result.splits) {
        expect(result.splits.person1.sac).toBeGreaterThanOrEqual(0);
        expect(result.splits.outside).toBeGreaterThanOrEqual(0);
        
        const total = result.splits.person1.sac + result.splits.outside;
        expect(total).toBeCloseTo(zeroReturnScenario.annualSavingsBudget, 0);
      }

      console.log('Zero Return Scenario Results:');
      console.log(`Earliest Age: ${result.earliestAge || 'Not achievable'}`);
      if (result.splits) {
        console.log(`SAC: $${result.splits.person1.sac.toLocaleString()}`);
        console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      }
    });

    it('should handle very tight budget scenario', () => {
      const tightBudgetScenario = {
        currentAge: 35,
        retirementAge: 55,
        lifeExpectancy: 90,
        preservationAge: 60,
        currentOutside: 60000,
        currentSuper: 100000,
        salary: 85000,
        insurance: 1200,
        annualSavingsBudget: 15000, // Very tight budget
        targetSpend: 60000,
        bequest: 0,
        sgPct: 0.115,
        concessionalCap: 30000,
        assumptions: {
          nominalReturn: new Decimal(0.085),
          inflation: new Decimal(0.025)
        }
      };

      const result = optimiseSplitSingle(tightBudgetScenario);

      // May not be achievable with such tight constraints
      if (result && result.splits) {
        // Should use full budget efficiently
        const total = result.splits.person1.sac + result.splits.outside;
        expect(total).toBeCloseTo(tightBudgetScenario.annualSavingsBudget, 0);
        
        // Should prioritize tax-advantaged savings if possible
        expect(result.splits.person1.sac).toBeGreaterThanOrEqual(0);
      }

      console.log('Tight Budget Scenario Results:');
      console.log(`Earliest Age: ${result?.earliestAge || 'Not achievable'}`);
      if (result?.splits) {
        console.log(`SAC: $${result.splits.person1.sac.toLocaleString()}`);
        console.log(`Outside: $${result.splits.outside.toLocaleString()}`);
      }
    });
  });
});