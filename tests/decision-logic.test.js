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
    expect(['bridge', 'post']).toContain(decision.bindingConstraint);
  });

  it('should return SWR mode when dieWithZeroMode is false', () => {
    const state = { ...baseState, dieWithZeroMode: false };
    const decision = decisionFromState(state, auRules);
    
    expect(decision.mode).toBe('SWR');
    expect(decision.kpis).toBeDefined();
    expect(decision.comparison).toBeNull();
    expect(decision.bindingConstraint).toBeNull();
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
    expect(decision.bindingConstraint).not.toBeNull();
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