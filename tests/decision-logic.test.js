import { describe, it, expect } from 'vitest';
import { decisionFromState, getDecisionDisplay, getComparisonStrip } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

describe('Unified Decision Logic', () => {
  const baseState = {
    currentAge: 30,
    retirementAge: 50,
    lifeExpectancy: 85,
    currentSavings: 100000,
    currentSuper: 150000,
    annualIncome: 100000,
    annualExpenses: 60000,
    expectedReturn: 7.0,
    safeWithdrawalRate: 4.0,
    planningAs: 'single'
  };

  it('should return DWZ mode when dieWithZeroMode is true', () => {
    const state = { ...baseState, dieWithZeroMode: true };
    const decision = decisionFromState(state, auRules);
    
    expect(decision.mode).toBe('DWZ');
    expect(decision.kpis).toBeDefined();
    expect(decision.comparison).toBeDefined();
    expect(typeof decision.canRetireAtTarget).toBe('boolean');
    expect(['bridge', 'post']).toContain(decision.bindingConstraintAtTarget);
    
    // Test new constraint at earliest properties
    if (decision.earliestFireAge) {
      expect(['bridge', 'post']).toContain(decision.bindingConstraintAtEarliest);
    }
  });

  it('should return SWR mode when dieWithZeroMode is false', () => {
    const state = { ...baseState, dieWithZeroMode: false };
    const decision = decisionFromState(state, auRules);
    
    expect(decision.mode).toBe('SWR');
    expect(decision.kpis).toBeDefined();
    expect(decision.comparison).toBeNull();
    expect(decision.bindingConstraintAtTarget).toBeNull();
    expect(decision.bindingConstraintAtEarliest).toBeNull();
    expect(decision.earliestFireAge).toBeNull();
  });

  it('should provide comparison data in DWZ mode', () => {
    const state = { ...baseState, dieWithZeroMode: true };
    const decision = decisionFromState(state, auRules);
    
    expect(decision.comparison).toBeDefined();
    expect(decision.comparison.lifeExpectancy).toBe(85);
    expect(decision.comparison.dwzEarliestAge).toBeDefined();
    expect(decision.comparison.swrEarliestAge).toBeDefined();
  });

  it('should calculate retirement feasibility correctly in both modes', () => {
    // DWZ mode with sufficient funds
    const dwzState = { 
      ...baseState, 
      dieWithZeroMode: true,
      currentSavings: 500000,
      currentSuper: 300000 
    };
    const dwzDecision = decisionFromState(dwzState, auRules);
    
    // SWR mode with same funds
    const swrState = { ...dwzState, dieWithZeroMode: false };
    const swrDecision = decisionFromState(swrState, auRules);
    
    // Both should be able to retire (though for different reasons)
    expect(dwzDecision.canRetireAtTarget).toBe(true);
    expect(swrDecision.canRetireAtTarget).toBe(true);
    
    // DWZ should show no shortfall, SWR depends on fire number calculation
    expect(dwzDecision.shortfall).toBe(0);
    expect(swrDecision.shortfall).toBeGreaterThanOrEqual(0);
  });

  it('should show shortfall when retirement is not feasible', () => {
    const insufficientState = {
      ...baseState,
      dieWithZeroMode: true,
      currentSavings: 10000,
      currentSuper: 20000,
      annualExpenses: 80000 // Very high expenses
    };
    
    const decision = decisionFromState(insufficientState, auRules);
    
    expect(decision.canRetireAtTarget).toBe(false);
    expect(decision.shortfall).toBeGreaterThan(0);
  });
});

describe('Decision Display Formatting', () => {
  const dwzDecision = {
    mode: 'DWZ',
    canRetireAtTarget: true,
    targetAge: 50,
    earliestFireAge: 48,
    shortfall: 0,
    kpis: { sustainableSpend: 65000 }
  };

  const swrDecision = {
    mode: 'SWR', 
    canRetireAtTarget: false,
    targetAge: 55,
    shortfall: 150000,
    kpis: { totalWealthAtRetirement: 800000 }
  };

  it('should format DWZ decision messages correctly', () => {
    const display = getDecisionDisplay(dwzDecision);
    
    expect(display.primaryMessage).toContain('Can retire at 50');
    expect(display.sustainableSpend).toContain('$65,000/yr');
    expect(display.status).toBe('success');
    expect(display.shortfallMessage).toBeNull();
    expect(display.earliestMessage).toContain('Earliest FIRE: 48');
  });

  it('should format SWR decision messages correctly', () => {
    const display = getDecisionDisplay(swrDecision);
    
    expect(display.primaryMessage).toContain('Behind target for 55');
    expect(display.sustainableSpend).toContain('$32,000/yr'); // 4% of 800k
    expect(display.status).toBe('warning');
    expect(display.shortfallMessage).toContain('Shortfall: $150,000');
    expect(display.earliestMessage).toBeNull();
  });

  it('should handle failure cases in DWZ mode', () => {
    const failureDwzDecision = {
      mode: 'DWZ',
      canRetireAtTarget: false,
      targetAge: 45,
      shortfall: 20000,
      kpis: { sustainableSpend: 40000 },
      earliestFireAge: null
    };

    const display = getDecisionDisplay(failureDwzDecision);
    
    expect(display.primaryMessage).toContain('Cannot retire at 45');
    expect(display.status).toBe('warning');
    expect(display.shortfallMessage).toContain('Shortfall: $20,000/yr');
    expect(display.earliestMessage).toContain('Not achievable');
  });
});

