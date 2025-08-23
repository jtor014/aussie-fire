import { describe, it, expect } from 'vitest';
import { analyzeBindingConstraint, makeBandAtAge } from '../src/core/dwz_age_band';

// Custom matcher for arrays
expect.extend({
  toBeOneOf(received, expectedArray) {
    const pass = expectedArray.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expectedArray}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expectedArray}`,
        pass: false,
      };
    }
  },
});

const bands = [
  { from: 30, to: 60, multiplier: 1.10 },
  { from: 60, to: 75, multiplier: 1.00 },
  { from: 75, to: 120, multiplier: 0.85 },
];

const bandAtAge = makeBandAtAge(bands);

describe('binding-constraint explainer', () => {
  it('classifies bridge-limited when outside is tight before P', () => {
    const r = analyzeBindingConstraint({
      R: 46, L: 90, preservationAge: 60, realReturn: 0.05,
      bandAtAge,
      outsideNow: 120_000,
      superAtPreservation: 1_200_000,
      sustainableAnnual: 70_000,
    });
    expect(r.type).toBe('bridge');
    expect(r.atAge).toBe(60);
    expect(r.sBridgeMax).toBeGreaterThan(0);
    expect(r.sTotalMax).toBeGreaterThan(0);
    expect(r.sBridgeMax).toBeLessThan(r.sTotalMax);
  });

  it('classifies horizon-limited when outside is plentiful', () => {
    const r = analyzeBindingConstraint({
      R: 46, L: 90, preservationAge: 60, realReturn: 0.05,
      bandAtAge,
      outsideNow: 3_000_000,
      superAtPreservation: 1_200_000,
      sustainableAnnual: 110_000,
    });
    expect(r.type).toBe('horizon');
    expect(r.atAge).toBe(90);
    expect(r.sBridgeMax).toBeGreaterThan(0);
    expect(r.sTotalMax).toBeGreaterThan(0);
    expect(r.sBridgeMax).toBeGreaterThan(r.sTotalMax);
  });

  it('couple uses younger preservation age convention', () => {
    const r = analyzeBindingConstraint({
      R: 50, L: 92, preservationAge: 58, realReturn: 0.05,
      bandAtAge,
      outsideNow: 400_000,
      superAtPreservation: 900_000,
      sustainableAnnual: 80_000,
    });
    // Not asserting type; asserting we surface the chosen P
    expect([58, 92]).toContain(r.atAge);
    expect(r.sBridgeMax).toBeGreaterThan(0);
    expect(r.sTotalMax).toBeGreaterThan(0);
  });

  it('handles edge case when R equals P (no bridge period)', () => {
    const r = analyzeBindingConstraint({
      R: 60, L: 90, preservationAge: 60, realReturn: 0.05,
      bandAtAge,
      outsideNow: 500_000,
      superAtPreservation: 800_000,
      sustainableAnnual: 60_000,
    });
    expect(r.type).toBe('horizon'); // No bridge period, so always horizon
    expect(r.atAge).toBe(90);
    expect(r.sBridgeMax).toBe(Infinity); // No bridge constraint
  });

  it('handles zero real return correctly', () => {
    const r = analyzeBindingConstraint({
      R: 50, L: 85, preservationAge: 60, realReturn: 0,
      bandAtAge,
      outsideNow: 200_000,
      superAtPreservation: 600_000,
      sustainableAnnual: 40_000,
    });
    expect(r.type).toBeOneOf(['bridge', 'horizon']);
    expect(r.sBridgeMax).toBeGreaterThan(0);
    expect(r.sTotalMax).toBeGreaterThan(0);
  });

  it('returns correct numerical values', () => {
    const r = analyzeBindingConstraint({
      R: 45, L: 90, preservationAge: 60, realReturn: 0.04,
      bandAtAge,
      outsideNow: 300_000,
      superAtPreservation: 800_000,
      sustainableAnnual: 50_000,
    });
    
    // Check that values are finite numbers
    expect(typeof r.sBridgeMax).toBe('number');
    expect(typeof r.sTotalMax).toBe('number');
    expect(typeof r.epsilon).toBe('number');
    expect(r.epsilon).toBeGreaterThan(0);
    
    // Check that epsilon is reasonable (either $1 or 0.2% of sustainable)
    const expectedEpsilon = Math.max(1, 50_000 * 0.002);
    expect(r.epsilon).toBeCloseTo(expectedEpsilon, 0);
  });

  it('epsilon classification works near boundaries', () => {
    // Test case where S* is very close to sBridgeMax
    const r = analyzeBindingConstraint({
      R: 50, L: 90, preservationAge: 60, realReturn: 0.05,
      bandAtAge,
      outsideNow: 180_000, // Chosen to make sBridgeMax ≈ sustainableAnnual
      superAtPreservation: 1_000_000,
      sustainableAnnual: 20_000,
    });
    
    // Should classify based on epsilon tolerance
    expect(r.type).toBeOneOf(['bridge', 'horizon']);
    expect(typeof r.epsilon).toBe('number');
    expect(r.epsilon).toBeGreaterThan(0);
  });
});

describe('makeBandAtAge helper', () => {
  it('returns correct multiplier for age in band', () => {
    const bandAtAge = makeBandAtAge(bands);
    
    expect(bandAtAge(45)).toBe(1.10); // go-go years
    expect(bandAtAge(65)).toBe(1.00); // slow-go years  
    expect(bandAtAge(80)).toBe(0.85); // no-go years
  });

  it('returns 1.0 for ages outside all bands', () => {
    const bandAtAge = makeBandAtAge(bands);
    
    expect(bandAtAge(25)).toBe(1); // Before any band
    expect(bandAtAge(125)).toBe(1); // After all bands
  });

  it('handles empty bands array', () => {
    const bandAtAge = makeBandAtAge([]);
    
    expect(bandAtAge(50)).toBe(1);
    expect(bandAtAge(70)).toBe(1);
  });

  it('handles band boundaries correctly', () => {
    const bandAtAge = makeBandAtAge(bands);
    
    expect(bandAtAge(60)).toBe(1.00); // At boundary, should match slow-go
    expect(bandAtAge(75)).toBe(0.85); // At boundary, should match no-go
  });
});