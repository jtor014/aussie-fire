import { describe, it, expect } from 'vitest';
import { generateDepletionPath } from '../src/selectors/depletion.js';

describe('Age-band Phase Tagging', () => {
  it('should annotate depletion path with phase when bands are provided', () => {
    const bands = [
      { name: 'Go-go', from: 46, to: 60, startAge: 46, endAge: 60, multiplier: 1.10 },
      { name: 'Slow-go', from: 60, to: 75, startAge: 60, endAge: 75, multiplier: 1.00 },
      { name: 'No-go', from: 75, to: 90, startAge: 75, endAge: 90, multiplier: 0.85 },
    ];
    
    const path = generateDepletionPath({
      R: 46,
      P: 60, 
      L: 90,
      W_out: 500000,
      W_sup: 300000,
      r: 0.04,
      S_pre: 50000,
      S_post: 60000,
      bequest: 0,
      bandSchedule: bands
    });
    
    // Check that path points have phase information
    expect(path.length).toBeGreaterThan(0);
    
    // Find points in each phase
    const goGoPoints = path.filter(p => p.phase === 'go-go');
    const slowGoPoints = path.filter(p => p.phase === 'slow-go'); 
    const noGoPoints = path.filter(p => p.phase === 'no-go');
    
    expect(goGoPoints.length).toBeGreaterThan(0);
    expect(slowGoPoints.length).toBeGreaterThan(0);
    expect(noGoPoints.length).toBeGreaterThan(0);
    
    // Verify phase boundaries
    expect(goGoPoints.every(p => p.age >= 46 && p.age < 60)).toBe(true);
    expect(slowGoPoints.every(p => p.age >= 60 && p.age < 75)).toBe(true);
    expect(noGoPoints.every(p => p.age >= 75 && p.age <= 90)).toBe(true);
  });

  it('should handle flat schedule phase tagging', () => {
    const bands = [
      { name: 'Flat', from: 50, to: 85, startAge: 50, endAge: 85, multiplier: 1.00 }
    ];
    
    const path = generateDepletionPath({
      R: 50,
      P: 60,
      L: 85,
      W_out: 400000,
      W_sup: 200000,
      r: 0.04,
      S_pre: 40000,
      S_post: 40000,
      bequest: 0,
      bandSchedule: bands
    });
    
    // All points should have flat phase
    const flatPoints = path.filter(p => p.phase === 'flat');
    expect(flatPoints.length).toBe(path.length);
    expect(flatPoints.every(p => p.age >= 50 && p.age <= 85)).toBe(true);
  });

  it('should not add phase when no band schedule provided', () => {
    const path = generateDepletionPath({
      R: 50,
      P: 60,
      L: 85,
      W_out: 400000,
      W_sup: 200000,
      r: 0.04,
      S_pre: 40000,
      S_post: 40000,
      bequest: 0
      // No bandSchedule provided
    });
    
    // No points should have phase information
    expect(path.every(p => p.phase === undefined)).toBe(true);
  });

  it('should handle edge case where age is exactly at band boundary', () => {
    const bands = [
      { name: 'Go-go', from: 46, to: 60, startAge: 46, endAge: 60, multiplier: 1.10 },
      { name: 'Slow-go', from: 60, to: 75, startAge: 60, endAge: 75, multiplier: 1.00 },
    ];
    
    const path = generateDepletionPath({
      R: 60, // Starts exactly at slow-go boundary
      P: 60,
      L: 70,
      W_out: 300000,
      W_sup: 200000,
      r: 0.04,
      S_pre: 40000,
      S_post: 40000,
      bequest: 0,
      bandSchedule: bands
    });
    
    // Should all be slow-go phase (60 is start of slow-go band)
    const slowGoPoints = path.filter(p => p.phase === 'slow-go');
    expect(slowGoPoints.length).toBe(path.length);
  });
});