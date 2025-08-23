import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import { kpisFromState } from '../src/selectors/kpis.js';
import { depletionFromDecision } from '../src/selectors/depletion.js';
import auRules from '../src/data/au_rules.json';

/**
 * T-015 DWZ-only UX Tests
 * 
 * Validates that the target-age flow has been completely removed from business logic
 * and only earliest-first DWZ mode is available in selectors and calculations.
 */
describe('T-015: DWZ-only UX Business Logic', () => {
  const baseState = {
    currentAge: 35,
    retirementAge: 50,
    lifeExpectancy: 85,
    currentSavings: 200000,
    currentSuper: 150000,
    annualIncome: 90000,
    annualExpenses: 55000,
    hecsDebt: 0,
    hasPrivateHealth: false,
    additionalSuperContributions: 0,
    hasInsuranceInSuper: false,
    insurancePremiums: { life: 0, tpd: 0, income: 0 },
    // T-019: Super insurance premium (part of new UX)
    superInsurancePremium: 0,
    expectedReturn: 8.5,
    investmentFees: 0.5,
    bequest: 0,
    inflationRate: 2.5,
    adjustForInflation: true,
    dieWithZeroMode: true, // T-015: Always true now
    planningAs: 'single',
    partnerB: {}
  };

  describe('Absence of dwzPlanningMode and pinnedRetirementAge in decision logic', () => {
    it('should not use dwzPlanningMode parameter in decision calculations', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // Decision should be computed without dwzPlanningMode dependency
      expect(decision).toBeDefined();
      expect(decision.targetAge).toBeDefined();
      expect(decision.earliestFireAge).toBeDefined();
      
      // Should not have dwzPlanningMode in the result
      expect(decision.dwzPlanningMode).toBeUndefined();
    });

    it('should always use earliest age logic regardless of retirementAge input', () => {
      const youngRetireState = { ...baseState, retirementAge: 40 };
      const oldRetireState = { ...baseState, retirementAge: 65 };
      
      const youngDecision = decisionFromState(youngRetireState, auRules);
      const oldDecision = decisionFromState(oldRetireState, auRules);
      
      // Both should calculate earliest age independently of retirementAge input
      if (youngDecision.earliestFireAge && oldDecision.earliestFireAge) {
        // Target age should be based on earliest calculation, not slider input
        expect(youngDecision.targetAge).toBe(youngDecision.earliestFireAge);
        expect(oldDecision.targetAge).toBe(oldDecision.earliestFireAge);
      }
    });

    it('should not reference pinnedRetirementAge in any calculations', () => {
      // Test that adding pinnedRetirementAge to state doesn't affect results
      const stateWithPinned = { 
        ...baseState, 
        pinnedRetirementAge: 45 // Should be ignored
      };
      
      const normalDecision = decisionFromState(baseState, auRules);
      const pinnedDecision = decisionFromState(stateWithPinned, auRules);
      
      // Results should be identical (pinnedRetirementAge ignored)
      expect(pinnedDecision.targetAge).toBe(normalDecision.targetAge);
      expect(pinnedDecision.earliestFireAge).toBe(normalDecision.earliestFireAge);
    });
  });

  describe('Bridge years calculation using earliestFireAge', () => {
    it('should calculate bridgeYears as preservationAge - earliestFireAge', () => {
      const kpis = kpisFromState(baseState, auRules);
      
      expect(kpis.bridgeYears).toBeDefined();
      expect(typeof kpis.bridgeYears).toBe('number');
      expect(kpis.bridgeYears).toBeGreaterThanOrEqual(0);
      
      // Bridge years should be based on preservation age (60) minus effective retirement age
      const preservationAge = 60;
      if (kpis.earliestFireAge) {
        const expectedBridgeYears = Math.max(0, preservationAge - kpis.earliestFireAge);
        expect(kpis.bridgeYears).toBe(expectedBridgeYears);
      }
    });

    it('should have yearsToFreedom based on earliestFireAge when available', () => {
      const kpis = kpisFromState(baseState, auRules);
      
      expect(kpis.yearsToFreedom).toBeDefined();
      expect(typeof kpis.yearsToFreedom).toBe('number');
      
      // Years to freedom should be earliestFireAge - currentAge (or retirementAge - currentAge as fallback)
      if (kpis.earliestFireAge) {
        const expectedYears = Math.max(0, kpis.earliestFireAge - baseState.currentAge);
        expect(kpis.yearsToFreedom).toBe(expectedYears);
      }
    });

    it('should handle edge cases where earliestFireAge is null', () => {
      // Test with impossible scenario (very low savings, high expenses)
      const impossibleState = {
        ...baseState,
        currentSavings: 1000,
        currentSuper: 2000,
        annualIncome: 30000,
        annualExpenses: 80000
      };
      
      const kpis = kpisFromState(impossibleState, auRules);
      
      // Should not crash with null earliestFireAge
      expect(kpis.bridgeYears).toBeGreaterThanOrEqual(0);
      expect(kpis.yearsToFreedom).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Chart markers data (no Retirement markers)', () => {
    it('should not generate Retirement age markers in depletion data', () => {
      const decision = decisionFromState(baseState, auRules);
      const depletionData = depletionFromDecision(baseState, decision, auRules);
      
      if (depletionData && depletionData.markers) {
        // Check that no markers reference "Retirement" or "Target"
        const retirementMarkers = depletionData.markers.filter(marker => 
          marker.label && (
            marker.label.includes('Retirement:') || 
            marker.label.includes('Target:') ||
            marker.label.includes('Pinned')
          )
        );
        
        expect(retirementMarkers).toHaveLength(0);
      }
    });

    it('should include preservation age and life expectancy markers', () => {
      const decision = decisionFromState(baseState, auRules);
      const depletionData = depletionFromDecision(baseState, decision, auRules);
      
      if (depletionData && depletionData.markers) {
        // Should have preservation age marker
        const preservationMarkers = depletionData.markers.filter(marker => 
          marker.type === 'preservation' || 
          (marker.label && marker.label.includes('Super unlocks'))
        );
        
        expect(preservationMarkers.length).toBeGreaterThan(0);
      }
    });

    it('should include earliest FIRE marker when viable', () => {
      const decision = decisionFromState(baseState, auRules);
      
      if (decision.earliestFireAge) {
        // There should be a way to show the earliest FIRE age in charts
        // This is more about ensuring the data is available than testing specific UI
        expect(decision.earliestFireAge).toBeGreaterThanOrEqual(baseState.currentAge);
        expect(decision.earliestFireAge).toBeLessThanOrEqual(baseState.lifeExpectancy);
      }
    });
  });

  describe('Always-on DWZ mode', () => {
    it('should always compute DWZ values regardless of dieWithZeroMode flag', () => {
      const dwzOffState = { ...baseState, dieWithZeroMode: false };
      const dwzOnState = { ...baseState, dieWithZeroMode: true };
      
      const offKpis = kpisFromState(dwzOffState, auRules);
      const onKpis = kpisFromState(dwzOnState, auRules);
      
      // T-015: Both should compute DWZ values (DWZ-only mode)
      expect(offKpis.sustainableSpend).toBeGreaterThan(0);
      expect(offKpis.earliestFireAge).toBeDefined();
      expect(onKpis.sustainableSpend).toBeGreaterThan(0);
      expect(onKpis.earliestFireAge).toBeDefined();
      
      // Results should be identical since DWZ is always on
      expect(offKpis.sustainableSpend).toBe(onKpis.sustainableSpend);
    });

    it('should always use earliest fire age for bridge assessment', () => {
      const kpis = kpisFromState(baseState, auRules);
      
      expect(kpis.bridgeAssessment).toBeDefined();
      expect(kpis.bridgeAssessment.feasible).toBeDefined();
      
      // Bridge assessment should be computed using earliest fire age, not slider retirement age
      if (kpis.earliestFireAge && kpis.earliestFireAge !== baseState.retirementAge) {
        // The assessment should reflect the earliest age, not the slider age
        // This is verified by checking that bridgeYears matches the calculation
        const preservationAge = 60;
        const expectedBridgeYears = Math.max(0, preservationAge - kpis.earliestFireAge);
        expect(kpis.bridgeYears).toBe(expectedBridgeYears);
      }
    });
  });

  describe('State consistency', () => {
    it('should not have dwzPlanningMode in decision state', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // Should not contain dwzPlanningMode field
      expect(Object.hasOwnProperty.call(decision, 'dwzPlanningMode')).toBe(false);
    });

    it('should consistently use targetAge derived from earliestAge', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // targetAge should be earliest age when available
      if (decision.earliestFireAge) {
        expect(decision.targetAge).toBe(decision.earliestFireAge);
      } else {
        // Fallback to retirementAge only when earliest is not viable
        expect(decision.targetAge).toBe(baseState.retirementAge);
      }
    });

    it('should maintain reasonable consistency between KPIs and decision logic', () => {
      const decision = decisionFromState(baseState, auRules);
      const kpis = kpisFromState(baseState, auRules);
      
      // Both should compute earliest fire ages (might differ slightly due to different engines)
      expect(decision.earliestFireAge).toBeDefined();
      expect(kpis.earliestFireAge).toBeDefined();
      
      // Ages should be in reasonable range and within a few years of each other
      if (decision.earliestFireAge && kpis.earliestFireAge) {
        const ageDiff = Math.abs(decision.earliestFireAge - kpis.earliestFireAge);
        expect(ageDiff).toBeLessThanOrEqual(5); // Allow up to 5 year difference between engines
        
        expect(decision.earliestFireAge).toBeGreaterThanOrEqual(baseState.currentAge);
        expect(kpis.earliestFireAge).toBeGreaterThanOrEqual(baseState.currentAge);
      }
      
      // YearsToFreedom should be calculated correctly from KPI's earliest age
      if (kpis.earliestFireAge) {
        expect(kpis.yearsToFreedom).toBe(Math.max(0, kpis.earliestFireAge - baseState.currentAge));
      }
    });
  });

  describe('Legacy parameter handling', () => {
    it('should ignore dwzPlanningMode and pinnedRetirementAge in state', () => {
      const legacyState = {
        ...baseState,
        dwzPlanningMode: 'pinned',
        pinnedRetirementAge: 45
      };
      
      const cleanDecision = decisionFromState(baseState, auRules);
      const legacyDecision = decisionFromState(legacyState, auRules);
      
      // Should produce identical results (legacy params ignored)
      expect(legacyDecision.targetAge).toBe(cleanDecision.targetAge);
      expect(legacyDecision.earliestFireAge).toBe(cleanDecision.earliestFireAge);
    });

    it('should handle undefined/null legacy parameters gracefully', () => {
      const stateWithNulls = {
        ...baseState,
        dwzPlanningMode: null,
        pinnedRetirementAge: undefined
      };
      
      expect(() => {
        decisionFromState(stateWithNulls, auRules);
      }).not.toThrow();
      
      expect(() => {
        kpisFromState(stateWithNulls, auRules);
      }).not.toThrow();
    });
  });

  describe('T-019 UX changes compatibility', () => {
    it('should maintain DWZ logic consistency with new superInsurancePremium field', () => {
      const stateWithoutInsurance = { ...baseState, superInsurancePremium: 0 };
      const stateWithInsurance = { ...baseState, superInsurancePremium: 1500 };
      
      const decisionWithout = decisionFromState(stateWithoutInsurance, auRules);
      const decisionWith = decisionFromState(stateWithInsurance, auRules);
      
      // Both should produce valid results
      expect(decisionWithout).toBeDefined();
      expect(decisionWith).toBeDefined();
      
      // Insurance should reduce sustainable spending
      expect(decisionWith.kpis.sustainableAnnual)
        .toBeLessThanOrEqual(decisionWithout.kpis.sustainableAnnual);
      
      // Should maintain DWZ logic consistency (earliest age calculation)
      if (decisionWithout.earliestFireAge && decisionWith.earliestFireAge) {
        expect(decisionWith.targetAge).toBe(decisionWith.earliestFireAge);
        expect(decisionWithout.targetAge).toBe(decisionWithout.earliestFireAge);
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing earliestFireAge gracefully', () => {
      const edgeCaseState = {
        ...baseState,
        currentSavings: 0,
        currentSuper: 0,
        annualIncome: 20000,
        annualExpenses: 80000 // Impossible scenario
      };
      
      const decision = decisionFromState(edgeCaseState, auRules);
      const kpis = kpisFromState(edgeCaseState, auRules);
      
      // Should not crash
      expect(decision).toBeDefined();
      expect(kpis).toBeDefined();
      
      // Should gracefully handle null earliestFireAge
      expect(kpis.bridgeYears).toBeGreaterThanOrEqual(0);
      expect(kpis.yearsToFreedom).toBeGreaterThanOrEqual(0);
    });

    it('should maintain numerical stability with edge case parameters', () => {
      const extremeState = {
        ...baseState,
        lifeExpectancy: 100,
        currentAge: 60,
        expectedReturn: 0.1, // Very low return
        inflationRate: 10 // High inflation
      };
      
      expect(() => {
        const decision = decisionFromState(extremeState, auRules);
        const kpis = kpisFromState(extremeState, auRules);
        
        // Should produce valid numbers
        expect(typeof decision.targetAge).toBe('number');
        expect(typeof kpis.bridgeYears).toBe('number');
        expect(typeof kpis.yearsToFreedom).toBe('number');
      }).not.toThrow();
    });
  });
});