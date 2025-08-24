import { describe, it, expect } from 'vitest';
import { buildDwzDepletionPath } from '../src/core/age_bands.js';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('T-024: DWZ Depletion Path Tests', () => {
  describe('buildDwzDepletionPath', () => {
    it('should end within ±1% of bequest at life expectancy', () => {
      const path = buildDwzDepletionPath({
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 85,
        sustainableAnnual: 60000,
        bands: [
          { startAge: 50, endAge: 60, multiplier: 1.1, name: 'go-go' },
          { startAge: 60, endAge: 75, multiplier: 1.0, name: 'slow-go' },
          { startAge: 75, endAge: 85, multiplier: 0.85, name: 'no-go' }
        ],
        preservationAge: 60,
        realReturn: 0.05,
        fees: 0.005,
        insurancePremium: 1000,
        bequest: 0,
        startBalances: { outside: 500000, super: 800000 }
      });

      const finalPoint = path[path.length - 1];
      expect(finalPoint.age).toBe(85);
      
      // Should end close to bequest (0 for DWZ)
      const tolerance = 0.01; // 1% tolerance
      expect(Math.abs(finalPoint.total)).toBeLessThanOrEqual(tolerance * 1000); // Within $10 of $0
    });

    it('should draw from outside only during bridge period', () => {
      const path = buildDwzDepletionPath({
        currentAge: 30,
        retirementAge: 45,
        lifeExpectancy: 85,
        sustainableAnnual: 50000,
        bands: [{ startAge: 45, endAge: 85, multiplier: 1, name: 'flat' }],
        preservationAge: 60,
        realReturn: 0.05,
        fees: 0,
        insurancePremium: 0,
        bequest: 0,
        startBalances: { outside: 400000, super: 600000 }
      });

      // Find points during bridge period (45-60)
      const bridgePoints = path.filter(p => p.age >= 45 && p.age < 60);
      
      // Outside should decrease during bridge
      for (let i = 1; i < bridgePoints.length; i++) {
        const prev = bridgePoints[i - 1];
        const curr = bridgePoints[i];
        
        // Outside should decrease (after accounting for returns)
        const expectedOutside = (prev.outside - 50000) * 1.05;
        expect(curr.outside).toBeLessThanOrEqual(expectedOutside * 1.01); // Allow 1% tolerance
        
        // Super should only grow (no withdrawals)
        expect(curr.super).toBeGreaterThanOrEqual(prev.super);
      }
    });

    it('should apply insurance premiums to super balance', () => {
      const pathWithInsurance = buildDwzDepletionPath({
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 85,
        sustainableAnnual: 60000,
        bands: [{ startAge: 50, endAge: 85, multiplier: 1, name: 'flat' }],
        preservationAge: 60,
        realReturn: 0.05,
        fees: 0,
        insurancePremium: 2000, // $2k annual premium
        bequest: 0,
        startBalances: { outside: 500000, super: 800000 }
      });

      const pathNoInsurance = buildDwzDepletionPath({
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 85,
        sustainableAnnual: 60000,
        bands: [{ startAge: 50, endAge: 85, multiplier: 1, name: 'flat' }],
        preservationAge: 60,
        realReturn: 0.05,
        fees: 0,
        insurancePremium: 0, // No insurance
        bequest: 0,
        startBalances: { outside: 500000, super: 800000 }
      });

      // Super balance should be lower with insurance at each age (except the first point which is starting balance)
      for (let i = 1; i < Math.min(pathWithInsurance.length, pathNoInsurance.length); i++) {
        if (pathWithInsurance[i].age < 60) {
          // Before preservation age, super with insurance should be lower
          expect(pathWithInsurance[i].super).toBeLessThan(pathNoInsurance[i].super);
        }
      }
    });

    it('should tag phases correctly for age-banded spending', () => {
      const path = buildDwzDepletionPath({
        currentAge: 30,
        retirementAge: 50,
        lifeExpectancy: 85,
        sustainableAnnual: 60000,
        bands: [
          { startAge: 50, endAge: 60, multiplier: 1.1, name: 'go-go' },
          { startAge: 60, endAge: 75, multiplier: 1.0, name: 'slow-go' },
          { startAge: 75, endAge: 85, multiplier: 0.85, name: 'no-go' }
        ],
        preservationAge: 60,
        realReturn: 0.05,
        fees: 0,
        insurancePremium: 0,
        bequest: 0,
        startBalances: { outside: 500000, super: 800000 }
      });

      // Check phase tagging
      const age55Point = path.find(p => p.age === 55);
      expect(age55Point?.phase).toBe('go-go');

      const age65Point = path.find(p => p.age === 65);
      expect(age65Point?.phase).toBe('slow-go');

      const age80Point = path.find(p => p.age === 80);
      expect(age80Point?.phase).toBe('no-go');
    });
  });

  describe('Decision selector integration', () => {
    it('should include depletion path in DWZ bundle', () => {
      const state = {
        currentAge: 35,
        lifeExpectancy: 85,
        currentSavings: 200000,
        currentSuper: 300000,
        annualIncome: 100000,
        annualExpenses: 60000,
        expectedReturn: 7.0,
        inflationRate: 2.5,
        planningAs: 'single',
        ageBandsEnabled: true
      };

      const decision = decisionFromState(state, auRules);

      // Should have a depletion path
      expect(decision.dwz?.path).toBeDefined();
      expect(Array.isArray(decision.dwz.path)).toBe(true);
      
      if (decision.dwz?.path?.length > 0) {
        // Path should start at current age
        expect(decision.dwz.path[0].age).toBe(state.currentAge);
        
        // Path should end at life expectancy
        const lastPoint = decision.dwz.path[decision.dwz.path.length - 1];
        expect(lastPoint.age).toBe(state.lifeExpectancy);
        
        // Should have required fields
        const firstPoint = decision.dwz.path[0];
        expect(firstPoint).toHaveProperty('outside');
        expect(firstPoint).toHaveProperty('super');
        expect(firstPoint).toHaveProperty('total');
        expect(firstPoint).toHaveProperty('phase');
        expect(firstPoint).toHaveProperty('spend');
      }
    });

    it('should show declining wealth when viable', () => {
      const state = {
        currentAge: 45,
        lifeExpectancy: 85,
        currentSavings: 500000,
        currentSuper: 800000,
        annualIncome: 120000,
        annualExpenses: 70000,
        expectedReturn: 7.0,
        inflationRate: 2.5,
        planningAs: 'single',
        ageBandsEnabled: false // Flat spending for simplicity
      };

      const decision = decisionFromState(state, auRules);

      if (decision.dwz?.isViable && decision.dwz?.path?.length > 0) {
        // Find retirement point
        const retirementAge = decision.dwz.earliestViableAge || 60;
        const retirementIndex = decision.dwz.path.findIndex(p => p.age >= retirementAge);
        
        if (retirementIndex > 0) {
          // After retirement, wealth should generally decline (allowing for some growth in early years)
          const postRetirementPath = decision.dwz.path.slice(retirementIndex);
          
          // Check that wealth eventually declines
          const midPoint = postRetirementPath[Math.floor(postRetirementPath.length / 2)];
          const endPoint = postRetirementPath[postRetirementPath.length - 1];
          
          expect(endPoint.total).toBeLessThan(midPoint.total);
        }
      }
    });
  });
});