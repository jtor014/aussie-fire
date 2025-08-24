import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import { bandMultiplierAt, computeBridgeFromSchedule } from '../src/core/age_bands.js';
import auRules from '../src/data/au_rules.json';

describe('T-025: DWZ Consistency and Scale Invariance', () => {
  describe('Scale Invariance', () => {
    const baseState = {
      currentAge: 35,
      retirementAge: 50,
      lifeExpectancy: 85,
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      inflationRate: 2.5,
      planningAs: 'single',
      ageBandsEnabled: true,
      bequest: 0
    };

    it('should maintain consistency when balances are scaled 10x', () => {
      // Base scenario
      const baseDecision = decisionFromState(baseState, auRules);
      
      // 10x scaled scenario
      const scaledState = {
        ...baseState,
        currentSavings: baseState.currentSavings * 10,
        currentSuper: baseState.currentSuper * 10
      };
      const scaledDecision = decisionFromState(scaledState, auRules);

      // Both should have valid DWZ bundles
      expect(baseDecision.dwz).toBeDefined();
      expect(scaledDecision.dwz).toBeDefined();
      
      // Path should end within ±1% of bequest target for both
      if (baseDecision.dwz?.path?.length > 0) {
        const baseFinalPoint = baseDecision.dwz.path[baseDecision.dwz.path.length - 1];
        const tolerance = Math.max(1, 0.01 * baseDecision.dwz.sustainableAnnual);
        expect(Math.abs(baseFinalPoint.total - baseState.bequest)).toBeLessThanOrEqual(tolerance);
      }

      if (scaledDecision.dwz?.path?.length > 0) {
        const scaledFinalPoint = scaledDecision.dwz.path[scaledDecision.dwz.path.length - 1];
        const tolerance = Math.max(1, 0.01 * scaledDecision.dwz.sustainableAnnual);
        expect(Math.abs(scaledFinalPoint.total - baseState.bequest)).toBeLessThanOrEqual(tolerance);
      }

      // Bridge calculation should scale appropriately
      if (baseDecision.dwz?.bridge && scaledDecision.dwz?.bridge) {
        // Bridge years should be the same
        expect(scaledDecision.dwz.bridge.years).toBe(baseDecision.dwz.bridge.years);
        
        // Scaled scenario should either have same coverage or better coverage
        if (baseDecision.dwz.bridge.isCovered) {
          expect(scaledDecision.dwz.bridge.isCovered).toBe(true);
        }
      }
    });

    it('should show declining wealth trajectory regardless of scale', () => {
      const states = [
        baseState,
        { ...baseState, currentSavings: baseState.currentSavings * 10, currentSuper: baseState.currentSuper * 10 }
      ];

      states.forEach((state, index) => {
        const decision = decisionFromState(state, auRules);
        
        if (decision.dwz?.isViable && decision.dwz?.path?.length > 10) {
          const retirementAge = decision.dwz.earliestViableAge || 60;
          const retirementIndex = decision.dwz.path.findIndex(p => p.age >= retirementAge);
          
          if (retirementIndex > 0 && retirementIndex < decision.dwz.path.length - 10) {
            // Check that wealth eventually declines after retirement
            const midIndex = Math.floor((retirementIndex + decision.dwz.path.length) / 2);
            const endIndex = decision.dwz.path.length - 1;
            
            const retirementWealth = decision.dwz.path[retirementIndex].total;
            const midWealth = decision.dwz.path[midIndex].total;
            const endWealth = decision.dwz.path[endIndex].total;
            
            // Should show decline from retirement to end
            expect(endWealth).toBeLessThan(retirementWealth);
            
            // Test name for debugging
            console.log(`Scale ${index === 0 ? '1x' : '10x'}: Retirement=${retirementWealth}, Mid=${midWealth}, End=${endWealth}`);
          }
        }
      });
    });
  });

  describe('Banner-Bridge Consistency', () => {
    it('should never show green banner with red bridge status', () => {
      const testStates = [
        // High balance scenario (should be green/covered)
        {
          currentAge: 40,
          retirementAge: 55,
          lifeExpectancy: 85,
          currentSavings: 800000,
          currentSuper: 1200000,
          annualIncome: 120000,
          annualExpenses: 70000,
          expectedReturn: 7.0,
          inflationRate: 2.5,
          planningAs: 'single',
          ageBandsEnabled: true,
          bequest: 0
        },
        // Low balance scenario (should be amber/short)
        {
          currentAge: 40,
          retirementAge: 45,
          lifeExpectancy: 85,
          currentSavings: 50000,
          currentSuper: 100000,
          annualIncome: 80000,
          annualExpenses: 60000,
          expectedReturn: 7.0,
          inflationRate: 2.5,
          planningAs: 'single',
          ageBandsEnabled: true,
          bequest: 0
        }
      ];

      testStates.forEach((state, index) => {
        const decision = decisionFromState(state, auRules);
        
        // Check DWZ bundle exists
        expect(decision.dwz).toBeDefined();
        expect(decision.dwz.bridge).toBeDefined();
        
        const isViable = decision.dwz.isViable;
        const bridgeCovered = decision.dwz.bridge.isCovered;
        
        // Banner and bridge must agree on viability
        if (isViable) {
          expect(bridgeCovered).toBe(true);
        } else {
          // If not viable, bridge should be the reason (for early retirement scenarios)
          expect(bridgeCovered).toBe(false);
        }
        
        console.log(`Test ${index}: Viable=${isViable}, Bridge=${bridgeCovered}`);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('bandMultiplierAt', () => {
      const sampleBands = [
        { startAge: 50, endAge: 60, multiplier: 1.1, name: 'go-go' },
        { startAge: 60, endAge: 75, multiplier: 1.0, name: 'slow-go' },
        { startAge: 75, endAge: 90, multiplier: 0.85, name: 'no-go' }
      ];

      it('should return correct multipliers for different ages', () => {
        expect(bandMultiplierAt(55, sampleBands)).toBe(1.1);
        expect(bandMultiplierAt(65, sampleBands)).toBe(1.0);
        expect(bandMultiplierAt(80, sampleBands)).toBe(0.85);
      });

      it('should return default multiplier for ages outside bands', () => {
        expect(bandMultiplierAt(45, sampleBands)).toBe(1); // before first band
        expect(bandMultiplierAt(95, sampleBands)).toBe(1); // after last band
      });

      it('should handle empty or undefined bands', () => {
        expect(bandMultiplierAt(55, [])).toBe(1);
        expect(bandMultiplierAt(55, undefined)).toBe(1);
        expect(bandMultiplierAt(55, null)).toBe(1);
      });
    });

    describe('computeBridgeFromSchedule', () => {
      const sampleBands = [
        { startAge: 50, endAge: 60, multiplier: 1.1, name: 'go-go' },
        { startAge: 60, endAge: 75, multiplier: 1.0, name: 'slow-go' }
      ];

      it('should compute bridge requirement using schedule-based spending', () => {
        const result = computeBridgeFromSchedule({
          startAge: 50,
          S_base: 60000,
          bands: sampleBands,
          outsideAtRetire: 500000,
          preservationAge: 60,
          epsilon: 1
        });

        expect(result.years).toBe(10); // 50 to 60
        expect(result.needTotal).toBe(60000 * 1.1 * 10); // S_base * go-go multiplier * years
        expect(result.haveTotal).toBe(500000);
        expect(result.isCovered).toBe(result.haveTotal >= result.needTotal - 1);
      });

      it('should return zero requirement when no bridge needed', () => {
        const result = computeBridgeFromSchedule({
          startAge: 65,
          S_base: 60000,
          bands: sampleBands,
          outsideAtRetire: 500000,
          preservationAge: 60,
          epsilon: 1
        });

        expect(result.years).toBe(0);
        expect(result.needTotal).toBe(0);
        expect(result.isCovered).toBe(true);
        expect(result.status).toBe('covered');
      });

      it('should apply epsilon clamp for nearly-covered scenarios', () => {
        const result = computeBridgeFromSchedule({
          startAge: 50,
          S_base: 60000,
          bands: sampleBands,
          outsideAtRetire: 659999, // $1 short of 660,000 needed
          preservationAge: 60,
          epsilon: 1
        });

        expect(result.isCovered).toBe(true); // Should be covered due to epsilon
        expect(result.shortfall).toBe(0); // Should be clamped to zero
      });
    });
  });

  describe('Insurance Premium Integration', () => {
    it('should apply insurance premiums consistently in path and bridge', () => {
      const stateWithInsurance = {
        currentAge: 35,
        retirementAge: 50,
        lifeExpectancy: 85,
        currentSavings: 300000,
        currentSuper: 500000,
        annualIncome: 100000,
        annualExpenses: 60000,
        expectedReturn: 7.0,
        inflationRate: 2.5,
        planningAs: 'single',
        ageBandsEnabled: false, // Flat spending for simplicity
        superInsurancePremium: 3000, // $3k annual premium
        bequest: 0
      };

      const stateWithoutInsurance = {
        ...stateWithInsurance,
        superInsurancePremium: 0
      };

      const withInsurance = decisionFromState(stateWithInsurance, auRules);
      const withoutInsurance = decisionFromState(stateWithoutInsurance, auRules);

      // Both should have paths
      expect(withInsurance.dwz?.path).toBeDefined();
      expect(withoutInsurance.dwz?.path).toBeDefined();

      if (withInsurance.dwz?.path?.length > 5 && withoutInsurance.dwz?.path?.length > 5) {
        // Compare super balances at age 45 (before retirement)
        const age45WithIns = withInsurance.dwz.path.find(p => p.age === 45);
        const age45WithoutIns = withoutInsurance.dwz.path.find(p => p.age === 45);

        if (age45WithIns && age45WithoutIns) {
          // Super should be lower with insurance
          expect(age45WithIns.super).toBeLessThan(age45WithoutIns.super);
        }
      }
    });
  });
});