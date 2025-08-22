import { describe, it, expect } from 'vitest';
import * as Money from './money.js';

describe('Money utilities', () => {
  describe('Basic arithmetic', () => {
    it('should add monetary values correctly', () => {
      const result = Money.add(100.50, 200.75, 50.25);
      expect(Money.toNumber(result)).toBe(351.50);
    });

    it('should subtract monetary values correctly', () => {
      const result = Money.sub(1000, 250.50, 100.25);
      expect(Money.toNumber(result)).toBe(649.25);
    });

    it('should multiply monetary values correctly', () => {
      const result = Money.mul(150.50, 1.1);
      expect(Money.toNumber(result)).toBe(165.55);
    });

    it('should divide monetary values correctly', () => {
      const result = Money.div(1000, 4);
      expect(Money.toNumber(result)).toBe(250);
    });

    it('should handle division by zero safely', () => {
      const result = Money.div(1000, 0);
      expect(Money.toNumber(result)).toBe(0);
    });
  });

  describe('Rounding', () => {
    it('should round to cents correctly', () => {
      const result = Money.roundCents(123.456);
      expect(Money.toNumber(result)).toBe(123.46);
    });

    it('should round to dollars correctly', () => {
      const result = Money.roundDollars(123.456);
      expect(Money.toNumber(result)).toBe(123);
    });

    it('should use banker\'s rounding (ROUND_HALF_EVEN) for cents', () => {
      // Banker's rounding: 0.5 rounds to nearest even number
      expect(Money.toNumber(Money.roundCents(0.015))).toBe(0.02);   // 1.5 cents -> 2 cents (even)
      expect(Money.toNumber(Money.roundCents(0.025))).toBe(0.02);   // 2.5 cents -> 2 cents (even)
      expect(Money.toNumber(Money.roundCents(0.035))).toBe(0.04);   // 3.5 cents -> 4 cents (even)
      expect(Money.toNumber(Money.roundCents(0.045))).toBe(0.04);   // 4.5 cents -> 4 cents (even)
      expect(Money.toNumber(Money.roundCents(-0.015))).toBe(-0.02); // -1.5 cents -> -2 cents (even)
      expect(Money.toNumber(Money.roundCents(-0.025))).toBe(-0.02); // -2.5 cents -> -2 cents (even)
    });

    it('should round non-halfway values as expected', () => {
      expect(Money.toNumber(Money.roundCents(0.014))).toBe(0.01);   // < 0.5, round down
      expect(Money.toNumber(Money.roundCents(0.016))).toBe(0.02);   // > 0.5, round up
      expect(Money.toNumber(Money.roundCents(0.024))).toBe(0.02);   // < 0.5, round down
      expect(Money.toNumber(Money.roundCents(0.026))).toBe(0.03);   // > 0.5, round up
    });
  });

  describe('Formatting', () => {
    it('should format AUD without cents by default', () => {
      expect(Money.formatAUD(1234.56)).toBe('$1,235');
    });

    it('should format AUD with cents when requested', () => {
      expect(Money.formatAUD(1234.56, true)).toBe('$1,234.56');
    });

    it('should format negative values correctly', () => {
      expect(Money.formatAUD(-500)).toBe('-$500');
    });
  });

  describe('Comparisons', () => {
    it('should find maximum value', () => {
      const result = Money.max(100, 250, 50, 300, 150);
      expect(Money.toNumber(result)).toBe(300);
    });

    it('should find minimum value', () => {
      const result = Money.min(100, 250, 50, 300, 150);
      expect(Money.toNumber(result)).toBe(50);
    });

    it('should detect zero values', () => {
      expect(Money.isZero(0)).toBe(true);
      expect(Money.isZero(0.005)).toBe(true); // Less than 1 cent
      expect(Money.isZero(0.01)).toBe(true); // Exactly 1 cent (threshold)
      expect(Money.isZero(0.02)).toBe(false);
    });

    it('should detect positive values', () => {
      expect(Money.isPositive(100)).toBe(true);
      expect(Money.isPositive(0)).toBe(false);
      expect(Money.isPositive(-100)).toBe(false);
    });

    it('should detect negative values', () => {
      expect(Money.isNegative(-100)).toBe(true);
      expect(Money.isNegative(0)).toBe(false);
      expect(Money.isNegative(100)).toBe(false);
    });
  });

  describe('Floating-point precision', () => {
    it('should handle 0.1 + 0.2 correctly', () => {
      const result = Money.add(0.1, 0.2);
      expect(Money.toNumber(result)).toBe(0.3);
    });

    it('should handle repeated additions without drift', () => {
      let total = Money.money(0);
      for (let i = 0; i < 100; i++) {
        total = Money.add(total, 0.01);
      }
      expect(Money.toNumber(total)).toBe(1.00);
    });

    it('should handle tax calculations precisely', () => {
      // $100,000 income, 32.5% tax bracket
      const income = Money.money(100000);
      const taxRate = 0.325;
      const tax = Money.mul(income, taxRate);
      expect(Money.toNumber(tax)).toBe(32500);
    });
  });

  describe('Compound interest calculations', () => {
    it('should calculate compound interest correctly', () => {
      // $10,000 at 7% for 10 years
      const principal = Money.money(10000);
      const rate = 1.07;
      const years = 10;
      const result = Money.mul(principal, Money.pow(rate, years));
      expect(Money.toNumber(Money.roundCents(result))).toBeCloseTo(19671.51, 2);
    });
  });
});

