import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('Super Insurance Premium Functionality - T-019', () => {
  const baseState = {
    currentAge: 30,
    retirementAge: 50,
    lifeExpectancy: 85,
    currentSavings: 50000,
    currentSuper: 100000,
    annualIncome: 100000,
    annualExpenses: 60000,
    expectedReturn: 8.5,
    inflationRate: 2.5,
    bequest: 0,
    planningAs: 'single',
    ageBandsEnabled: true,
    ageBandSettings: {
      gogoTo: 60,
      slowTo: 75,
      gogoMult: 1.10,
      slowMult: 1.00,
      nogoMult: 0.85
    }
  };

  describe('Super insurance premium deduction logic', () => {
    it('should properly deduct insurance premiums from super balance year-by-year', () => {
      const stateWithInsurance = { 
        ...baseState, 
        superInsurancePremium: 2000 // $2000/year premium
      };
      
      const stateWithoutInsurance = { 
        ...baseState, 
        superInsurancePremium: 0 
      };
      
      const decisionWithInsurance = decisionFromState(stateWithInsurance, auRules);
      const decisionWithoutInsurance = decisionFromState(stateWithoutInsurance, auRules);
      
      // With insurance premiums, sustainable spending should be lower
      expect(decisionWithInsurance.kpis.sustainableAnnual)
        .toBeLessThan(decisionWithoutInsurance.kpis.sustainableAnnual);
      
      // The difference should be meaningful (not just rounding errors)
      const difference = decisionWithoutInsurance.kpis.sustainableAnnual - 
                        decisionWithInsurance.kpis.sustainableAnnual;
      expect(difference).toBeGreaterThan(1000); // At least $1000 difference
    });

    it('should handle high insurance premiums that could deplete super balance', () => {
      const stateWithHighInsurance = { 
        ...baseState, 
        currentSuper: 50000, // Lower starting super
        superInsurancePremium: 5000 // High premium that could deplete balance
      };
      
      const decision = decisionFromState(stateWithHighInsurance, auRules);
      
      // Should still return a valid decision (not crash)
      expect(decision).toBeDefined();
      expect(typeof decision.kpis.sustainableAnnual).toBe('number');
      expect(decision.kpis.sustainableAnnual).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero insurance premium correctly', () => {
      const stateWithZeroInsurance = { 
        ...baseState, 
        superInsurancePremium: 0
      };
      
      const decision = decisionFromState(stateWithZeroInsurance, auRules);
      
      expect(decision).toBeDefined();
      expect(typeof decision.kpis.sustainableAnnual).toBe('number');
      expect(decision.kpis.sustainableAnnual).toBeGreaterThan(0);
    });

    it('should handle undefined insurance premium (backward compatibility)', () => {
      const stateWithUndefinedInsurance = { 
        ...baseState
        // superInsurancePremium intentionally omitted
      };
      
      const decision = decisionFromState(stateWithUndefinedInsurance, auRules);
      
      expect(decision).toBeDefined();
      expect(typeof decision.kpis.sustainableAnnual).toBe('number');
      expect(decision.kpis.sustainableAnnual).toBeGreaterThan(0);
    });
  });

  describe('Insurance premium impact on retirement timing', () => {
    it('should delay earliest retirement age when insurance premiums are high', () => {
      const baseDecision = decisionFromState({ 
        ...baseState, 
        superInsurancePremium: 0 
      }, auRules);
      
      const highInsuranceDecision = decisionFromState({ 
        ...baseState, 
        superInsurancePremium: 4000 // Significant premium
      }, auRules);
      
      // High insurance premiums should either:
      // 1. Delay the earliest retirement age, OR
      // 2. Reduce sustainable spending significantly
      if (baseDecision.earliestFireAge && highInsuranceDecision.earliestFireAge) {
        // If both have earliest fire age, high insurance should delay it or reduce spending significantly
        const spendingReduction = baseDecision.kpis.sustainableAnnual - highInsuranceDecision.kpis.sustainableAnnual;
        const ageDelay = (highInsuranceDecision.earliestFireAge || 999) - (baseDecision.earliestFireAge || 999);
        
        // Should have either meaningful spending reduction OR age delay
        expect(spendingReduction > 2000 || ageDelay > 0).toBe(true);
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle extremely high insurance premiums gracefully', () => {
      const extremeState = { 
        ...baseState, 
        superInsurancePremium: 20000 // Extremely high premium
      };
      
      expect(() => {
        const decision = decisionFromState(extremeState, auRules);
        expect(decision).toBeDefined();
      }).not.toThrow();
    });

    it('should handle negative insurance premium values', () => {
      const negativeState = { 
        ...baseState, 
        superInsurancePremium: -1000 // Invalid negative value
      };
      
      expect(() => {
        const decision = decisionFromState(negativeState, auRules);
        expect(decision).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Premium interaction with other super features', () => {
    it('should work correctly with additional super contributions', () => {
      const stateWithBoth = { 
        ...baseState, 
        superInsurancePremium: 2000,
        additionalSuperContributions: 10000
      };
      
      const decision = decisionFromState(stateWithBoth, auRules);
      
      expect(decision).toBeDefined();
      expect(typeof decision.kpis.sustainableAnnual).toBe('number');
      expect(decision.kpis.sustainableAnnual).toBeGreaterThan(0);
    });

    it('should work with different life expectancy values', () => {
      const shortLifeExpectancy = { 
        ...baseState, 
        lifeExpectancy: 80,
        superInsurancePremium: 3000
      };
      
      const longLifeExpectancy = { 
        ...baseState, 
        lifeExpectancy: 95,
        superInsurancePremium: 3000
      };
      
      const shortDecision = decisionFromState(shortLifeExpectancy, auRules);
      const longDecision = decisionFromState(longLifeExpectancy, auRules);
      
      expect(shortDecision).toBeDefined();
      expect(longDecision).toBeDefined();
      expect(shortDecision.kpis.sustainableAnnual).toBeGreaterThan(0);
      expect(longDecision.kpis.sustainableAnnual).toBeGreaterThan(0);
    });
  });
});