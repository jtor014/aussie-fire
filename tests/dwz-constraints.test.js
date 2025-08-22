import { describe, it, expect } from 'vitest';
import { kpisFromState } from '../src/selectors/kpis.js';
import auRules from '../src/data/au_rules.json';

describe('DWZ Binding Constraints', () => {
  it('should identify bridge constraint when retirement age < preservation age', () => {
    // Bridge-bound scenario: retire at 50, preservation age is 60
    const bridgeBoundState = {
      currentAge: 30,
      retirementAge: 50,  // 10 years before preservation age
      lifeExpectancy: 85,
      currentSavings: 100000,
      currentSuper: 150000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };
    
    const kpis = kpisFromState(bridgeBoundState, auRules);
    
    // Should be bridge-bound
    expect(kpis.bindingConstraint).toBe('bridge');
    
    // Sustainable spend should be determined by bridge period constraint
    expect(kpis.sustainableSpend).toBeGreaterThan(0);
    
    // Now test that changing life expectancy doesn't affect sustainable spend when bridge-bound
    const longerLifeState = { ...bridgeBoundState, lifeExpectancy: 95 };
    const longerLifeKpis = kpisFromState(longerLifeState, auRules);
    
    expect(longerLifeKpis.bindingConstraint).toBe('bridge');
    // Spend should be nearly identical (bridge constraint dominates)
    expect(Math.abs(kpis.sustainableSpend - longerLifeKpis.sustainableSpend)).toBeLessThan(100);
  });

  it('should identify post constraint when retirement age >= preservation age', () => {
    // Post-bound scenario: retire at 65, preservation age is 60
    const postBoundState = {
      currentAge: 40,
      retirementAge: 65,  // After preservation age
      lifeExpectancy: 85,
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 120000,
      annualExpenses: 80000,
      expectedReturn: 6.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };
    
    const kpis = kpisFromState(postBoundState, auRules);
    
    // Should be post-bound (no bridge period)
    expect(kpis.bindingConstraint).toBe('post');
    
    // Sustainable spend should be determined by post-preservation horizon
    expect(kpis.sustainableSpend).toBeGreaterThan(0);
    
    // Test that changing life expectancy DOES affect sustainable spend when post-bound
    const longerLifeState = { ...postBoundState, lifeExpectancy: 95 };
    const longerLifeKpis = kpisFromState(longerLifeState, auRules);
    
    expect(longerLifeKpis.bindingConstraint).toBe('post');
    // Spend should be meaningfully different (life expectancy matters)
    expect(kpis.sustainableSpend - longerLifeKpis.sustainableSpend).toBeGreaterThan(1000);
  });

  it('should handle marginal cases near preservation age', () => {
    // Edge case: retire exactly at preservation age
    const marginalState = {
      currentAge: 35,
      retirementAge: 60,  // Exactly at preservation age
      lifeExpectancy: 90,
      currentSavings: 150000,
      currentSuper: 200000,
      annualIncome: 90000,
      annualExpenses: 55000,
      expectedReturn: 7.5,
      dieWithZeroMode: true,
      planningAs: 'single'
    };
    
    const kpis = kpisFromState(marginalState, auRules);
    
    // Should be post-bound (no bridge period when R >= P)
    expect(kpis.bindingConstraint).toBe('post');
    expect(kpis.sustainableSpend).toBeGreaterThan(0);
    
    // Just before preservation age
    const justBeforeState = { ...marginalState, retirementAge: 59 };
    const justBeforeKpis = kpisFromState(justBeforeState, auRules);
    
    // Could be either bridge or post, depending on wealth levels
    expect(['bridge', 'post']).toContain(justBeforeKpis.bindingConstraint);
    expect(justBeforeKpis.sustainableSpend).toBeGreaterThan(0);
  });

  it('should return null constraint when not in DWZ mode', () => {
    const traditionalFIREState = {
      currentAge: 30,
      retirementAge: 50,
      lifeExpectancy: 85,
      currentSavings: 100000,
      currentSuper: 150000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      dieWithZeroMode: false,  // Traditional FIRE mode
      planningAs: 'single'
    };
    
    const kpis = kpisFromState(traditionalFIREState, auRules);
    
    // Should have no binding constraint in traditional FIRE mode
    expect(kpis.bindingConstraint).toBeNull();
    
    // But should still have a sustainable spend based on 4% rule
    expect(kpis.sustainableSpend).toBeGreaterThan(0);
  });

  it('should return null constraint for couples mode', () => {
    const coupleState = {
      currentAge: 35,
      retirementAge: 55,
      lifeExpectancy: 88,
      currentSavings: 150000,
      currentSuper: 200000,
      annualIncome: 110000,
      annualExpenses: 70000,
      expectedReturn: 7.0,
      dieWithZeroMode: true,
      planningAs: 'couple'  // Couples mode
    };
    
    const kpis = kpisFromState(coupleState, auRules);
    
    // Constraint analysis only applies to single mode for now
    expect(kpis.bindingConstraint).toBeNull();
    expect(kpis.sustainableSpend).toBeGreaterThan(0);
  });

  it('should demonstrate constraint switching as wealth changes', () => {
    // Scenario where increasing wealth might switch from bridge to post constraint
    const baseState = {
      currentAge: 30,
      retirementAge: 55,  // 5 years before preservation age
      lifeExpectancy: 90,
      currentSavings: 50000,   // Lower starting wealth
      currentSuper: 80000,
      annualIncome: 80000,
      annualExpenses: 50000,
      expectedReturn: 8.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };
    
    const lowWealthKpis = kpisFromState(baseState, auRules);
    
    // With higher wealth, constraint might switch
    const highWealthState = {
      ...baseState,
      currentSavings: 300000,  // Much higher starting wealth
      currentSuper: 400000
    };
    
    const highWealthKpis = kpisFromState(highWealthState, auRules);
    
    // Both should have valid constraints
    expect(['bridge', 'post']).toContain(lowWealthKpis.bindingConstraint);
    expect(['bridge', 'post']).toContain(highWealthKpis.bindingConstraint);
    
    // Higher wealth should enable higher sustainable spend
    expect(highWealthKpis.sustainableSpend).toBeGreaterThan(lowWealthKpis.sustainableSpend);
  });
});