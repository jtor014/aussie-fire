import { describe, it, expect } from 'vitest';
import { selectStrategySummary } from '../src/selectors/strategy.js';

describe('T-020: Strategy Summary Selector', () => {
  describe('Single person strategy normalization', () => {
    const singleStrategy = {
      viable: true,
      recommendations: {
        salarysacrifice: { amount: 15000 },
        outsideInvestment: { amount: 25000 }
      },
      capAnalysis: {
        capUtilization: 0.50 // 50%
      }
    };

    it('should normalize single strategy fields with no manual overrides', () => {
      const summary = selectStrategySummary(singleStrategy, {});
      
      expect(summary.viable).toBe(true);
      expect(summary.useManual).toBe(false);
      expect(summary.recommended).toEqual({
        salarySacrifice: 15000,
        outside: 25000,
        capUsePct: 0.50
      });
      expect(summary.manual).toEqual({
        salarySacrifice: 0,
        outside: 0
      });
      expect(summary.display).toEqual(summary.recommended);
      expect(summary.totalOut).toBe(40000);
      expect(summary.capUsePct).toBe(0.50);
    });

    it('should switch to manual when overrides are non-zero', () => {
      const manualOverrides = {
        salarySacrifice: 20000,
        outside: 30000
      };
      
      const summary = selectStrategySummary(singleStrategy, manualOverrides);
      
      expect(summary.useManual).toBe(true);
      expect(summary.display).toEqual({
        salarySacrifice: 20000,
        outside: 30000
      });
      expect(summary.totalOut).toBe(50000);
      expect(summary.capUsePct).toBe(0); // Manual doesn't have cap calculation
    });

    it('should handle legacy field names (sac, outside)', () => {
      const legacyStrategy = {
        viable: true,
        recommendations: {
          sac: 12000,
          outside: 18000
        },
        capAnalysis: {
          capUtilization: 0.40
        }
      };
      
      const summary = selectStrategySummary(legacyStrategy, {});
      
      expect(summary.recommended).toEqual({
        salarySacrifice: 12000,
        outside: 18000,
        capUsePct: 0.40
      });
    });
  });

  describe('Couple strategy normalization', () => {
    const coupleStrategy = {
      viable: true,
      recommendations: {
        person1: { salarysacrifice: 10000, capUtilization: 0.33 },
        person2: { salarysacrifice: 8000, capUtilization: 0.27 },
        outsideInvestment: { amount: 22000 }
      }
    };

    it('should sum both persons salary sacrifice for couples', () => {
      const summary = selectStrategySummary(coupleStrategy, {});
      
      expect(summary.recommended).toEqual({
        salarySacrifice: 18000, // 10000 + 8000
        outside: 22000,
        capUsePct: 0.33 // Max of both persons
      });
      expect(summary.totalOut).toBe(40000);
    });

    it('should handle missing person2 gracefully', () => {
      const incompleteCoupleStrategy = {
        viable: true,
        recommendations: {
          person1: { salarysacrifice: 15000, capUtilization: 0.50 },
          outsideInvestment: { amount: 20000 }
        }
      };
      
      const summary = selectStrategySummary(incompleteCoupleStrategy, {});
      
      expect(summary.recommended.salarySacrifice).toBe(15000); // Only person1
      expect(summary.recommended.capUsePct).toBe(0.50);
    });
  });

  describe('Manual override logic', () => {
    const strategy = {
      viable: true,
      recommendations: {
        salarysacrifice: { amount: 10000 },
        outsideInvestment: { amount: 15000 }
      },
      capAnalysis: { capUtilization: 0.33 }
    };

    it('should detect manual overrides when either field is non-zero', () => {
      expect(selectStrategySummary(strategy, { salarySacrifice: 1000, outside: 0 }).useManual).toBe(true);
      expect(selectStrategySummary(strategy, { salarySacrifice: 0, outside: 1000 }).useManual).toBe(true);
      expect(selectStrategySummary(strategy, { salarySacrifice: 1000, outside: 2000 }).useManual).toBe(true);
      expect(selectStrategySummary(strategy, { salarySacrifice: 0, outside: 0 }).useManual).toBe(false);
    });

    it('should handle legacy field names in manual overrides', () => {
      const legacyOverrides = {
        additionalSuperContributions: 5000,
        outsideSavingsOverride: 10000
      };
      
      const summary = selectStrategySummary(strategy, legacyOverrides);
      
      expect(summary.useManual).toBe(true);
      expect(summary.manual).toEqual({
        salarySacrifice: 5000,
        outside: 10000
      });
      expect(summary.display).toEqual(summary.manual);
    });

    it('should prioritize new field names over legacy names', () => {
      const mixedOverrides = {
        salarySacrifice: 8000, // New field
        additionalSuperContributions: 5000, // Legacy field
        outside: 12000, // New field
        outsideSavingsOverride: 10000 // Legacy field
      };
      
      const summary = selectStrategySummary(strategy, mixedOverrides);
      
      expect(summary.manual).toEqual({
        salarySacrifice: 8000, // New takes precedence
        outside: 12000 // New takes precedence
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null/undefined strategy gracefully', () => {
      const summary = selectStrategySummary(null, {});
      
      expect(summary.viable).toBe(false);
      expect(summary.useManual).toBe(false);
      expect(summary.recommended).toEqual({ salarySacrifice: 0, outside: 0, capUsePct: 0 });
      expect(summary.totalOut).toBe(0);
    });

    it('should handle non-viable strategy', () => {
      const nonViableStrategy = {
        viable: false,
        message: 'Cannot achieve target'
      };
      
      const summary = selectStrategySummary(nonViableStrategy, {});
      
      expect(summary.viable).toBe(false);
      expect(summary.totalOut).toBe(0);
    });

    it('should handle missing recommendations gracefully', () => {
      const incompleteStrategy = {
        viable: true,
        recommendations: {} // Empty
      };
      
      const summary = selectStrategySummary(incompleteStrategy, {});
      
      expect(summary.recommended).toEqual({
        salarySacrifice: 0,
        outside: 0,
        capUsePct: 0
      });
    });

    it('should handle undefined manual overrides', () => {
      const strategy = {
        viable: true,
        recommendations: {
          salarysacrifice: { amount: 10000 },
          outsideInvestment: { amount: 15000 }
        }
      };
      
      const summary = selectStrategySummary(strategy); // No overrides param
      
      expect(summary.useManual).toBe(false);
      expect(summary.manual).toEqual({ salarySacrifice: 0, outside: 0 });
    });
  });

  describe('Calculated fields', () => {
    it('should calculate totalOut correctly for all scenarios', () => {
      const strategy = {
        viable: true,
        recommendations: {
          salarysacrifice: { amount: 12000 },
          outsideInvestment: { amount: 18000 }
        }
      };
      
      // Recommended mode
      const recommended = selectStrategySummary(strategy, {});
      expect(recommended.totalOut).toBe(30000);
      
      // Manual mode
      const manual = selectStrategySummary(strategy, { salarySacrifice: 15000, outside: 25000 });
      expect(manual.totalOut).toBe(40000);
    });

    it('should set capUsePct to 0 for manual overrides', () => {
      const strategy = {
        viable: true,
        recommendations: {
          salarysacrifice: { amount: 10000 }
        },
        capAnalysis: { capUtilization: 0.67 }
      };
      
      const recommendedSummary = selectStrategySummary(strategy, {});
      const manualSummary = selectStrategySummary(strategy, { salarySacrifice: 15000 });
      
      expect(recommendedSummary.capUsePct).toBe(0.67);
      expect(manualSummary.capUsePct).toBe(0); // Manual doesn't calculate cap usage
    });
  });
});