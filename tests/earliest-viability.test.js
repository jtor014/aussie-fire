import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import { findEarliestViableAge } from '../src/core/dwz_age_band.js';
import auRules from '../src/data/au_rules.json';
import Decimal from 'decimal.js-light';

describe('T-022: Earliest Viability Tests', () => {
  describe('findEarliestViableAge', () => {
    it('should return viable age when bridge is covered', () => {
      const result = findEarliestViableAge({
        currentAge: 35,
        lifeExpectancy: 85,
        preservationAge: 60,
        outsideAtRetirement: new Decimal(500000),
        superAtRetirement: new Decimal(800000),
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0)
      });

      expect(result.viable).toBe(true);
      expect(result.earliestViableAge).toBeDefined();
      expect(result.bridge.status).toBe('covered');
      expect(result.bridge.shortfall).toBe(0);
    });

    it('should return non-viable when bridge is short', () => {
      const result = findEarliestViableAge({
        currentAge: 30,
        lifeExpectancy: 85,
        preservationAge: 60,
        outsideAtRetirement: new Decimal(10000), // Very low outside wealth  
        superAtRetirement: new Decimal(200000), // Lower super too
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0),
        maxSearchAge: 55 // Force search to stop before preservation age
      });

      expect(result.viable).toBe(false);
      expect(result.earliestViableAge).toBeNull();
      expect(result.bridge.status).toBe('short');
      expect(result.bridge.shortfall).toBeGreaterThan(0);
      expect(result.limiting).toBe('bridge');
    });

    it('should handle horizon-limited scenarios', () => {
      const result = findEarliestViableAge({
        currentAge: 62, // After preservation age
        lifeExpectancy: 85,
        preservationAge: 60,
        outsideAtRetirement: new Decimal(800000),
        superAtRetirement: new Decimal(1200000),
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0)
      });

      // When retirement age >= preservation age, should be horizon-limited
      if (result.viable) {
        expect(result.limiting).toBe('horizon');
      }
    });
  });

  describe('Decision Selector Integration', () => {
    const baseState = {
      currentAge: 30,
      lifeExpectancy: 85,
      currentSavings: 100000,
      currentSuper: 150000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      inflationRate: 2.5,
      planningAs: 'single',
      ageBandsEnabled: true
    };

    it('should expose unified viability data', () => {
      const decision = decisionFromState(baseState, auRules);

      expect(decision.kpis.viable).toBeDefined();
      expect(decision.kpis.bridge).toBeDefined();
      expect(decision.kpis.bridge.status).toMatch(/^(covered|short)$/);
      expect(decision.kpis.bridge.need).toBeGreaterThanOrEqual(0);
      expect(decision.kpis.bridge.have).toBeGreaterThanOrEqual(0);
      expect(decision.kpis.bridge.years).toBeGreaterThanOrEqual(0);
      expect(decision.kpis.bridge.shortfall).toBeGreaterThanOrEqual(0);
    });

    it('should gate earliestFireAge based on viability', () => {
      const decision = decisionFromState(baseState, auRules);

      // If bridge is short, earliestFireAge should be null (no green banner)
      if (decision.kpis.bridge.status === 'short') {
        expect(decision.earliestFireAge).toBeNull();
        expect(decision.kpis.viable).toBe(false);
      }

      // If bridge is covered, earliestFireAge should match earliestViableAge
      if (decision.kpis.bridge.status === 'covered') {
        expect(decision.earliestFireAge).toBe(decision.kpis.earliestViableAge);
        expect(decision.kpis.viable).toBe(true);
      }
    });

    it('should always expose earliestTheoreticalAge for diagnostics', () => {
      const decision = decisionFromState(baseState, auRules);

      // Should always have theoretical age even when not viable
      expect(decision.kpis.earliestTheoreticalAge).toBeDefined();
      expect(decision.earliestTheoreticalAge).toBeDefined();
      
      // Viable age should be >= theoretical age or null
      if (decision.kpis.earliestViableAge) {
        expect(decision.kpis.earliestViableAge).toBeGreaterThanOrEqual(decision.kpis.earliestTheoreticalAge);
      }
    });
  });

  describe('Bridge-short scenarios', () => {
    const bridgeShortState = {
      currentAge: 30,
      lifeExpectancy: 85,
      currentSavings: 5000, // Very low outside savings
      currentSuper: 30000, // Low super 
      annualIncome: 60000, // Lower income
      annualExpenses: 50000, // Higher expenses relative to income
      expectedReturn: 7.0,
      inflationRate: 2.5,
      planningAs: 'single',
      ageBandsEnabled: true
    };

    it('should show non-viable when bridge is short', () => {
      const decision = decisionFromState(bridgeShortState, auRules);

      // With very constrained finances, should either be non-viable or viable at very old age
      if (decision.kpis.bridge.status === 'short') {
        expect(decision.kpis.viable).toBe(false);
        expect(decision.earliestFireAge).toBeNull();
        expect(decision.kpis.bridge.shortfall).toBeGreaterThan(0);
        expect(decision.kpis.limiting).toBe('bridge');
      } else {
        // If viable, should be at a very old age (close to preservation age)
        expect(decision.kpis.earliestViableAge).toBeGreaterThanOrEqual(55);
      }
    });
  });
});