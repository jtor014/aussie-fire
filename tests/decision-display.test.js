import { describe, it, expect } from 'vitest';
import { decisionFromState, getDecisionDisplay } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('Decision Display Formatting', () => {
  /**
   * Test the getDecisionDisplay function formatting with known decision objects
   */
  describe('getDecisionDisplay formatting', () => {
    it('should format stepped spending correctly when values differ significantly', () => {
      const mockDecision = {
        canRetireAtTarget: true,
        targetAge: 50,
        earliestFireAge: 48,
        shortfallPhase: null,
        kpis: {
          S_pre: 75000,
          S_post: 95000,
          planSpend: 95000
        }
      };

      const display = getDecisionDisplay(mockDecision);
      
      expect(display.primaryMessage).toContain('Can retire at 50 with DWZ');
      expect(display.sustainableSpend).toContain('$75,000 / $95,000 per year');
      expect(display.status).toBe('success');
      expect(display.earliestMessage).toBe('Earliest FIRE: 48');
    });

    it('should format similar spending values as single amount', () => {
      const mockDecision = {
        canRetireAtTarget: true,
        targetAge: 55,
        earliestFireAge: 55,
        shortfallPhase: null,
        kpis: {
          S_pre: 80000,
          S_post: 80500, // Within 1000 difference
          planSpend: 80000
        }
      };

      const display = getDecisionDisplay(mockDecision);
      
      expect(display.sustainableSpend).toBe('$80,000/yr');
      expect(display.status).toBe('success');
    });

    it('should handle non-viable scenarios correctly', () => {
      const mockDecision = {
        canRetireAtTarget: false,
        targetAge: 45,
        earliestFireAge: null,
        shortfallPhase: 'pre',
        kpis: {
          S_pre: 45000,
          S_post: 65000,
          planSpend: 65000
        }
      };

      const display = getDecisionDisplay(mockDecision);
      
      expect(display.primaryMessage).toContain('Cannot retire at 45 with DWZ');
      expect(display.status).toBe('warning');
      expect(display.statusDetail).toBe('Shortfall pre-super');
      expect(display.earliestMessage).toBe('Earliest FIRE: Not achievable');
    });

    it('should handle shortfall scenarios with phase details', () => {
      const mockDecision = {
        canRetireAtTarget: false,
        targetAge: 50,
        earliestFireAge: 58,
        shortfallPhase: 'post',
        kpis: {
          S_pre: 80000,
          S_post: 55000,
          planSpend: 80000
        }
      };

      const display = getDecisionDisplay(mockDecision);
      
      expect(display.statusDetail).toBe('Shortfall post-super');
      expect(display.earliestMessage).toBe('Earliest FIRE: 58');
    });
  });

  /**
   * Test formatting with real decision calculations
   */
  describe('Real decision formatting', () => {
    const testState = {
      currentAge: 30,
      retirementAge: 50,
      lifeExpectancy: 90,
      currentSavings: 50000,
      currentSuper: 100000,
      annualIncome: 120000,
      annualExpenses: 65000,
      expectedReturn: 8.5,
      inflationRate: 2.5,
      bequest: 0,
      dwzPlanningMode: 'earliest'
    };

    it('should produce properly formatted display for viable scenario', () => {
      const decision = decisionFromState(testState, auRules);
      const display = getDecisionDisplay(decision);

      expect(display).toBeDefined();
      expect(display.primaryMessage).toBeDefined();
      expect(display.sustainableSpend).toBeDefined();
      expect(display.status).toMatch(/^(success|warning)$/);

      // Should contain formatted currency values
      expect(display.sustainableSpend).toMatch(/\$[\d,]+/);
      
      // Primary message should contain age
      expect(display.primaryMessage).toMatch(/\d+/);
    });

    it('should handle edge case with very low wealth', () => {
      const lowWealthState = {
        ...testState,
        currentSavings: 1000,
        currentSuper: 5000,
        retirementAge: 65
      };

      const decision = decisionFromState(lowWealthState, auRules);
      const display = getDecisionDisplay(decision);

      // Should still produce valid formatted output even if not viable
      expect(display.primaryMessage).toBeDefined();
      expect(display.sustainableSpend).toBeDefined();
      expect(display.sustainableSpend).toMatch(/\$[\d,]+/);
    });
  });

  /**
   * Test edge cases and error handling in formatting
   */
  describe('Edge cases and error handling', () => {
    it('should handle zero or negative spending gracefully', () => {
      const mockDecision = {
        canRetireAtTarget: false,
        targetAge: 40,
        earliestFireAge: null,
        shortfallPhase: 'both',
        kpis: {
          S_pre: 0,
          S_post: 0,
          planSpend: 0
        }
      };

      const display = getDecisionDisplay(mockDecision);
      
      expect(display.sustainableSpend).toBe('$0/yr');
      expect(display.status).toBe('warning');
    });

    it('should handle undefined kpis gracefully', () => {
      const mockDecision = {
        canRetireAtTarget: false,
        targetAge: 50,
        earliestFireAge: null,
        shortfallPhase: null,
        kpis: {
          S_pre: undefined,
          S_post: undefined,
          planSpend: 0
        }
      };

      // Should not throw error
      expect(() => getDecisionDisplay(mockDecision)).not.toThrow();
      
      const display = getDecisionDisplay(mockDecision);
      expect(display.sustainableSpend).toBeDefined();
    });
  });
});