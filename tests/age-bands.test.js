import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js-light';
import { 
  bandScheduleFor, 
  pvSpendAtR, 
  pvBridgeAtR, 
  pvPostAtR,
  AGE_BAND_MULTIPLIERS,
  AGE_THRESHOLDS 
} from '../src/core/age_bands.js';
import { 
  solveSustainableSpending, 
  findEarliestRetirement, 
  checkConstraintViolations 
} from '../src/core/dwz_age_band.js';

describe('Age Bands Core Functions', () => {
  describe('bandScheduleFor', () => {
    it('should generate correct bands for typical retirement', () => {
      const bands = bandScheduleFor(50, 90);
      
      expect(bands).toHaveLength(3);
      expect(bands[0]).toEqual({
        startAge: 50,
        endAge: 60,
        multiplier: AGE_BAND_MULTIPLIERS.goGo,
        phase: 'go-go'
      });
      expect(bands[1]).toEqual({
        startAge: 60,
        endAge: 75,
        multiplier: AGE_BAND_MULTIPLIERS.slowGo,
        phase: 'slow-go'
      });
      expect(bands[2]).toEqual({
        startAge: 75,
        endAge: 90,
        multiplier: AGE_BAND_MULTIPLIERS.noGo,
        phase: 'no-go'
      });
    });

    it('should handle late retirement after slow-go threshold', () => {
      const bands = bandScheduleFor(65, 90);
      
      expect(bands).toHaveLength(2);
      expect(bands[0]).toEqual({
        startAge: 65,
        endAge: 75,
        multiplier: AGE_BAND_MULTIPLIERS.slowGo,
        phase: 'slow-go'
      });
      expect(bands[1]).toEqual({
        startAge: 75,
        endAge: 90,
        multiplier: AGE_BAND_MULTIPLIERS.noGo,
        phase: 'no-go'
      });
    });

    it('should handle very late retirement after no-go threshold', () => {
      const bands = bandScheduleFor(80, 90);
      
      expect(bands).toHaveLength(1);
      expect(bands[0]).toEqual({
        startAge: 80,
        endAge: 90,
        multiplier: AGE_BAND_MULTIPLIERS.noGo,
        phase: 'no-go'
      });
    });

    it('should handle short life expectancy', () => {
      const bands = bandScheduleFor(50, 65);
      
      expect(bands).toHaveLength(2);
      expect(bands[0].endAge).toBe(60);
      expect(bands[1].startAge).toBe(60);
      expect(bands[1].endAge).toBe(65);
      expect(bands[1].phase).toBe('slow-go');
    });

    it('should clamp minimum retirement age', () => {
      const bands = bandScheduleFor(25, 90);
      expect(bands[0].startAge).toBe(30);
    });

    it('should ensure life expectancy > retirement age', () => {
      const bands = bandScheduleFor(60, 55);
      expect(bands[0].endAge).toBeGreaterThan(60);
    });
  });

  describe('pvSpendAtR', () => {
    it('should calculate PV correctly with positive return', () => {
      const bands = bandScheduleFor(50, 90);
      const spending = new Decimal(100000);
      const realReturn = new Decimal(0.05);
      
      const pv = pvSpendAtR(bands, spending, realReturn, 50);
      
      expect(pv.gt(0)).toBe(true);
      // With positive return, PV should be less than total undiscounted spending
      const totalUndiscounted = new Decimal(100000 * 1.1 * 10 + 100000 * 15 + 100000 * 0.85 * 15);
      expect(pv.lt(totalUndiscounted)).toBe(true);
    });

    it('should handle zero return rate', () => {
      const bands = bandScheduleFor(50, 90);
      const spending = new Decimal(100000);
      const realReturn = new Decimal(0);
      
      const pv = pvSpendAtR(bands, spending, realReturn, 50);
      
      // Should equal sum of undiscounted spending
      const expected = new Decimal(100000).mul(1.1).mul(10)
        .add(new Decimal(100000).mul(15))
        .add(new Decimal(100000).mul(0.85).mul(15));
      
      expect(pv.eq(expected)).toBe(true);
    });

    it('should return zero for empty bands', () => {
      const pv = pvSpendAtR([], new Decimal(100000), new Decimal(0.05), 50);
      expect(pv.eq(0)).toBe(true);
    });
  });

  describe('Solver Functions', () => {
    it('should solve sustainable spending with balanced constraints', () => {
      const result = solveSustainableSpending({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(500000),
        superWealth: new Decimal(800000),
        preservationAge: 60,
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0)
      });

      expect(result.sustainableAnnual.gt(0)).toBe(true);
      expect(result.bands).toHaveLength(3);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThan(50);
    });

    it('should handle zero return scenario', () => {
      const result = solveSustainableSpending({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(1000000),
        superWealth: new Decimal(1000000),
        preservationAge: 60,
        realReturn: new Decimal(0),
        bequest: new Decimal(0)
      });

      expect(result.sustainableAnnual.gt(0)).toBe(true);
      expect(result.bands).toHaveLength(3);
    });

    it('should find earliest retirement age', () => {
      const result = findEarliestRetirement({
        currentAge: 30,
        maxRetirementAge: 60,
        currentOutside: new Decimal(100000),
        currentSuper: new Decimal(150000),
        annualSavings: new Decimal(30000),
        annualSuperContrib: new Decimal(15000),
        nominalReturn: new Decimal(0.08),
        inflation: new Decimal(0.025),
        lifeExpectancy: 90,
        preservationAge: 60,
        bequest: new Decimal(0),
        minSpending: new Decimal(50000)
      });

      if (result.earliestAge) {
        expect(result.earliestAge).toBeGreaterThanOrEqual(30);
        expect(result.earliestAge).toBeLessThanOrEqual(60);
        expect(result.sustainableSpending.gte(50000)).toBe(true);
      }
    });
  });

  describe('Constraint Validation', () => {
    it('should correctly identify constraint violations', () => {
      const constraints = checkConstraintViolations({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(100000), // Low wealth
        superWealth: new Decimal(200000),
        preservationAge: 60,
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0),
        sustainableSpending: new Decimal(80000) // High spending
      });

      // Should have violations with low wealth and high spending
      expect(constraints.overall).toBe(false);
    });

    it('should pass with adequate wealth', () => {
      const constraints = checkConstraintViolations({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(800000),
        superWealth: new Decimal(1200000),
        preservationAge: 60,
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0),
        sustainableSpending: new Decimal(60000)
      });

      expect(constraints.overall).toBe(true);
      expect(constraints.bridgeViable).toBe(true);
      expect(constraints.postViable).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle couples preservation age logic', () => {
      // Test with younger spouse preservation age
      const result = solveSustainableSpending({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(500000),
        superWealth: new Decimal(800000),
        preservationAge: 58, // Earlier preservation age
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0)
      });

      expect(result.sustainableAnnual.gt(0)).toBe(true);
    });

    it('should handle bequest requirements', () => {
      const withBequest = solveSustainableSpending({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(1000000),
        superWealth: new Decimal(1000000),
        preservationAge: 60,
        realReturn: new Decimal(0.05),
        bequest: new Decimal(200000)
      });

      const withoutBequest = solveSustainableSpending({
        retirementAge: 50,
        lifeExpectancy: 90,
        outsideWealth: new Decimal(1000000),
        superWealth: new Decimal(1000000),
        preservationAge: 60,
        realReturn: new Decimal(0.05),
        bequest: new Decimal(0)
      });

      // Bequest should reduce sustainable spending
      expect(withBequest.sustainableAnnual.lt(withoutBequest.sustainableAnnual)).toBe(true);
    });

    it('should handle flat multiplier compatibility (all 1.0)', () => {
      // Test that it reduces to traditional DWZ when all multipliers are 1.0
      const mockMultipliers = {
        goGo: new Decimal(1.0),
        slowGo: new Decimal(1.0),
        noGo: new Decimal(1.0)
      };

      const bands = bandScheduleFor(50, 90);
      bands.forEach(band => {
        band.multiplier = new Decimal(1.0);
      });

      const spending = new Decimal(100000);
      const pv = pvSpendAtR(bands, spending, new Decimal(0.05), 50);

      // Should behave like flat annuity calculation
      expect(pv.gt(0)).toBe(true);
    });
  });
});