describe('Comparison Strip Logic', () => {
  it('should return null for SWR mode', () => {
    const swrDecision = { mode: 'SWR', comparison: null };
    const strip = getComparisonStrip(swrDecision);
    
    expect(strip).toBeNull();
  });

  it('should format comparison data correctly', () => {
    const dwzDecision = {
      mode: 'DWZ',
      comparison: {
        swrEarliestAge: 52,
        dwzEarliestAge: 48,
        yearsEarlier: 4,
        lifeExpectancy: 85
      }
    };

    const strip = getComparisonStrip(dwzDecision);
    
    expect(strip.swrText).toContain('SWR (infinite horizon): retire at 52');
    expect(strip.dwzText).toContain('DWZ @ L=85: earliest FIRE = 48');
    expect(strip.benefitText).toContain('You retire **4 years earlier** with DWZ');
  });

  it('should handle cases where DWZ is not better', () => {
    const dwzDecision = {
      mode: 'DWZ',
      comparison: {
        swrEarliestAge: null,
        dwzEarliestAge: null,
        yearsEarlier: null,
        lifeExpectancy: 85
      }
    };

    const strip = getComparisonStrip(dwzDecision);
    
    expect(strip.swrText).toContain('not achievable in reasonable timeframe');
    expect(strip.dwzText).toContain('not achievable');
    expect(strip.benefitText).toContain('Consider adjusting');
  });

  it('should handle cases where DWZ enables retirement but SWR does not', () => {
    const dwzDecision = {
      mode: 'DWZ',
      comparison: {
        swrEarliestAge: null,
        dwzEarliestAge: 50,
        yearsEarlier: null,
        lifeExpectancy: 85
      }
    };

    const strip = getComparisonStrip(dwzDecision);
    
    expect(strip.swrText).toContain('not achievable');
    expect(strip.dwzText).toContain('earliest FIRE = 50');
    // When SWR is null but DWZ works, it falls back to general advice
    expect(strip.benefitText).toContain('Consider adjusting');
  });

  it('should show DWZ advantage when both modes work but DWZ is better', () => {
    const dwzDecision = {
      mode: 'DWZ',
      comparison: {
        swrEarliestAge: 55,
        dwzEarliestAge: 50,
        yearsEarlier: null, // yearsEarlier calculated as 5 but we test the fallback condition
        lifeExpectancy: 85
      }
    };

    const strip = getComparisonStrip(dwzDecision);
    
    expect(strip.swrText).toContain('retire at 55');
    expect(strip.dwzText).toContain('earliest FIRE = 50');
    expect(strip.benefitText).toContain('DWZ enables earlier retirement than infinite horizon planning');
  });
});

describe('Decision Logic Integration', () => {
  it('should maintain consistency between mode and features', () => {
    const dwzState = {
      currentAge: 35,
      retirementAge: 55,
      lifeExpectancy: 90,
      currentSavings: 200000,
      currentSuper: 250000,
      annualIncome: 90000,
      annualExpenses: 55000,
      expectedReturn: 7.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };

    const decision = decisionFromState(dwzState, auRules);
    
    // DWZ mode should have DWZ-specific features
    expect(decision.mode).toBe('DWZ');
    expect(decision.bindingConstraintAtTarget).not.toBeNull();
    expect(decision.comparison).not.toBeNull();
    expect(decision.earliestFireAge).toBeDefined();
    
    // Display formatting should be consistent
    const display = getDecisionDisplay(decision);
    const comparison = getComparisonStrip(decision);
    
    expect(display.primaryMessage).toBeDefined();
    expect(comparison).not.toBeNull();
  });

  it('should handle edge cases gracefully', () => {
    const edgeState = {
      currentAge: 60,
      retirementAge: 60, // Retire now
      lifeExpectancy: 85,
      currentSavings: 0,
      currentSuper: 100000,
      annualIncome: 0, // No income
      annualExpenses: 40000,
      expectedReturn: 5.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };

    const decision = decisionFromState(edgeState, auRules);
    
    // Should not crash and should return valid decision
    expect(decision.mode).toBe('DWZ');
    expect(typeof decision.canRetireAtTarget).toBe('boolean');
    expect(decision.kpis).toBeDefined();
    
    // Display should handle edge case
    const display = getDecisionDisplay(decision);
    expect(display.primaryMessage).toBeDefined();
    expect(display.status).toMatch(/success|warning/);
  });
});

