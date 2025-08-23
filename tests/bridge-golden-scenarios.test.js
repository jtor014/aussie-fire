import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

/**
 * T-021: Golden Scenario Tests for Bridge Consistency
 * 
 * These tests verify specific scenarios where the inconsistency between
 * GlobalBanner and BridgeChip was most apparent. They ensure that:
 * 1. Banner constraint classification matches bridge chip status
 * 2. Both use the same preservation age and spending schedule
 * 3. Edge cases are handled consistently
 */

describe('T-021: Golden Bridge Scenarios', () => {
  describe('Scenario 1: High-Income Professional (Bridge vs Horizon Conflict)', () => {
    // This scenario previously caused banner to say "horizon-limited" 
    // while bridge chip said "Short" due to different math
    const professionalState = {
      currentAge: 35,
      retirementAge: 50,
      lifeExpectancy: 90,
      annualExpenses: 100000,
      currentSavings: 300000,
      currentSuper: 200000,
      annualIncome: 180000,
      additionalSuperContributions: 25000,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      ageBandsEnabled: true,
      ageBandSettings: {
        gogoTo: 60, slowTo: 75,
        gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
      }
    };

    it('should have consistent banner and chip classification', () => {
      const decision = decisionFromState(professionalState, auRules);
      
      // Extract the key metrics that drive UI display
      const constraintType = decision.kpis.constraint?.type;
      const bridgeCovered = decision.kpis.bridgeAssessment?.covered;
      const bridgeYears = decision.kpis.bridgeAssessment?.years;
      
      // Log for debugging
      console.log('Professional Scenario Results:', {
        constraintType,
        bridgeCovered,
        bridgeYears,
        bridgeNeed: decision.kpis.bridgeAssessment?.neededPV,
        bridgeHave: decision.kpis.bridgeAssessment?.havePV,
        sustainableSpend: decision.kpis.sustainableAnnual
      });
      
      // Verify consistency between constraint and bridge assessment
      if (constraintType === 'bridge') {
        // If banner says "bridge-limited", chip should show "Short" (not covered)
        expect(bridgeCovered).toBe(false);
      } else if (constraintType === 'horizon') {
        // If banner says "horizon-limited", bridge should be covered
        expect(bridgeCovered).toBe(true);
      }
      
      // Should have a bridge period for retirement at 50
      expect(bridgeYears).toBeGreaterThan(0);
      expect(bridgeYears).toBe(60 - professionalState.retirementAge);
    });

    it('should provide detailed bridge breakdown', () => {
      const decision = decisionFromState(professionalState, auRules);
      const bridge = decision.kpis.bridgeAssessment;
      
      // Bridge assessment should be detailed and realistic
      expect(bridge.neededPV).toBeGreaterThan(0);
      expect(bridge.havePV).toBeGreaterThan(0);
      expect(bridge.years).toBe(10); // 50 to 60
      
      // Values should be reasonable for the scenario
      expect(bridge.neededPV).toBeGreaterThan(200000); // Need significant funds for 10 years
      expect(bridge.neededPV).toBeLessThan(2000000);   // But not unrealistic
    });
  });

  describe('Scenario 2: Early Retiree with Low Outside Savings (Clear Bridge-Limited)', () => {
    const earlyRetireeState = {
      currentAge: 40,
      retirementAge: 45,
      lifeExpectancy: 85,
      annualExpenses: 70000,
      currentSavings: 100000,    // Low outside savings
      currentSuper: 400000,      // High super balance
      annualIncome: 90000,
      additionalSuperContributions: 0,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      ageBandsEnabled: true,
      ageBandSettings: {
        gogoTo: 60, slowTo: 75,
        gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
      }
    };

    it('should clearly identify as bridge-limited', () => {
      const decision = decisionFromState(earlyRetireeState, auRules);
      
      // Should be bridge-limited due to low outside savings vs long bridge period
      expect(decision.kpis.constraint?.type).toBe('bridge');
      expect(decision.kpis.constraint?.atAge).toBe(60);
      
      // Bridge should not be covered
      expect(decision.kpis.bridgeAssessment.covered).toBe(false);
      expect(decision.kpis.bridgeAssessment.years).toBe(15); // 45 to 60
      
      // Need should exceed availability
      expect(decision.kpis.bridgeAssessment.neededPV).toBeGreaterThan(decision.kpis.bridgeAssessment.havePV);
      
      console.log('Early Retiree Bridge Analysis:', {
        constraint: decision.kpis.constraint?.type,
        bridgeCovered: decision.kpis.bridgeAssessment.covered,
        bridgeShortfall: decision.kpis.bridgeAssessment.neededPV - decision.kpis.bridgeAssessment.havePV
      });
    });
  });

  describe('Scenario 3: Late Retiree with Ample Savings (Clear Horizon-Limited)', () => {
    const lateRetireeState = {
      currentAge: 55,
      retirementAge: 58,
      lifeExpectancy: 92,
      annualExpenses: 120000,
      currentSavings: 800000,    // High outside savings
      currentSuper: 600000,      // High super too
      annualIncome: 150000,
      additionalSuperContributions: 0,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      ageBandsEnabled: true,
      ageBandSettings: {
        gogoTo: 60, slowTo: 75,
        gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
      }
    };

    it('should clearly identify as horizon-limited', () => {
      const decision = decisionFromState(lateRetireeState, auRules);
      
      // Should be horizon-limited - total wealth is the constraint, not bridge
      expect(decision.kpis.constraint?.type).toBe('horizon');
      expect(decision.kpis.constraint?.atAge).toBe(lateRetireeState.lifeExpectancy);
      
      // Bridge should be easily covered due to high savings and short period
      expect(decision.kpis.bridgeAssessment.covered).toBe(true);
      expect(decision.kpis.bridgeAssessment.years).toBe(2); // 58 to 60
      
      // Availability should exceed need
      expect(decision.kpis.bridgeAssessment.havePV).toBeGreaterThanOrEqual(decision.kpis.bridgeAssessment.neededPV);
      
      console.log('Late Retiree Analysis:', {
        constraint: decision.kpis.constraint?.type,
        bridgeCovered: decision.kpis.bridgeAssessment.covered,
        bridgeSurplus: decision.kpis.bridgeAssessment.havePV - decision.kpis.bridgeAssessment.neededPV
      });
    });
  });

  describe('Scenario 4: Retirement at Preservation Age (No Bridge Period)', () => {
    const presAgeState = {
      currentAge: 55,
      retirementAge: 60,         // Retire exactly at preservation age
      lifeExpectancy: 85,
      annualExpenses: 80000,
      currentSavings: 400000,
      currentSuper: 500000,
      annualIncome: 120000,
      additionalSuperContributions: 0,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      ageBandsEnabled: true,
      ageBandSettings: {
        gogoTo: 60, slowTo: 75,
        gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
      }
    };

    it('should handle no bridge period correctly', () => {
      const decision = decisionFromState(presAgeState, auRules);
      
      // No bridge period needed
      expect(decision.kpis.bridgeAssessment.years).toBe(0);
      expect(decision.kpis.bridgeAssessment.covered).toBe(true);
      expect(decision.kpis.bridgeAssessment.neededPV).toBe(0);
      
      // Should be horizon-limited since no bridge constraint
      expect(decision.kpis.constraint?.type).toBe('horizon');
      expect(decision.kpis.constraint?.atAge).toBe(presAgeState.lifeExpectancy);
    });
  });

  describe('Scenario 5: Edge Case - Very High Expenses', () => {
    const highExpenseState = {
      currentAge: 45,
      retirementAge: 55,
      lifeExpectancy: 85,
      annualExpenses: 200000,    // Very high expenses
      currentSavings: 500000,
      currentSuper: 800000,
      annualIncome: 250000,
      additionalSuperContributions: 27500,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      ageBandsEnabled: true,
      ageBandSettings: {
        gogoTo: 60, slowTo: 75,
        gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
      }
    };

    it('should handle high expense scenarios consistently', () => {
      const decision = decisionFromState(highExpenseState, auRules);
      
      // High expenses may result in either bridge or horizon limitation
      expect(['bridge', 'horizon']).toContain(decision.kpis.constraint?.type);
      
      // Bridge assessment should still be consistent
      expect(decision.kpis.bridgeAssessment).toBeDefined();
      expect(decision.kpis.bridgeAssessment.years).toBe(5); // 55 to 60
      
      // If bridge-limited, chip should show not covered
      if (decision.kpis.constraint?.type === 'bridge') {
        expect(decision.kpis.bridgeAssessment.covered).toBe(false);
      }
      
      console.log('High Expense Analysis:', {
        constraint: decision.kpis.constraint?.type,
        sustainableSpend: decision.kpis.sustainableAnnual,
        targetSpend: highExpenseState.annualExpenses,
        bridgeStatus: decision.kpis.bridgeAssessment.covered ? 'Covered' : 'Short'
      });
    });
  });

  describe('Scenario 6: Age Band Impact on Bridge Calculation', () => {
    const baseBandState = {
      currentAge: 40,
      retirementAge: 50,
      lifeExpectancy: 85,
      annualExpenses: 80000,
      currentSavings: 300000,
      currentSuper: 400000,
      annualIncome: 120000,
      additionalSuperContributions: 10000,
      expectedReturn: 8.5,
      inflationRate: 2.5
    };

    it('should handle age bands vs flat spending consistently', () => {
      // Test with age bands
      const ageBandDecision = decisionFromState({
        ...baseBandState,
        ageBandsEnabled: true,
        ageBandSettings: {
          gogoTo: 60, slowTo: 75,
          gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
        }
      }, auRules);

      // Test with flat spending
      const flatDecision = decisionFromState({
        ...baseBandState,
        ageBandsEnabled: false
      }, auRules);

      // Both should have consistent internal logic
      expect(ageBandDecision.kpis.constraint?.type).toBeDefined();
      expect(flatDecision.kpis.constraint?.type).toBeDefined();
      
      // Bridge period should be same (10 years: 50 to 60)
      expect(ageBandDecision.kpis.bridgeAssessment.years).toBe(10);
      expect(flatDecision.kpis.bridgeAssessment.years).toBe(10);
      
      // Consistency within each scenario
      ['ageBand', 'flat'].forEach((scenario) => {
        const decision = scenario === 'ageBand' ? ageBandDecision : flatDecision;
        
        if (decision.kpis.constraint?.type === 'bridge') {
          expect(decision.kpis.bridgeAssessment.covered).toBe(false);
        } else {
          expect(decision.kpis.bridgeAssessment.covered).toBe(true);
        }
      });
    });
  });
});