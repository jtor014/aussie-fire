import { describe, it, expect } from 'vitest';
import { decisionFromState } from '../src/selectors/decision.js';
import { depletionFromDecision } from '../src/selectors/depletion.js';
import { solveSustainableSpending } from '../src/core/dwz_age_band.js';
import auRules from '../src/data/au_rules.json';

/**
 * T-016 Bequest Target Tests
 * 
 * Validates that bequest targets are correctly handled at life expectancy
 * in the DWZ-only age-band system.
 */
describe('Bequest Target at Life Expectancy', () => {
  const baseState = {
    currentAge: 45,
    retirementAge: 60,
    lifeExpectancy: 85,
    currentSavings: 500000,
    currentSuper: 400000,
    annualIncome: 120000,
    annualExpenses: 70000,
    expectedReturn: 7.0,
    investmentFees: 0.5,
    inflationRate: 2.5,
    adjustForInflation: true,
    dieWithZeroMode: true,
    planningAs: 'single'
  };

  it('should handle zero bequest target correctly', () => {
    const noBeqeustState = { ...baseState, bequest: 0 };
    
    const decision = decisionFromState(noBeqeustState, auRules);
    const depletionData = depletionFromDecision(noBeqeustState, decision, auRules);
    
    expect(decision).toBeDefined();
    expect(decision.bequest).toBe(0);
    
    // Final wealth should be close to zero (die-with-zero)
    const finalYear = depletionData.path[depletionData.path.length - 1];
    expect(finalYear.age).toBe(baseState.lifeExpectancy);
    expect(finalYear.total).toBeLessThan(10000); // Should be nearly depleted
  });

  it('should preserve bequest target amount at life expectancy', () => {
    const bequestAmount = 200000;
    const bequestState = { ...baseState, bequest: bequestAmount };
    
    const decision = decisionFromState(bequestState, auRules);
    const depletionData = depletionFromDecision(bequestState, decision, auRules);
    
    expect(decision.bequest).toBe(bequestAmount);
    
    // Final wealth should approximately equal the bequest target
    const finalYear = depletionData.path[depletionData.path.length - 1];
    expect(finalYear.age).toBe(baseState.lifeExpectancy);
    expect(finalYear.total).toBeGreaterThan(bequestAmount * 0.9); // Within 10% tolerance
    expect(finalYear.total).toBeLessThan(bequestAmount * 1.5); // Not excessively high
  });

  it('should show bequest annotation in chart data', () => {
    const bequestAmount = 150000;
    const bequestState = { ...baseState, bequest: bequestAmount };
    
    const decision = decisionFromState(bequestState, auRules);
    const depletionData = depletionFromDecision(bequestState, decision, auRules);
    
    // Should have bequest annotation
    const bequestAnnotation = depletionData.annotations.find(a => 
      a.label && a.label.includes('Bequest')
    );
    
    expect(bequestAnnotation).toBeDefined();
    expect(bequestAnnotation.x).toBe(baseState.lifeExpectancy);
    expect(bequestAnnotation.y).toBe(bequestAmount);
    expect(bequestAnnotation.label).toContain('$150,000');
  });

  it('should reduce sustainable spending when bequest target is higher', () => {
    const lowBequestState = { ...baseState, bequest: 50000 };
    const highBequestState = { ...baseState, bequest: 300000 };
    
    const lowBequestDecision = decisionFromState(lowBequestState, auRules);
    const highBequestDecision = decisionFromState(highBequestState, auRules);
    
    // Higher bequest should result in lower sustainable spending
    const lowBequestSpend = lowBequestDecision.kpis.sustainableAnnual;
    const highBequestSpend = highBequestDecision.kpis.sustainableAnnual;
    
    expect(lowBequestSpend).toBeGreaterThan(highBequestSpend);
  });

  it('should delay earliest retirement age when bequest target is high', () => {
    const noBequestState = { ...baseState, bequest: 0 };
    const highBequestState = { ...baseState, bequest: 400000 };
    
    const noBequestDecision = decisionFromState(noBequestState, auRules);
    const highBequestDecision = decisionFromState(highBequestState, auRules);
    
    // High bequest requirement should delay earliest retirement
    if (noBequestDecision.earliestFireAge && highBequestDecision.earliestFireAge) {
      expect(highBequestDecision.earliestFireAge).toBeGreaterThanOrEqual(noBequestDecision.earliestFireAge);
    }
  });

  it('should handle bequest targets with age-band spending correctly', () => {
    const bequestAmount = 180000;
    const bequestState = { ...baseState, bequest: bequestAmount };
    
    const decision = decisionFromState(bequestState, auRules);
    const depletionData = depletionFromDecision(bequestState, decision, auRules);
    
    // Should still have age-band spending phases
    const goGoYears = depletionData.path.filter(p => p.phase === 'go-go');
    const slowGoYears = depletionData.path.filter(p => p.phase === 'slow-go');
    const noGoYears = depletionData.path.filter(p => p.phase === 'no-go');
    
    expect(goGoYears.length).toBeGreaterThan(0);
    expect(slowGoYears.length).toBeGreaterThan(0);
    expect(noGoYears.length).toBeGreaterThan(0);
    
    // Different phases should have different spending levels
    const avgGoGoSpend = goGoYears.reduce((sum, y) => sum + y.spend, 0) / goGoYears.length;
    const avgNoGoSpend = noGoYears.reduce((sum, y) => sum + y.spend, 0) / noGoYears.length;
    expect(avgGoGoSpend).toBeGreaterThan(avgNoGoSpend);
    
    // Final year should preserve bequest
    const finalYear = depletionData.path[depletionData.path.length - 1];
    expect(finalYear.total).toBeGreaterThan(bequestAmount * 0.8);
  });

  it('should handle unrealistic bequest targets gracefully', () => {
    // Bequest target larger than total projected wealth
    const unrealisticBequestState = { 
      ...baseState, 
      bequest: 5000000,  // Unrealistically high
      currentSavings: 100000,
      currentSuper: 150000
    };
    
    const decision = decisionFromState(unrealisticBequestState, auRules);
    
    // Should still return a valid decision, even if not achievable
    expect(decision).toBeDefined();
    expect(decision.bequest).toBe(5000000);
    
    // May not be able to retire at target age
    expect(typeof decision.canRetireAtTarget).toBe('boolean');
    expect(decision.earliestFireAge === null || typeof decision.earliestFireAge === 'number').toBe(true);
  });

  it('should maintain bequest target across different life expectancies', () => {
    const bequestAmount = 120000;
    
    const shortLifeState = { ...baseState, lifeExpectancy: 78, bequest: bequestAmount };
    const longLifeState = { ...baseState, lifeExpectancy: 95, bequest: bequestAmount };
    
    const shortLifeDecision = decisionFromState(shortLifeState, auRules);
    const longLifeDecision = decisionFromState(longLifeState, auRules);
    
    expect(shortLifeDecision.bequest).toBe(bequestAmount);
    expect(longLifeDecision.bequest).toBe(bequestAmount);
    
    // Both should account for the bequest in their calculations
    const shortLifeDepletion = depletionFromDecision(shortLifeState, shortLifeDecision, auRules);
    const longLifeDepletion = depletionFromDecision(longLifeState, longLifeDecision, auRules);
    
    const shortFinalYear = shortLifeDepletion.path[shortLifeDepletion.path.length - 1];
    const longFinalYear = longLifeDepletion.path[longLifeDepletion.path.length - 1];
    
    expect(shortFinalYear.age).toBe(78);
    expect(longFinalYear.age).toBe(95);
    
    // Both should preserve approximately the bequest amount
    expect(shortFinalYear.total).toBeGreaterThan(bequestAmount * 0.7);
    expect(longFinalYear.total).toBeGreaterThan(bequestAmount * 0.7);
  });

  it('should work with bequest in couples mode', () => {
    const coupleState = {
      ...baseState,
      planningAs: 'couple',
      bequest: 250000,
      partnerB: {
        currentAge: 42,
        currentSuper: 180000,
        annualIncome: 80000
      }
    };
    
    const decision = decisionFromState(coupleState, auRules);
    
    expect(decision).toBeDefined();
    expect(decision.bequest).toBe(250000);
    
    // Should be able to handle couples mode with bequest
    expect(typeof decision.canRetireAtTarget).toBe('boolean');
    
    const depletionData = depletionFromDecision(coupleState, decision, auRules);
    expect(depletionData).toBeDefined();
    
    // Should have bequest annotation
    const bequestAnnotation = depletionData.annotations.find(a => 
      a.label && a.label.includes('Bequest')
    );
    expect(bequestAnnotation).toBeDefined();
  });
});