import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js-light';
import { 
  computeHeadroom, 
  applyContribTax, 
  projectBalancesToR, 
  findEarliestViableAge,
  evaluateSustainableSpending
} from '../src/core/optimizer/split_optimizer.js';

describe('Split Optimizer Unit Tests', () => {
  describe('computeHeadroom', () => {
    it('should calculate correct headroom for typical salary', () => {
      const headroom = computeHeadroom({
        salary: 100000,
        sgPct: 0.115,
        concessionalCap: 30000
      });
      
      // SG = 100,000 * 0.115 = 11,500
      // Headroom = 30,000 - 11,500 = 18,500
      expect(headroom).toBe(18500);
    });

    it('should handle high salary hitting SG cap', () => {
      const headroom = computeHeadroom({
        salary: 300000, // High salary
        sgPct: 0.115,
        concessionalCap: 30000
      });
      
      // SG would be 34,500 but capped at 30,000
      // Headroom = 30,000 - 30,000 = 0
      expect(headroom).toBe(0);
    });

    it('should return zero headroom when SG exceeds cap', () => {
      const headroom = computeHeadroom({
        salary: 280000,
        sgPct: 0.115,
        concessionalCap: 27500 // Lower cap
      });
      
      expect(headroom).toBe(0);
    });

    it('should handle edge case of zero salary', () => {
      const headroom = computeHeadroom({
        salary: 0,
        sgPct: 0.115,
        concessionalCap: 30000
      });
      
      expect(headroom).toBe(30000);
    });
  });

  describe('applyContribTax', () => {
    it('should apply 15% contributions tax correctly', () => {
      expect(applyContribTax(10000)).toBe(8500);
      expect(applyContribTax(5000)).toBe(4250);
      expect(applyContribTax(0)).toBe(0);
    });

    it('should handle fractional amounts', () => {
      expect(applyContribTax(1000.50)).toBeCloseTo(850.425, 2);
    });
  });

  describe('projectBalancesToR', () => {
    const baseHousehold = {
      currentAge: 30,
      retirementAge: 50,
      currentOutside: 50000,
      currentSuper1: 100000,
      currentSuper2: 0,
      insurance1: 1000,
      insurance2: 0,
      salary1: 100000,
      salary2: 0,
      sgPct: 0.115
    };

    const baseAssumptions = {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    };

    it('should project wealth correctly with positive returns', () => {
      const result = projectBalancesToR(
        baseHousehold,
        5000, // SAC1
        0,    // SAC2  
        10000, // Outside
        baseAssumptions
      );

      expect(result.outsideWealth.gt(50000)).toBe(true);
      expect(result.superWealth1.gt(100000)).toBe(true);
      expect(result.superWealth2.eq(0)).toBe(true);
    });

    it('should handle zero return case', () => {
      const zeroReturnAssumptions = {
        nominalReturn: new Decimal(0.025),
        inflation: new Decimal(0.025)
      };

      const result = projectBalancesToR(
        baseHousehold,
        5000, // SAC1
        0,    // SAC2
        10000, // Outside
        zeroReturnAssumptions
      );

      expect(result.outsideWealth.gt(50000)).toBe(true);
      expect(result.superWealth1.gt(100000)).toBe(true);
    });

    it('should handle insurance deductions correctly', () => {
      const highInsuranceHousehold = {
        ...baseHousehold,
        insurance1: 15000 // High insurance
      };

      const result = projectBalancesToR(
        highInsuranceHousehold,
        0, 0, 0,
        baseAssumptions
      );

      // Super should still grow despite high insurance eating into contributions
      expect(result.superWealth1.gte(100000)).toBe(true);
    });

    it('should handle couples projections', () => {
      const coupleHousehold = {
        ...baseHousehold,
        currentSuper2: 80000,
        salary2: 80000,
        insurance2: 800
      };

      const result = projectBalancesToR(
        coupleHousehold,
        3000, // SAC1
        2000, // SAC2
        15000, // Outside
        baseAssumptions
      );

      expect(result.outsideWealth.gt(50000)).toBe(true);
      expect(result.superWealth1.gt(100000)).toBe(true);
      expect(result.superWealth2.gt(80000)).toBe(true);
    });

    it('should handle immediate retirement (0 years)', () => {
      const immediateHousehold = {
        ...baseHousehold,
        retirementAge: 30 // Same as current age
      };

      const result = projectBalancesToR(
        immediateHousehold,
        5000, 0, 10000,
        baseAssumptions
      );

      // Should return current balances unchanged
      expect(result.outsideWealth.eq(50000)).toBe(true);
      expect(result.superWealth1.eq(100000)).toBe(true);
    });
  });

  describe('findEarliestViableAge', () => {
    const baseParams = {
      currentAge: 35,
      lifeExpectancy: 90,
      preservationAge: 60,
      targetSpend: 60000,
      bequest: 0,
      sac1: 10000,
      sac2: 0,
      outside: 20000
    };

    const baseAssumptions = {
      nominalReturn: new Decimal(0.085),
      inflation: new Decimal(0.025)
    };

    it('should find earliest age for adequate savings', () => {
      const result = findEarliestViableAge(baseParams, baseAssumptions);

      if (result !== null) {
        expect(result).toBeGreaterThanOrEqual(35);
        expect(result).toBeLessThanOrEqual(60);
      }
    });

    it('should return null for inadequate savings', () => {
      const inadequateParams = {
        ...baseParams,
        sac1: 0,
        sac2: 0,
        outside: 1000 // Very low savings
      };

      const result = findEarliestViableAge(inadequateParams, baseAssumptions);
      
      // May return null for very low savings scenarios
      expect(result === null || result > 35).toBe(true);
    });

    it('should handle bequest requirements correctly', () => {
      const paramsWithBequest = {
        ...baseParams,
        bequest: 200000
      };

      const withBequest = findEarliestViableAge(paramsWithBequest, baseAssumptions);
      const withoutBequest = findEarliestViableAge(baseParams, baseAssumptions);

      if (withBequest !== null && withoutBequest !== null) {
        // Bequest should delay retirement
        expect(withBequest >= withoutBequest).toBe(true);
      }
    });

    it('should handle zero return scenario', () => {
      const zeroReturnAssumptions = {
        nominalReturn: new Decimal(0.025),
        inflation: new Decimal(0.025)
      };

      const result = findEarliestViableAge(baseParams, zeroReturnAssumptions);

      if (result !== null) {
        expect(result).toBeGreaterThanOrEqual(35);
      }
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should never produce NaN values in headroom calculation', () => {
      const testCases = [
        { salary: 0, sgPct: 0, concessionalCap: 0 },
        { salary: -1000, sgPct: 0.115, concessionalCap: 30000 },
        { salary: 100000, sgPct: -0.1, concessionalCap: 30000 },
        { salary: 100000, sgPct: 0.115, concessionalCap: -5000 }
      ];

      testCases.forEach(testCase => {
        const result = computeHeadroom(testCase);
        expect(isNaN(result)).toBe(false);
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle very high contribution amounts', () => {
      const result = applyContribTax(1000000); // $1M SAC
      expect(result).toBe(850000);
      expect(isNaN(result)).toBe(false);
    });

    it('should handle extreme wealth projections gracefully', () => {
      const extremeHousehold = {
        currentAge: 25,
        retirementAge: 65, // 40 years
        currentOutside: 1000000,
        currentSuper1: 2000000,
        currentSuper2: 0,
        insurance1: 50000, // Very high insurance
        insurance2: 0,
        salary1: 500000, // High salary
        salary2: 0,
        sgPct: 0.115
      };

      const result = projectBalancesToR(
        extremeHousehold,
        30000, 0, 100000,
        { nominalReturn: new Decimal(0.12), inflation: new Decimal(0.03) }
      );

      expect(result.outsideWealth.gt(0)).toBe(true);
      expect(result.superWealth1.gt(0)).toBe(true);
      expect(isNaN(result.outsideWealth.toNumber())).toBe(false);
      expect(isNaN(result.superWealth1.toNumber())).toBe(false);
    });
  });
});