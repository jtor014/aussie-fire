import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('T-023: Viability Consistency Tests', () => {
  const baseState = {
    currentAge: 35,
    lifeExpectancy: 85,
    currentSavings: 100000,
    currentSuper: 200000,
    annualIncome: 100000,
    annualExpenses: 60000,
    expectedReturn: 7.0,
    inflationRate: 2.5,
    planningAs: 'single',
    ageBandsEnabled: true
  };

  describe('Epsilon clamping for bridge assessment', () => {
    it('should treat tiny shortfalls as covered', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // If the bridge shortfall is less than $1, it should be considered covered
      if (decision.dwz?.bridge?.shortfall !== undefined && decision.dwz.bridge.shortfall < 1) {
        expect(decision.dwz.bridge.status).toBe('covered');
        expect(decision.dwz.bridge.shortfall).toBe(0);
      }
    });

    it('should never show "Need $0... Short"', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // If required is essentially 0, status must be covered
      if (decision.dwz?.bridge?.requiredOutside <= 1) {
        expect(decision.dwz.bridge.status).toBe('covered');
      }
      
      // If status is short, required must be > $1
      if (decision.dwz?.bridge?.status === 'short') {
        expect(decision.dwz.bridge.requiredOutside).toBeGreaterThan(1);
      }
    });

    it('should have consistent banner and bridge chip states', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // If banner says viable, bridge must be covered
      if (decision.kpis.viable === true) {
        expect(decision.kpis.bridge.status).toBe('covered');
      }
      
      // If bridge is short, banner cannot be viable
      if (decision.kpis.bridge?.status === 'short') {
        expect(decision.kpis.viable).toBe(false);
      }
    });
  });

  describe('Edge case scenarios', () => {
    it('should handle zero bridge period (retirement at preservation age)', () => {
      const stateAtPreservation = {
        ...baseState,
        currentAge: 60,
        retirementAge: 60
      };
      
      const decision = decisionFromState(stateAtPreservation, auRules);
      
      // No bridge period means automatically covered
      if (decision.dwz?.bridge?.yearsNeeded === 0) {
        expect(decision.dwz.bridge.status).toBe('covered');
        expect(decision.dwz.bridge.shortfall).toBe(0);
      }
    });

    it('should handle negative shortfalls gracefully', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // Shortfall should never be negative
      expect(decision.dwz?.bridge?.shortfall || 0).toBeGreaterThanOrEqual(0);
      expect(decision.kpis?.bridge?.shortfall || 0).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Unified data flow', () => {
    it('should expose unified DWZ bundle', () => {
      const decision = decisionFromState(baseState, auRules);
      
      expect(decision.dwz).toBeDefined();
      expect(decision.dwz.sustainableAnnual).toBeDefined();
      expect(decision.dwz.bandSchedule).toBeDefined();
      expect(decision.dwz.isViable).toBeDefined();
      expect(decision.dwz.bridge).toBeDefined();
      expect(decision.dwz.bridge.status).toMatch(/^(covered|short)$/);
    });

    it('should have consistent viability between dwz and kpis', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // DWZ isViable should match kpis.viable
      expect(decision.dwz.isViable).toBe(decision.kpis.viable);
      
      // Bridge status should be consistent
      expect(decision.dwz.bridge.status).toBe(decision.kpis.bridge.status);
    });
  });
});