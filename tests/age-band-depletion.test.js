import { describe, it, expect } from 'vitest';
import { generateDepletionPath } from '../src/selectors/depletion.js';
import { AGE_BAND_MULTIPLIERS } from '../src/core/age_bands.js';

/**
 * T-016 Age-Band Depletion Path Tests
 * 
 * Validates that the depletion path generator correctly applies age-band multipliers
 * (go-go/slow-go/no-go phases) to spending patterns.
 */
describe('Age-Band Aware Depletion Path', () => {
  const baseParams = {
    R: 45,          // Retirement age
    P: 60,          // Preservation age
    L: 85,          // Life expectancy
    W_out: 500000,  // Outside wealth
    W_sup: 300000,  // Super wealth
    r: 0.04,        // Real return
    sustainableSpending: 60000,
    bequest: 0,
    useAgeBands: true
  };

  it('should apply age-band multipliers correctly', () => {
    const path = generateDepletionPath(baseParams);
    
    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThan(0);
    
    // Find spending amounts in each age band phase
    const goGoSpending = path.find(p => p.phase === 'go-go');
    const slowGoSpending = path.find(p => p.phase === 'slow-go');
    const noGoSpending = path.find(p => p.phase === 'no-go');
    
    expect(goGoSpending).toBeDefined();
    expect(slowGoSpending).toBeDefined();
    expect(noGoSpending).toBeDefined();
    
    // Verify multiplier application
    const expectedGoGo = baseParams.sustainableSpending * 1.10; // go-go multiplier
    const expectedSlowGo = baseParams.sustainableSpending * 1.00; // slow-go multiplier
    const expectedNoGo = baseParams.sustainableSpending * 0.85; // no-go multiplier
    
    expect(goGoSpending.spend).toBeCloseTo(expectedGoGo, 1);
    expect(slowGoSpending.spend).toBeCloseTo(expectedSlowGo, 1);
    expect(noGoSpending.spend).toBeCloseTo(expectedNoGo, 1);
  });

  it('should transition between age bands at correct ages', () => {
    const path = generateDepletionPath(baseParams);
    
    // Find transition points
    const age59 = path.find(p => p.age === 59);  // Last go-go year
    const age60 = path.find(p => p.age === 60);  // First slow-go year
    const age74 = path.find(p => p.age === 74);  // Last slow-go year
    const age75 = path.find(p => p.age === 75);  // First no-go year
    
    expect(age59.phase).toBe('go-go');
    expect(age60.phase).toBe('slow-go');
    expect(age74.phase).toBe('slow-go');
    expect(age75.phase).toBe('no-go');
    
    // Verify spending changes at transitions
    expect(age59.spend).toBeCloseTo(baseParams.sustainableSpending * 1.10, 1);
    expect(age60.spend).toBeCloseTo(baseParams.sustainableSpending * 1.00, 1);
    expect(age75.spend).toBeCloseTo(baseParams.sustainableSpending * 0.85, 1);
  });

  it('should handle retirement exactly at slow-go phase start', () => {
    const slowGoStartParams = {
      ...baseParams,
      R: 60  // Retire exactly at slow-go start
    };
    
    const path = generateDepletionPath(slowGoStartParams);
    
    // Should start with slow-go phase
    const firstYear = path[0];
    expect(firstYear.age).toBe(60);
    expect(firstYear.phase).toBe('slow-go');
    expect(firstYear.spend).toBeCloseTo(baseParams.sustainableSpending * 1.00, 1);
  });

  it('should handle retirement in no-go phase', () => {
    const noGoStartParams = {
      ...baseParams,
      R: 76,  // Retire in no-go phase
      L: 85
    };
    
    const path = generateDepletionPath(noGoStartParams);
    
    // Should start with no-go phase
    const firstYear = path[0];
    expect(firstYear.age).toBe(76);
    expect(firstYear.phase).toBe('no-go');
    expect(firstYear.spend).toBeCloseTo(baseParams.sustainableSpending * 0.85, 1);
  });

  it('should maintain backward compatibility with legacy parameters', () => {
    const legacyParams = {
      R: 55,
      P: 60,
      L: 85,
      W_out: 400000,
      W_sup: 600000,
      r: 0.04,
      S_pre: 50000,   // Legacy pre-super spending
      S_post: 70000,  // Legacy post-super spending
      bequest: 0
      // Note: no sustainableSpending, so should use legacy mode
    };
    
    const path = generateDepletionPath(legacyParams);
    
    expect(path).toBeDefined();
    expect(path.length).toBeGreaterThan(0);
    
    // Should use legacy pre/post spending instead of age bands
    const prePreservation = path.find(p => p.age === 58);  // Before preservation
    const postPreservation = path.find(p => p.age === 62); // After preservation
    
    expect(prePreservation.spend).toBe(50000);  // S_pre
    expect(postPreservation.spend).toBe(70000); // S_post
    expect(prePreservation.phase).toBe('pre-super');
    expect(postPreservation.phase).toBe('post-super');
  });

  it('should handle edge case of very short retirement', () => {
    const shortRetirementParams = {
      ...baseParams,
      R: 83,  // Retire late
      L: 85   // Die soon
    };
    
    const path = generateDepletionPath(shortRetirementParams);
    
    expect(path).toBeDefined();
    expect(path.length).toBe(3); // Ages 83, 84, 85
    
    // Should be in no-go phase for entire retirement
    path.forEach(yearData => {
      expect(yearData.phase).toBe('no-go');
      expect(yearData.spend).toBeCloseTo(baseParams.sustainableSpending * 0.85, 1);
    });
  });

  it('should include phase information in path data', () => {
    const path = generateDepletionPath(baseParams);
    
    // Every path entry should have phase information
    path.forEach(yearData => {
      expect(yearData.phase).toBeDefined();
      expect(['go-go', 'slow-go', 'no-go'].includes(yearData.phase)).toBe(true);
      expect(yearData.spend).toBeGreaterThan(0);
      expect(yearData.age).toBeGreaterThanOrEqual(baseParams.R);
      expect(yearData.age).toBeLessThanOrEqual(baseParams.L);
    });
  });

  it('should respect super access rules in bridge period', () => {
    const bridgePeriodParams = {
      ...baseParams,
      R: 50,   // Early retirement requiring bridge
      P: 60    // Preservation age
    };
    
    const path = generateDepletionPath(bridgePeriodParams);
    
    // During bridge period (50-59), spending should come from outside wealth only
    const bridgeYears = path.filter(p => p.age < 60);
    const postPreservationYears = path.filter(p => p.age >= 60);
    
    // Bridge years should have go-go spending but constrained by outside wealth
    bridgeYears.forEach(yearData => {
      expect(yearData.phase).toBe('go-go');
      expect(yearData.outside).toBeGreaterThanOrEqual(0); // Should not go negative
    });
    
    // After preservation, both outside and super should be available
    postPreservationYears.forEach(yearData => {
      expect(['slow-go', 'no-go'].includes(yearData.phase)).toBe(true);
    });
  });

  it('should handle bequest requirements with age bands', () => {
    const bequestParams = {
      ...baseParams,
      bequest: 100000
    };
    
    const path = generateDepletionPath(bequestParams);
    
    expect(path).toBeDefined();
    
    // Final year should have positive wealth for bequest
    const finalYear = path[path.length - 1];
    expect(finalYear.age).toBe(baseParams.L);
    expect(finalYear.total).toBeGreaterThanOrEqual(0);
    
    // Age-band spending should still be applied
    const goGoYear = path.find(p => p.phase === 'go-go');
    const noGoYear = path.find(p => p.phase === 'no-go');
    
    expect(goGoYear.spend).toBeGreaterThan(noGoYear.spend);
  });
});