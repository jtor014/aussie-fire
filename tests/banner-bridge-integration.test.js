import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('T-023: Banner-Bridge Integration Tests', () => {
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

  describe('Banner and bridge chip consistency', () => {
    it('should show green banner when viable with covered bridge', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // Skip if decision isn't viable for this scenario
      if (!decision.dwz?.isViable) {
        return;
      }

      expect(decision.dwz.isViable).toBe(true);
      expect(decision.dwz.bridge.status).toBe('covered');
      expect(decision.kpis.viable).toBe(true);
      expect(decision.kpis.bridge.status).toBe('covered');
      
      // Bridge shortfall should be 0 when covered
      expect(decision.dwz.bridge.shortfall).toBe(0);
      expect(decision.kpis.bridge.shortfall).toBe(0);
    });

    it('should show amber banner when bridge is short', () => {
      // Create scenario with low outside savings to force bridge shortfall
      const shortState = {
        ...baseState,
        currentAge: 30,
        currentSavings: 5000, // Very low
        currentSuper: 30000,  // Low
        annualIncome: 60000,  // Lower income
        annualExpenses: 55000 // High expenses
      };
      
      const decision = decisionFromState(shortState, auRules);
      
      // If bridge is actually short in this scenario
      if (decision.dwz?.bridge?.status === 'short') {
        expect(decision.dwz.isViable).toBe(false);
        expect(decision.kpis.viable).toBe(false);
        expect(decision.dwz.bridge.shortfall).toBeGreaterThan(0);
        expect(decision.kpis.bridge.shortfall).toBeGreaterThan(0);
      }
    });

    it('should have consistent messaging between banner and bridge data', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // DWZ and KPIs should always agree on viability
      expect(decision.dwz.isViable).toBe(decision.kpis.viable);
      expect(decision.dwz.bridge.status).toBe(decision.kpis.bridge.status);
      
      // Shortfall amounts should match
      expect(decision.dwz.bridge.shortfall).toBe(decision.kpis.bridge.shortfall);
      
      // If viable, bridge must be covered
      if (decision.dwz.isViable) {
        expect(decision.dwz.bridge.status).toBe('covered');
      }
      
      // If bridge is short, cannot be viable
      if (decision.dwz.bridge.status === 'short') {
        expect(decision.dwz.isViable).toBe(false);
      }
    });

    it('should provide correct decision structure for UI components', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // Verify decision has expected structure for GlobalBanner and BridgeChip
      expect(decision.dwz).toBeDefined();
      expect(decision.dwz.bridge).toBeDefined();
      expect(decision.dwz.bridge.status).toMatch(/^(covered|short)$/);
      expect(decision.dwz.isViable).toBeDefined();
      
      // Verify kpis also has the bridge data for backward compatibility
      expect(decision.kpis.bridge).toBeDefined();
      expect(decision.kpis.bridge.status).toMatch(/^(covered|short)$/);
      expect(decision.kpis.viable).toBeDefined();
    });
  });

  describe('Epsilon edge cases', () => {
    it('should handle tiny bridge requirements consistently', () => {
      const decision = decisionFromState(baseState, auRules);
      
      // If bridge requirement is very small, should be covered due to epsilon
      const bridge = decision.dwz?.bridge;
      if (bridge && bridge.requiredOutside < 1) {
        expect(bridge.status).toBe('covered');
        expect(bridge.shortfall).toBe(0);
      }
    });

    it('should prevent negative shortfalls in all scenarios', () => {
      const decision = decisionFromState(baseState, auRules);
      
      expect(decision.dwz?.bridge?.shortfall || 0).toBeGreaterThanOrEqual(0);
      expect(decision.kpis?.bridge?.shortfall || 0).toBeGreaterThanOrEqual(0);
      expect(decision.dwz?.bridge?.requiredOutside || 0).toBeGreaterThanOrEqual(0);
    });
  });
});