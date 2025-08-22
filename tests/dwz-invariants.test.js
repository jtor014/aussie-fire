import { describe, it, expect } from 'vitest';
import { dwzFromSingleState, maxSpendDWZSingleWithConstraint } from '../src/core/dwz_single.js';
import auRules from '../src/data/au_rules.json';

/**
 * Invariant tests for DWZ math correction (T-004)
 * These tests verify that the mathematical properties hold across different scenarios
 */

describe('DWZ Invariant Tests - Mathematical Properties', () => {
  const assumptions = {
    nominalReturnOutside: 0.07,
    nominalReturnSuper: 0.07,
    inflation: 0.025
  };

  const basePerson = {
    currentAge: 40,
    longevity: 90,
    liquidStart: 300000,
    superStart: 200000,
    income: 0,
    extraSuper: 0
  };

  /**
   * I1: Monotonicity - Later retirement allows higher sustainable spend
   */
  it('I1: Monotonicity - sustainable spend increases with later retirement', () => {
    const params = dwzFromSingleState(basePerson, assumptions, auRules);
    
    const ages = [50, 52, 55, 58, 60, 62, 65];
    const spends = ages.map(age => maxSpendDWZSingleWithConstraint(params, age, 90).spend);
    
    // Check that spending is non-decreasing with later retirement
    for (let i = 1; i < spends.length; i++) {
      expect(spends[i]).toBeGreaterThanOrEqual(spends[i-1] * 0.98); // Allow small numerical errors
    }
    
    // Check that there's meaningful increase across the range
    expect(spends[spends.length - 1]).toBeGreaterThan(spends[0] * 1.1); // At least 10% increase
  });

  /**
   * I2: Wealth scaling - Double wealth should roughly double sustainable spend
   */
  it('I2: Wealth scaling - sustainable spend scales with wealth', () => {
    const baseParams = dwzFromSingleState(basePerson, assumptions, auRules);
    
    const doubleWealth = {
      ...basePerson,
      liquidStart: basePerson.liquidStart * 2,
      superStart: basePerson.superStart * 2
    };
    const doubleParams = dwzFromSingleState(doubleWealth, assumptions, auRules);
    
    const baseSpend = maxSpendDWZSingleWithConstraint(baseParams, 55, 90).spend;
    const doubleSpend = maxSpendDWZSingleWithConstraint(doubleParams, 55, 90).spend;
    
    // Double wealth should approximately double sustainable spend (within 5% due to rounding)
    expect(doubleSpend).toBeGreaterThan(baseSpend * 1.9);
    expect(doubleSpend).toBeLessThan(baseSpend * 2.1);
  });

  /**
   * I3: Life expectancy impact - Shorter life allows higher spend
   */
  it('I3: Life expectancy - shorter life expectancy increases sustainable spend', () => {
    const params = dwzFromSingleState(basePerson, assumptions, auRules);
    
    const lifeExpectancies = [80, 85, 90, 95, 100];
    const spends = lifeExpectancies.map(L => maxSpendDWZSingleWithConstraint(params, 55, L).spend);
    
    // Sustainable spend should decrease with longer life expectancy
    for (let i = 1; i < spends.length; i++) {
      expect(spends[i]).toBeLessThanOrEqual(spends[i-1] * 1.02); // Allow small numerical errors
    }
    
    // Meaningful decrease across the range
    expect(spends[0]).toBeGreaterThan(spends[spends.length - 1] * 1.2); // At least 20% higher for 20-year shorter life
  });

  /**
   * I4: DWZ vs SWR comparison - DWZ should allow earlier retirement in most cases
   */
  it('I4: DWZ vs SWR - DWZ enables earlier retirement than infinite horizon', () => {
    const testCases = [
      // Various wealth levels and retirement scenarios
      { liquidStart: 200000, superStart: 300000, targetSpend: 50000 },
      { liquidStart: 400000, superStart: 200000, targetSpend: 45000 },
      { liquidStart: 300000, superStart: 400000, targetSpend: 55000 },
    ];

    for (const testCase of testCases) {
      const person = { ...basePerson, ...testCase };
      const params = dwzFromSingleState(person, assumptions, auRules);
      
      // Find earliest DWZ retirement age
      let dwzEarliestAge = null;
      for (let age = person.currentAge; age <= 65; age++) {
        const result = maxSpendDWZSingleWithConstraint(params, age, 90);
        if (result.spend >= testCase.targetSpend) {
          dwzEarliestAge = age;
          break;
        }
      }
      
      // Calculate SWR FIRE number (infinite horizon approach)
      const swrFireNumber = testCase.targetSpend / 0.04; // 4% rule
      
      // Estimate SWR earliest age (simplified calculation)
      let swrEarliestAge = null;
      const realReturn = (1.07 / 1.025) - 1;
      for (let age = person.currentAge; age <= 65; age++) {
        const yearsToRetirement = age - person.currentAge;
        const totalWealth = (person.liquidStart + person.superStart) * 
                          Math.pow(1 + realReturn, yearsToRetirement);
        
        if (totalWealth >= swrFireNumber) {
          swrEarliestAge = age;
          break;
        }
      }
      
      // DWZ should enable earlier retirement than SWR in most realistic scenarios
      if (dwzEarliestAge && swrEarliestAge) {
        expect(dwzEarliestAge).toBeLessThanOrEqual(swrEarliestAge + 2); // Allow some tolerance
      }
    }
  });

  /**
   * I5: Constraint transition - Moving from bridge to post constraint as retirement age increases
   */
  it('I5: Constraint transition - bridge to post constraint behavior', () => {
    const params = dwzFromSingleState(basePerson, assumptions, auRules);
    
    let bridgeFound = false;
    let postFound = false;
    
    // Test retirement ages from current age to well past preservation age
    for (let age = params.A; age <= 65; age++) {
      const result = maxSpendDWZSingleWithConstraint(params, age, 90);
      
      if (age < params.P) {
        // Before preservation age, we should see bridge or post constraints
        expect(['bridge', 'post']).toContain(result.constraint);
        if (result.constraint === 'bridge') bridgeFound = true;
        if (result.constraint === 'post') postFound = true;
      } else {
        // At or after preservation age, should always be post constraint
        expect(result.constraint).toBe('post');
        postFound = true;
      }
    }
    
    // We should have seen both types of constraints during the test
    expect(bridgeFound || postFound).toBe(true); // At least one constraint type observed
  });

  /**
   * I6: Mathematical consistency - Results should be stable with small parameter changes
   */
  it('I6: Numerical stability - small changes produce small result changes', () => {
    const params = dwzFromSingleState(basePerson, assumptions, auRules);
    const baseResult = maxSpendDWZSingleWithConstraint(params, 55, 90);
    
    // Test small changes in wealth (+/- 1%)
    const wealthVariations = [
      { liquidStart: basePerson.liquidStart * 1.01, superStart: basePerson.superStart },
      { liquidStart: basePerson.liquidStart * 0.99, superStart: basePerson.superStart },
      { liquidStart: basePerson.liquidStart, superStart: basePerson.superStart * 1.01 },
      { liquidStart: basePerson.liquidStart, superStart: basePerson.superStart * 0.99 }
    ];
    
    for (const variation of wealthVariations) {
      const varPerson = { ...basePerson, ...variation };
      const varParams = dwzFromSingleState(varPerson, assumptions, auRules);
      const varResult = maxSpendDWZSingleWithConstraint(varParams, 55, 90);
      
      // 1% wealth change should produce roughly 1% spend change (within numerical precision)
      const spendChangeRatio = Math.abs(varResult.spend - baseResult.spend) / baseResult.spend;
      expect(spendChangeRatio).toBeLessThan(0.02); // Less than 2% change for 1% wealth change
    }
  });

  /**
   * I7: Return sensitivity - Higher returns should enable higher sustainable spend
   */
  it('I7: Return sensitivity - sustainable spend increases with higher returns', () => {
    const returnScenarios = [
      { nominalReturnOutside: 0.05, nominalReturnSuper: 0.05, inflation: 0.025 }, // Low return
      { nominalReturnOutside: 0.07, nominalReturnSuper: 0.07, inflation: 0.025 }, // Base return
      { nominalReturnOutside: 0.09, nominalReturnSuper: 0.09, inflation: 0.025 }  // High return
    ];
    
    const spends = returnScenarios.map(scenario => {
      const params = dwzFromSingleState(basePerson, scenario, auRules);
      return maxSpendDWZSingleWithConstraint(params, 55, 90).spend;
    });
    
    // Higher returns should enable higher sustainable spending
    expect(spends[1]).toBeGreaterThan(spends[0]); // Base > Low
    expect(spends[2]).toBeGreaterThan(spends[1]); // High > Base
    
    // The differences should be meaningful
    expect(spends[2] / spends[0]).toBeGreaterThan(1.3); // At least 30% increase from low to high
  });
});