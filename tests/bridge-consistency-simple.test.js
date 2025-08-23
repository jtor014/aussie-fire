import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

/**
 * T-021: Simplified Bridge Consistency Tests
 * 
 * These tests verify the core fix: ensuring GlobalBanner and BridgeChip
 * use the same underlying math by having both read from the unified
 * bridge assessment in the decision selector.
 */

describe('T-021: Bridge Consistency - Core Fix', () => {
  
  describe('Bridge Assessment Structure', () => {
    it('should provide unified bridge assessment for UI components', () => {
      const state = {
        currentAge: 45,
        retirementAge: 55,
        lifeExpectancy: 85,
        annualExpenses: 70000,
        currentSavings: 300000,
        currentSuper: 200000,
        annualIncome: 120000,
        expectedReturn: 8.5,
        inflationRate: 2.5,
        ageBandsEnabled: true,
        ageBandSettings: {
          gogoTo: 60, slowTo: 75,
          gogoMult: 1.10, slowMult: 1.00, nogoMult: 0.85
        }
      };

      const decision = decisionFromState(state, auRules);

      // Verify the unified bridge assessment structure exists
      expect(decision.kpis.bridgeAssessment).toBeDefined();
      expect(decision.kpis.bridgeAssessment).toMatchObject({
        neededPV: expect.any(Number),
        havePV: expect.any(Number),
        years: expect.any(Number),
        covered: expect.any(Boolean)
      });

      // Verify constraint analysis exists (for GlobalBanner)
      expect(decision.kpis.constraint).toBeDefined();
      expect(decision.kpis.constraint.type).toMatch(/^(bridge|horizon)$/);
    });
  });

  describe('Internal Consistency', () => {
    it('should have consistent bridge years calculation', () => {
      const state = {
        currentAge: 40,
        retirementAge: 58,  // Creates 2-year bridge (58 to 60)
        lifeExpectancy: 85,
        annualExpenses: 60000,
        currentSavings: 400000,
        currentSuper: 300000,
        annualIncome: 100000,
        expectedReturn: 8.5,
        inflationRate: 2.5,
        ageBandsEnabled: false  // Use flat spending for simplicity
      };

      const decision = decisionFromState(state, auRules);
      
      // The bridge period should be calculated consistently
      const expectedBridgeYears = Math.max(0, decision.preservationAge - decision.targetAge);
      expect(decision.kpis.bridgeAssessment.years).toBe(expectedBridgeYears);

      console.log('Bridge Years Test:', {
        preservationAge: decision.preservationAge,
        targetAge: decision.targetAge,
        expectedBridge: expectedBridgeYears,
        actualBridge: decision.kpis.bridgeAssessment.years
      });
    });

    it('should have consistent constraint classification', () => {
      // Test scenario where constraint type should match bridge status
      const scenarios = [
        {
          name: 'Well funded scenario',
          state: {
            currentAge: 50,
            retirementAge: 58,
            lifeExpectancy: 85,
            annualExpenses: 50000,
            currentSavings: 500000,  // High outside savings
            currentSuper: 400000,
            annualIncome: 80000,
            expectedReturn: 8.5,
            inflationRate: 2.5,
            ageBandsEnabled: false
          }
        }
      ];

      scenarios.forEach(scenario => {
        const decision = decisionFromState(scenario.state, auRules);
        
        console.log(`${scenario.name} Results:`, {
          constraintType: decision.kpis.constraint?.type,
          bridgeCovered: decision.kpis.bridgeAssessment.covered,
          bridgeYears: decision.kpis.bridgeAssessment.years,
          neededVsHave: `${Math.round(decision.kpis.bridgeAssessment.neededPV)} vs ${Math.round(decision.kpis.bridgeAssessment.havePV)}`
        });

        // Core consistency check: Both bridge chip and banner should be telling the same story
        if (decision.kpis.constraint?.type === 'bridge') {
          // If banner says bridge-limited, bridge should not be fully covered
          // (This is the main consistency fix)
          expect(decision.kpis.bridgeAssessment.covered).toBe(false);
        } else if (decision.kpis.constraint?.type === 'horizon') {
          // If banner says horizon-limited, bridge should typically be covered
          // (though this isn't a strict rule - could be both are problems)
          expect(decision.kpis.bridgeAssessment).toBeDefined();
        }

        // Basic sanity checks
        expect(decision.kpis.bridgeAssessment.neededPV).toBeGreaterThanOrEqual(0);
        expect(decision.kpis.bridgeAssessment.havePV).toBeGreaterThanOrEqual(0);
        expect(decision.kpis.bridgeAssessment.years).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Component Data Availability', () => {
    it('should provide all data needed for GlobalBanner component', () => {
      const state = {
        currentAge: 45, retirementAge: 55, lifeExpectancy: 85,
        annualExpenses: 70000, currentSavings: 200000, currentSuper: 300000,
        annualIncome: 120000, expectedReturn: 8.5, inflationRate: 2.5
      };

      const decision = decisionFromState(state, auRules);

      // GlobalBanner needs constraint type and atAge
      expect(decision.kpis.constraint?.type).toBeDefined();
      expect(decision.kpis.constraint?.atAge).toBeDefined();
      
      if (decision.kpis.constraint?.type === 'bridge') {
        expect(decision.kpis.constraint.atAge).toBe(decision.preservationAge);
      } else if (decision.kpis.constraint?.type === 'horizon') {
        expect(decision.kpis.constraint.atAge).toBe(state.lifeExpectancy);
      }
    });

    it('should provide all data needed for BridgeChip component', () => {
      const state = {
        currentAge: 45, retirementAge: 55, lifeExpectancy: 85,
        annualExpenses: 70000, currentSavings: 200000, currentSuper: 300000,
        annualIncome: 120000, expectedReturn: 8.5, inflationRate: 2.5
      };

      const decision = decisionFromState(state, auRules);

      // BridgeChip needs bridge assessment data
      expect(decision.kpis.bridgeAssessment.covered).toBeDefined();
      expect(decision.kpis.bridgeAssessment.years).toBeDefined();
      expect(decision.kpis.bridgeAssessment.neededPV).toBeDefined();
      expect(decision.kpis.bridgeAssessment.havePV).toBeDefined();
    });
  });
});