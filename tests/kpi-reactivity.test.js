import { describe, it, expect } from 'vitest';
import { kpisFromState } from '../src/selectors/kpis.js';
import auRules from '../src/data/au_rules.json';

describe('KPI Reactivity', () => {
  it('should update all KPIs when lifeExpectancy changes', () => {
    // Fixed baseline state for consistent testing
    const baseState = {
      currentAge: 30,
      retirementAge: 50,
      currentSavings: 100000,
      currentSuper: 150000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      investmentFees: 0.5,
      safeWithdrawalRate: 4.0,
      inflationRate: 2.5,
      adjustForInflation: true,
      dieWithZeroMode: true,
      planningAs: 'single',
      hasPrivateHealth: false,
      hecsDebt: 0,
      additionalSuperContributions: 10000
    };

    // Test Case 1: Life expectancy 85 years
    const state85 = { ...baseState, lifeExpectancy: 85 };
    const kpis85 = kpisFromState(state85, auRules);

    // Test Case 2: Life expectancy 95 years  
    const state95 = { ...baseState, lifeExpectancy: 95 };
    const kpis95 = kpisFromState(state95, auRules);
    

    // === Core Invariants (should be same regardless of life expectancy) ===
    expect(kpis85.tax).toBeCloseTo(kpis95.tax, 2);
    expect(kpis85.afterTaxIncome).toBeCloseTo(kpis95.afterTaxIncome, 2);
    expect(kpis85.fireNumber).toBeCloseTo(kpis95.fireNumber, 2);
    expect(kpis85.totalWealthAtRetirement).toBeCloseTo(kpis95.totalWealthAtRetirement, 2);

    // === Life-Expectancy Dependent KPIs (should change) ===
    
    // Check which constraint is binding - this determines if life expectancy affects spend
    if (kpis85.bindingConstraint === 'bridge' && kpis95.bindingConstraint === 'bridge') {
      // When bridge-bound, sustainable spend should be identical regardless of life expectancy
      expect(kpis85.sustainableSpend).toBeCloseTo(kpis95.sustainableSpend, 2);
      expect(kpis85.bindingConstraint).toBe('bridge');
      expect(kpis95.bindingConstraint).toBe('bridge');
    } else {
      // When post-preservation bound, sustainable spend should be HIGHER for shorter life expectancy  
      expect(kpis85.sustainableSpend).toBeGreaterThan(kpis95.sustainableSpend);
      
      // Difference should be meaningful (at least $5k/year difference)
      const spendDifference = kpis85.sustainableSpend - kpis95.sustainableSpend;
      expect(spendDifference).toBeGreaterThan(5000);
    }
    
    // Earliest FIRE age should be YOUNGER for shorter life expectancy
    if (kpis85.earliestFireAge !== null && kpis95.earliestFireAge !== null) {
      expect(kpis85.earliestFireAge).toBeLessThanOrEqual(kpis95.earliestFireAge);
    }
    
    // Status vs Plan should potentially change based on sustainable spend vs expenses
    // (this is a derived metric that depends on the sustainable spend calculation)
    expect(typeof kpis85.statusVsPlan).toBe('string');
    expect(typeof kpis95.statusVsPlan).toBe('string');
    
    // Bridge assessment should be consistent (depends on retirement age, not life expectancy)
    expect(kpis85.bridgeAssessment.needsBridge).toBe(kpis95.bridgeAssessment.needsBridge);
  });

  it('should handle edge cases in life expectancy changes', () => {
    const baseState = {
      currentAge: 40,
      retirementAge: 65,  // No bridge period needed - should be post-bound
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 120000,
      annualExpenses: 80000,
      expectedReturn: 6.0,
      safeWithdrawalRate: 3.5,
      dieWithZeroMode: true,
      planningAs: 'single',
      lifeExpectancy: 90
    };

    // Test minimum life expectancy (should still compute)
    const stateMin = { ...baseState, lifeExpectancy: 75 };
    const kpisMin = kpisFromState(stateMin, auRules);
    expect(kpisMin.sustainableSpend).toBeGreaterThan(0);
    expect(typeof kpisMin.statusVsPlan).toBe('string');

    // Test maximum life expectancy (should still compute)  
    const stateMax = { ...baseState, lifeExpectancy: 100 };
    const kpisMax = kpisFromState(stateMax, auRules);
    expect(kpisMax.sustainableSpend).toBeGreaterThan(0);
    expect(typeof kpisMax.statusVsPlan).toBe('string');

    // Sustainable spend should decrease as life expectancy increases (if post-bound)
    // If bridge-bound, they'll be equal since no bridge period exists at age 65
    if (kpisMin.bindingConstraint === 'post' && kpisMax.bindingConstraint === 'post') {
      expect(kpisMin.sustainableSpend).toBeGreaterThan(kpisMax.sustainableSpend);
    } else {
      // Should still be positive and computable
      expect(kpisMin.sustainableSpend).toBeGreaterThan(0);
      expect(kpisMax.sustainableSpend).toBeGreaterThan(0);
    }
  });

  it('should maintain KPI consistency across multiple life expectancy changes', () => {
    const baseState = {
      currentAge: 35,
      retirementAge: 55,
      currentSavings: 150000,
      currentSuper: 200000,
      annualIncome: 90000,
      annualExpenses: 55000,
      dieWithZeroMode: false,  // Traditional FIRE mode
      planningAs: 'single',
      expectedReturn: 8.0,
      safeWithdrawalRate: 4.0
    };

    // Test sequence: 85 -> 90 -> 95 -> 90 -> 85
    const expectations = [85, 90, 95, 90, 85];
    const kpiResults = [];

    for (const lifeExp of expectations) {
      const state = { ...baseState, lifeExpectancy: lifeExp };
      const kpis = kpisFromState(state, auRules);
      kpiResults.push(kpis);
    }

    // First and last should be identical (both 85)
    expect(kpiResults[0].sustainableSpend).toBeCloseTo(kpiResults[4].sustainableSpend, 2);
    expect(kpiResults[0].statusVsPlan).toBe(kpiResults[4].statusVsPlan);

    // Second and fourth should be identical (both 90)  
    expect(kpiResults[1].sustainableSpend).toBeCloseTo(kpiResults[3].sustainableSpend, 2);
    expect(kpiResults[1].statusVsPlan).toBe(kpiResults[3].statusVsPlan);

    // Middle result (95) should have lowest sustainable spend
    const sustainableSpends = kpiResults.map(k => k.sustainableSpend);
    expect(Math.min(...sustainableSpends)).toBe(kpiResults[2].sustainableSpend);
  });
});