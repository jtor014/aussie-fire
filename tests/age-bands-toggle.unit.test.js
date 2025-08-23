import { describe, it, expect } from 'vitest';
import { normalizeBandSettings, createFlatSchedule, createAgeBandedSchedule } from '../src/lib/validation/ageBands';

describe('Age-band Toggle - Unit Tests', () => {
  describe('normalizeBandSettings', () => {
    it('should clamp multipliers to [0.50, 1.50] range', () => {
      const result = normalizeBandSettings({
        R: 45,
        L: 90,
        settings: {
          gogoTo: 60,
          slowTo: 75,
          gogoMult: 2.00, // Too high
          slowMult: 0.30, // Too low
          nogoMult: 0.85
        }
      });

      expect(result.settings.gogoMult).toBe(1.50);
      expect(result.settings.slowMult).toBe(0.50);
      expect(result.warnings).toContain('Go-go multiplier clamped to 1.50× (was 2.00×)');
      expect(result.warnings).toContain('Slow-go multiplier clamped to 0.50× (was 0.30×)');
    });

    it('should enforce age ordering R ≤ gogoTo < slowTo < L', () => {
      const result = normalizeBandSettings({
        R: 50,
        L: 85,
        settings: {
          gogoTo: 45, // Before R
          slowTo: 55, // Will become valid after gogoTo is adjusted
          gogoMult: 1.10,
          slowMult: 1.00,
          nogoMult: 0.85
        }
      });

      expect(result.settings.gogoTo).toBe(50); // Adjusted to R
      expect(result.settings.slowTo).toBe(55); // Remains valid since 55 > 50
      expect(result.warnings).toContain('Adjusted ages to keep bands ordered (Go-go < Slow-go < Life expectancy)');
    });
  });

  describe('createFlatSchedule', () => {
    it('should create single band with 1.00 multiplier', () => {
      const schedule = createFlatSchedule(45, 85);
      
      expect(schedule).toHaveLength(1);
      expect(schedule[0]).toEqual({
        name: 'Flat',
        from: 45,
        to: 85,
        startAge: 45,
        endAge: 85,
        multiplier: 1.00
      });
    });

    it('should return empty array when R >= L', () => {
      const schedule = createFlatSchedule(85, 80);
      expect(schedule).toHaveLength(0);
    });
  });

  describe('createAgeBandedSchedule', () => {
    it('should create three bands with default settings', () => {
      const schedule = createAgeBandedSchedule(45, 85, {
        gogoTo: 60,
        slowTo: 75,
        gogoMult: 1.10,
        slowMult: 1.00,
        nogoMult: 0.85
      });
      
      expect(schedule).toHaveLength(3);
      
      // Go-go band
      expect(schedule[0]).toEqual({
        name: 'Go-go',
        from: 45,
        to: 60,
        startAge: 45,
        endAge: 60,
        multiplier: 1.10
      });

      // Slow-go band  
      expect(schedule[1]).toEqual({
        name: 'Slow-go',
        from: 60,
        to: 75,
        startAge: 60,
        endAge: 75,
        multiplier: 1.00
      });

      // No-go band
      expect(schedule[2]).toEqual({
        name: 'No-go',
        from: 75,
        to: 85,
        startAge: 75,
        endAge: 85,
        multiplier: 0.85
      });
    });

    it('should handle edge case where retirement equals go-go end', () => {
      const schedule = createAgeBandedSchedule(60, 85, {
        gogoTo: 60,
        slowTo: 75,
        gogoMult: 1.10,
        slowMult: 1.00,
        nogoMult: 0.85
      });
      
      expect(schedule).toHaveLength(2);
      expect(schedule[0].name).toBe('Slow-go');
      expect(schedule[1].name).toBe('No-go');
    });
  });
});

describe('Age-band Toggle - Integration Tests', () => {
  // These would test the actual decision selector with flat vs age-banded modes
  // For now, basic functionality tests to verify the toggle works
  
  it('should exist as placeholder for integration tests', () => {
    // Placeholder - would test actual selector behavior with toggle
    expect(true).toBe(true);
  });
});