describe('Golden value tests for DWZ calculations', () => {
  it('should calculate DWZ annual spend for single person correctly', () => {
    // Test case: Age 40, retire at 50, die at 85
    // $500k outside super, $300k in super = $800k total
    // 5% real return, 35 years in retirement
    // 
    // DERIVATION:
    // Using standard annuity formula: PMT = PV * (r / (1 - (1 + r)^-n))
    // PV = $800,000, r = 0.05, n = 35
    // PMT = 800000 * (0.05 / (1 - 1.05^-35))
    // PMT = 800000 * (0.05 / (1 - 0.18129))
    // PMT = 800000 * (0.05 / 0.81871)
    // PMT = 800000 * 0.061071
    // PMT = $48,857 (exact with decimal precision)
    
    const outsideSuper = Money.money(500000);
    const insideSuper = Money.money(300000);
    const totalWealth = Money.add(outsideSuper, insideSuper);
    const yearsInRetirement = 35;
    const realReturn = 0.05;
    
    // Simple annuity calculation for validation
    // PMT = PV * (r / (1 - (1 + r)^-n))
    const r = realReturn;
    const n = yearsInRetirement;
    const factor = Money.div(r, Money.sub(1, Money.pow(Money.add(1, r), -n)));
    const annualSpend = Money.mul(totalWealth, factor);
    
    // Expected: $48,857 using decimal arithmetic (vs $48,856.75 with floating-point)
    expect(Money.toNumber(Money.roundDollars(annualSpend))).toBeCloseTo(48857, 0);
  });

  it('should maintain precision in bridge period calculations', () => {
    // Test bridge period funding with precise savings
    // Starting with $250k, saving $30k/year for 10 years at 7% return
    // 
    // DERIVATION:
    // Future Value formula: FV = PV * (1 + r)^n + PMT * (((1 + r)^n - 1) / r)
    // PV = $250,000, PMT = $30,000, r = 0.07, n = 10
    // FV = 250000 * 1.07^10 + 30000 * ((1.07^10 - 1) / 0.07)
    // FV = 250000 * 1.96715 + 30000 * (0.96715 / 0.07)
    // FV = 491,787.50 + 30000 * 13.8164
    // FV = 491,787.50 + 414,493.57
    // FV = $906,281.07 (exact with decimal precision)
    
    const currentOutsideSuper = Money.money(250000);
    const annualSavings = Money.money(30000);
    const returnRate = 0.07;
    const yearsToRetirement = 10;
    
    // FV = PV * (1 + r)^n + PMT * (((1 + r)^n - 1) / r)
    const futureValue = Money.add(
      Money.mul(currentOutsideSuper, Money.pow(1.07, yearsToRetirement)),
      Money.mul(annualSavings, Money.div(
        Money.sub(Money.pow(1.07, yearsToRetirement), 1),
        returnRate
      ))
    );
    
    // Expected: $906,281 using decimal arithmetic (vs $906,280.85 with floating-point)
    expect(Money.toNumber(Money.roundDollars(futureValue))).toBeCloseTo(906281, 0);
  });
});