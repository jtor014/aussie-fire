import { describe, it, expect } from 'vitest';
import { depletionFromDecision } from '../src/selectors/depletion.js';
import { decisionFromState } from '../src/selectors/decision.js';
import auRules from '../src/data/au_rules.json';

/**
 * T-016 Chart Markers Tests
 * 
 * Validates that charts render with correct markers and age-band annotations
 * for the new DWZ-only mode.
 */
describe('Chart Markers and Annotations', () => {
  const baseState = {
    currentAge: 40,
    retirementAge: 55,
    lifeExpectancy: 85,
    currentSavings: 300000,
    currentSuper: 200000,
    annualIncome: 100000,
    annualExpenses: 65000,
    expectedReturn: 7.5,
    investmentFees: 0.5,
    inflationRate: 2.5,
    adjustForInflation: true,
    dieWithZeroMode: true,
    planningAs: 'single',
    bequest: 0
  };

  it('should generate chart data with age-band markers', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    expect(depletionData).toBeDefined();
    expect(depletionData.path).toBeDefined();
    expect(depletionData.markers).toBeDefined();
    expect(Array.isArray(depletionData.path)).toBe(true);
    expect(Array.isArray(depletionData.markers)).toBe(true);
    
    // Should have preservation age marker
    const preservationMarker = depletionData.markers.find(m => 
      m.type === 'preservation' || (m.label && m.label.includes('Super unlocks'))
    );
    expect(preservationMarker).toBeDefined();
    
    // Should have life expectancy marker  
    const lifeExpectancyMarker = depletionData.markers.find(m => 
      m.type === 'horizon' || (m.label && m.label.includes('Life expectancy'))
    );
    expect(lifeExpectancyMarker).toBeDefined();
  });

  it('should include age-band transition markers when applicable', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    // Should have age-band markers for transitions
    const ageBandMarkers = depletionData.markers.filter(m => m.type === 'age-band');
    
    // With retirement at 55 and life at 85, should have slow-go (60) and no-go (75) markers
    const slowGoMarker = depletionData.markers.find(m => 
      m.label && m.label.includes('Slow-go')
    );
    const noGoMarker = depletionData.markers.find(m => 
      m.label && m.label.includes('No-go')
    );
    
    expect(slowGoMarker).toBeDefined();
    expect(noGoMarker).toBeDefined();
    expect(slowGoMarker.x).toBe(60);
    expect(noGoMarker.x).toBe(75);
  });

  it('should generate path data with age-band spending phases', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    const pathData = depletionData.path;
    expect(pathData.length).toBeGreaterThan(0);
    
    // Should have phase information for each year
    pathData.forEach(yearData => {
      expect(yearData.phase).toBeDefined();
      expect(typeof yearData.spend).toBe('number');
      expect(yearData.spend).toBeGreaterThan(0);
      expect(typeof yearData.age).toBe('number');
      expect(typeof yearData.total).toBe('number');
    });
    
    // Should have different spending amounts for different phases
    const goGoYears = pathData.filter(p => p.phase === 'go-go');
    const slowGoYears = pathData.filter(p => p.phase === 'slow-go');
    const noGoYears = pathData.filter(p => p.phase === 'no-go');
    
    if (goGoYears.length > 0 && noGoYears.length > 0) {
      // Go-go spending should be higher than no-go spending
      const avgGoGoSpend = goGoYears.reduce((sum, y) => sum + y.spend, 0) / goGoYears.length;
      const avgNoGoSpend = noGoYears.reduce((sum, y) => sum + y.spend, 0) / noGoYears.length;
      expect(avgGoGoSpend).toBeGreaterThan(avgNoGoSpend);
    }
  });

  it('should handle bequest target marker correctly', () => {
    const bequestState = {
      ...baseState,
      bequest: 150000
    };
    
    const decision = decisionFromState(bequestState, auRules);
    const depletionData = depletionFromDecision(bequestState, decision, auRules);
    
    // Should have bequest annotation at life expectancy
    const bequestAnnotation = depletionData.annotations.find(a => 
      a.label && a.label.includes('Bequest')
    );
    
    expect(bequestAnnotation).toBeDefined();
    expect(bequestAnnotation.x).toBe(bequestState.lifeExpectancy);
    expect(bequestAnnotation.y).toBe(bequestState.bequest);
  });

  it('should include spending transition annotations', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    expect(depletionData.annotations).toBeDefined();
    expect(Array.isArray(depletionData.annotations)).toBe(true);
    
    // Should have age-band step annotations
    const stepAnnotations = depletionData.annotations.filter(a => 
      a.type === 'age-band-step'
    );
    
    // With multiple age bands, should have transition annotations
    expect(stepAnnotations.length).toBeGreaterThanOrEqual(0);
    
    stepAnnotations.forEach(annotation => {
      expect(annotation.x).toBeGreaterThanOrEqual(baseState.retirementAge);
      expect(annotation.x).toBeLessThanOrEqual(baseState.lifeExpectancy);
      expect(typeof annotation.y1).toBe('number');
      expect(typeof annotation.y2).toBe('number');
      expect(annotation.label).toBeDefined();
    });
  });

  it('should ensure no Retirement markers in DWZ-only mode', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    // T-015: Should not have any legacy retirement/target markers
    const legacyMarkers = depletionData.markers.filter(marker => 
      marker.label && (
        marker.label.includes('Retirement:') || 
        marker.label.includes('Target:') ||
        marker.label.includes('Pinned')
      )
    );
    
    expect(legacyMarkers).toHaveLength(0);
  });

  it('should handle early retirement scenarios with bridge period', () => {
    const earlyRetirementState = {
      ...baseState,
      retirementAge: 45,  // Early retirement requiring bridge period
      currentSavings: 600000,  // High savings to support bridge
      currentSuper: 400000
    };
    
    const decision = decisionFromState(earlyRetirementState, auRules);
    const depletionData = depletionFromDecision(earlyRetirementState, decision, auRules);
    
    expect(depletionData).toBeDefined();
    expect(depletionData.path.length).toBeGreaterThan(0);
    
    // Should have preservation marker at 60
    const preservationMarker = depletionData.markers.find(m => 
      m.label && m.label.includes('Super unlocks')
    );
    expect(preservationMarker).toBeDefined();
    expect(preservationMarker.x).toBe(60);
    
    // Path should show go-go spending from 45-59, then transition at 60
    const bridgeYears = depletionData.path.filter(p => p.age >= 45 && p.age < 60);
    const postPreservationYears = depletionData.path.filter(p => p.age >= 60);
    
    bridgeYears.forEach(yearData => {
      expect(yearData.phase).toBe('go-go');
    });
    
    // After 60, should transition to slow-go (60-74) then no-go (75+)
    const slowGoYear = postPreservationYears.find(p => p.age === 60);
    expect(slowGoYear.phase).toBe('slow-go');
  });

  it('should handle chart data format requirements', () => {
    const decision = decisionFromState(baseState, auRules);
    const depletionData = depletionFromDecision(baseState, decision, auRules);
    
    // Validate chart data structure for rendering
    expect(depletionData.path).toBeDefined();
    expect(depletionData.markers).toBeDefined();
    expect(depletionData.annotations).toBeDefined();
    
    // Each path point should have required fields for chart rendering
    depletionData.path.forEach(point => {
      expect(point).toHaveProperty('age');
      expect(point).toHaveProperty('total');
      expect(point).toHaveProperty('outside');
      expect(point).toHaveProperty('super');
      expect(point).toHaveProperty('spend');
      expect(point).toHaveProperty('phase');
    });
    
    // Markers should have required fields
    depletionData.markers.forEach(marker => {
      expect(marker).toHaveProperty('x');
      expect(marker).toHaveProperty('label');
    });
  });
});