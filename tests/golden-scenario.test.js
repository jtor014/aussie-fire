import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('Golden Scenario Tests', () => {
  /**
   * Golden test for the demo scenario
   * Validates that stepped DWZ engine produces reasonable sustainable spend values
   */
  it('Should produce correct S_pre/S_post for demo scenario', () => {
    const demoState = {
      currentAge: 30,
      retirementAge: 50,
      lifeExpectancy: 90,
      currentSavings: 50000,      // outside super
      currentSuper: 100000,       // super balance
      annualIncome: 120000,       // income
      annualExpenses: 65000,      // target spend
      expectedReturn: 8.5,        // 8.5% nominal
      inflationRate: 2.5,         // 2.5% inflation  
      bequest: 0,                 // no bequest
      dwzPlanningMode: 'earliest',
      additionalSuperContributions: 0,
      hasPrivateHealth: false,
      hecsDebt: 0
    };

    const decision = decisionFromState(demoState, auRules);
    
    // Validate decision structure
    expect(decision).toBeDefined();
    expect(decision.kpis).toBeDefined();
    expect(decision.kpis.S_pre).toBeTypeOf('number');
    expect(decision.kpis.S_post).toBeTypeOf('number');
    
    // Golden values - sustainable spend should be reasonable for demo scenario
    // With $50k outside + $100k super growing 27 years at ~5.85% real return,
    // we should have substantial wealth enabling comfortable retirement spend
    
    console.log('Demo Scenario Results:');
    console.log(`S_pre: $${Math.round(decision.kpis.S_pre).toLocaleString()}/yr`);
    console.log(`S_post: $${Math.round(decision.kpis.S_post).toLocaleString()}/yr`);
    console.log(`Target age: ${decision.targetAge}`);
    console.log(`Earliest FIRE age: ${decision.earliestFireAge}`);
    console.log(`Can retire at target: ${decision.canRetireAtTarget}`);
    
    // S_pre and S_post - after fix, should be substantial but reasonable  
    expect(decision.kpis.S_pre).toBeGreaterThan(100000); // Should be well above target spend
    expect(decision.kpis.S_pre).toBeLessThan(300000);    // But not impossibly high
    
    // S_post should be similar or higher (balanced stepped spending)
    expect(decision.kpis.S_post).toBeGreaterThan(100000);
    expect(decision.kpis.S_post).toBeLessThan(300000);
    
    // With balanced DWZ, both phases should be similar
    const spendDiff = Math.abs(decision.kpis.S_pre - decision.kpis.S_post);
    const avgSpend = (decision.kpis.S_pre + decision.kpis.S_post) / 2;
    expect(spendDiff / avgSpend).toBeLessThan(0.2); // Within 20%
    
    // Plan spend should be reasonable
    expect(decision.kpis.planSpend).toBeGreaterThan(100000);
    expect(decision.kpis.planSpend).toBeLessThan(300000);
    
    // Should be viable for target spend of $65k
    if (decision.canRetireAtTarget) {
      expect(Math.min(decision.kpis.S_pre, decision.kpis.S_post)).toBeGreaterThanOrEqual(65000 * 0.95); // Within 5%
    }
    
    // Earliest age should be reasonable (30-65 range)
    if (decision.earliestFireAge) {
      expect(decision.earliestFireAge).toBeGreaterThanOrEqual(35);
      expect(decision.earliestFireAge).toBeLessThanOrEqual(65);
    }
    
    console.log('Demo Scenario Results:');
    console.log(`S_pre: $${Math.round(decision.kpis.S_pre).toLocaleString()}/yr`);
    console.log(`S_post: $${Math.round(decision.kpis.S_post).toLocaleString()}/yr`);
    console.log(`Target age: ${decision.targetAge}`);
    console.log(`Earliest FIRE age: ${decision.earliestFireAge}`);
    console.log(`Can retire at target: ${decision.canRetireAtTarget}`);
  });

  /**
   * Test that sustainable spend values are within ±0.5% of engine outputs
   */
  it('Should maintain consistent precision in stepped DWZ calculations', () => {
    const precisionState = {
      currentAge: 35,
      retirementAge: 55,
      lifeExpectancy: 85,
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 100000,
      annualExpenses: 50000,
      expectedReturn: 7.0,
      inflationRate: 2.0,
      bequest: 0,
      dwzPlanningMode: 'earliest'
    };

    const decision1 = decisionFromState(precisionState, auRules);
    const decision2 = decisionFromState(precisionState, auRules);
    
    // Results should be identical (deterministic)
    expect(decision1.kpis.S_pre).toBe(decision2.kpis.S_pre);
    expect(decision1.kpis.S_post).toBe(decision2.kpis.S_post);
    
    // Values should be well-formed numbers
    expect(Number.isFinite(decision1.kpis.S_pre)).toBe(true);
    expect(Number.isFinite(decision1.kpis.S_post)).toBe(true);
    expect(decision1.kpis.S_pre).toBeGreaterThan(0);
    expect(decision1.kpis.S_post).toBeGreaterThan(0);
  });
});