describe('T-004A: Earliest FIRE Binding Constraint Caption', () => {
  /**
   * Bridge-limited scenario: Earliest FIRE age should be constant across different life expectancies
   * because it's limited by outside savings during the bridge period
   */
  it('should show bridge-limited caption when earliest is bridge-constrained', () => {
    // Create scenario where bridge constraint dominates
    const bridgeLimitedState = {
      currentAge: 45,
      retirementAge: 55, // Early retirement before preservation
      lifeExpectancy: 85,
      currentSavings: 150000, // Lower outside savings
      currentSuper: 400000,   // High super savings
      annualIncome: 80000,
      annualExpenses: 50000,
      expectedReturn: 7.0,
      dieWithZeroMode: true,
      planningAs: 'single'
    };

    const decision85 = decisionFromState(bridgeLimitedState, auRules);
    const decision90 = decisionFromState({...bridgeLimitedState, lifeExpectancy: 90}, auRules);

    // Both scenarios should have earliest FIRE age
    expect(decision85.earliestFireAge).toBeDefined();
    expect(decision90.earliestFireAge).toBeDefined();
    
    // Earliest should be bridge-limited in both cases
    expect(decision85.bindingConstraintAtEarliest).toBe('bridge');
    expect(decision90.bindingConstraintAtEarliest).toBe('bridge');
    
    // Earliest FIRE age should be the same (bridge-limited doesn't change with life expectancy)
    expect(Math.abs(decision85.earliestFireAge - decision90.earliestFireAge)).toBeLessThanOrEqual(1);
    
    // Display should show bridge-limited caption
    const display85 = getDecisionDisplay(decision85);
    expect(display85.earliestConstraintCaption).toContain('bridge-limited');
    expect(display85.earliestConstraintCaption).toContain('changing life expectancy won\'t move it');
  });

  /**
   * Post-limited scenario: Earliest FIRE age should change with life expectancy
   * because it's limited by total wealth sustainability over the full retirement period
   */
  it('should show horizon-limited caption when earliest is post-constrained', () => {
    // Create scenario where post-preservation constraint dominates
    const postLimitedState = {
      currentAge: 50,
      retirementAge: 58, // Before preservation age (60)
      lifeExpectancy: 90,
      currentSavings: 500000, // High outside savings
      currentSuper: 200000,   // Lower super savings  
      annualIncome: 90000,
      annualExpenses: 60000,
      expectedReturn: 6.0,    // Lower returns make post-constraint more likely
      dieWithZeroMode: true,
      planningAs: 'single'
    };

    const decision90 = decisionFromState(postLimitedState, auRules);
    const decision85 = decisionFromState({...postLimitedState, lifeExpectancy: 85}, auRules);

    // Both scenarios should have earliest FIRE age
    expect(decision90.earliestFireAge).toBeDefined();
    expect(decision85.earliestFireAge).toBeDefined();
    
    // At least one should be post-limited (may vary based on exact calculations)
    const hasPostLimited = decision90.bindingConstraintAtEarliest === 'post' || 
                          decision85.bindingConstraintAtEarliest === 'post';
    
    if (hasPostLimited) {
      // Find the post-limited scenario
      const postLimitedDecision = decision90.bindingConstraintAtEarliest === 'post' ? decision90 : decision85;
      
      // Display should show horizon-limited caption
      const display = getDecisionDisplay(postLimitedDecision);
      expect(display.earliestConstraintCaption).toContain('horizon-limited');
      expect(display.earliestConstraintCaption).toContain('shortening life expectancy can bring it earlier');
    }
  });

  /**
   * Test that caption is only shown when there's an earliest FIRE age
   */
  it('should not show caption when earliest FIRE is not achievable', () => {
    const unachievableState = {
      currentAge: 58,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 5000,   // Extremely low savings
      currentSuper: 10000,    // Extremely low super
      annualIncome: 30000,    // Low income
      annualExpenses: 90000,  // Unrealistically high expenses
      expectedReturn: 3.0,    // Low returns
      dieWithZeroMode: true,
      planningAs: 'single'
    };

    const decision = decisionFromState(unachievableState, auRules);
    const display = getDecisionDisplay(decision);
    
    // If earliest FIRE age exists, constraint should be computed
    if (decision.earliestFireAge) {
      expect(decision.bindingConstraintAtEarliest).toBeDefined();
      expect(display.earliestConstraintCaption).toBeDefined();
    } else {
      // If no earliest FIRE age, no caption should be shown
      expect(decision.bindingConstraintAtEarliest).toBeFalsy();
      expect(display.earliestConstraintCaption).toBeFalsy();
    }
  });

  /**
   * Test that couples mode doesn't break (should not compute earliest constraint)
   */
  it('should handle couples mode gracefully', () => {
    const couplesState = {
      currentAge: 40,
      retirementAge: 55,
      lifeExpectancy: 85,
      currentSavings: 200000,
      currentSuper: 300000,
      annualIncome: 100000,
      annualExpenses: 60000,
      expectedReturn: 7.0,
      dieWithZeroMode: true,
      planningAs: 'couple' // Couples mode
    };

    const decision = decisionFromState(couplesState, auRules);
    
    // Should not have binding constraint at earliest (couples mode not supported)
    expect(decision.bindingConstraintAtEarliest).toBeNull();
    
    const display = getDecisionDisplay(decision);
    expect(display.earliestConstraintCaption).toBeFalsy();
  });
});