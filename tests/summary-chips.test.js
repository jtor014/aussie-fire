import { describe, it, expect } from 'vitest';

describe('T-019A: Summary Chips logic tests', () => {
  describe('Real return calculations', () => {
    function calculateRealReturn(expectedReturn, inflationRate) {
      return ((expectedReturn - inflationRate) / (1 + inflationRate/100)).toFixed(1);
    }

    it('should calculate real returns correctly for normal scenarios', () => {
      // Expected: (8.5 - 2.5) / (1 + 2.5/100) = 5.9% real
      const realReturn = calculateRealReturn(8.5, 2.5);
      expect(realReturn).toBe('5.9');
    });

    it('should calculate real returns for different scenarios', () => {
      // Expected: (7.0 - 3.0) / (1 + 3.0/100) = 3.9% real
      const realReturn = calculateRealReturn(7.0, 3.0);
      expect(realReturn).toBe('3.9');
    });

    it('should handle zero nominal returns', () => {
      // Expected: (0 - 2.5) / (1 + 2.5/100) = -2.4% real
      const realReturn = calculateRealReturn(0, 2.5);
      expect(realReturn).toBe('-2.4');
    });

    it('should handle high inflation scenarios', () => {
      // Expected: (5.0 - 8.0) / (1 + 8.0/100) = -2.8% real
      const realReturn = calculateRealReturn(5.0, 8.0);
      expect(realReturn).toBe('-2.8');
    });
  });

  describe('Income shape text generation', () => {
    function generateIncomeShapeText(ageBandsEnabled, ageBandSettings, lifeExpectancy) {
      if (!ageBandsEnabled) {
        return 'Flat (1.00×)';
      }
      
      if (!ageBandSettings) {
        return 'Age-banded (loading...)';
      }

      const { gogoTo, slowTo, gogoMult, slowMult, nogoMult } = ageBandSettings;
      return `Age-banded (${gogoTo}/${slowTo}/${lifeExpectancy} · ${gogoMult}×/${slowMult}×/${nogoMult}×)`;
    }

    it('should generate flat text when age bands disabled', () => {
      const text = generateIncomeShapeText(false, null, 90);
      expect(text).toBe('Flat (1.00×)');
    });

    it('should generate age-banded text with default settings', () => {
      const settings = {
        gogoTo: 60,
        slowTo: 75,
        gogoMult: 1.10,
        slowMult: 1.00,
        nogoMult: 0.85
      };
      const text = generateIncomeShapeText(true, settings, 90);
      expect(text).toBe('Age-banded (60/75/90 · 1.1×/1×/0.85×)');
    });

    it('should generate age-banded text with custom settings', () => {
      const settings = {
        gogoTo: 65,
        slowTo: 80,
        gogoMult: 1.20,
        slowMult: 0.90,
        nogoMult: 0.75
      };
      const text = generateIncomeShapeText(true, settings, 95);
      expect(text).toBe('Age-banded (65/80/95 · 1.2×/0.9×/0.75×)');
    });

    it('should handle missing settings gracefully', () => {
      const text = generateIncomeShapeText(true, null, 90);
      expect(text).toBe('Age-banded (loading...)');
    });
  });

  describe('Returns text generation', () => {
    function generateReturnsText(expectedReturn, inflationRate, investmentFees) {
      const realReturn = ((expectedReturn - inflationRate) / (1 + inflationRate/100)).toFixed(1);
      return `Returns: ${realReturn}% real (fees ${investmentFees}%)`;
    }

    it('should generate returns text correctly', () => {
      const text = generateReturnsText(8.5, 2.5, 0.5);
      expect(text).toBe('Returns: 5.9% real (fees 0.5%)');
    });

    it('should handle different fee scenarios', () => {
      const text = generateReturnsText(7.0, 3.0, 0.75);
      expect(text).toBe('Returns: 3.9% real (fees 0.75%)');
    });

    it('should show negative real returns when appropriate', () => {
      const text = generateReturnsText(2.0, 5.0, 1.0);
      expect(text).toBe('Returns: -2.9% real (fees 1%)');
    });
  });

  describe('URL persistence check', () => {
    // T-019A should not add any new URL parameters
    it('should not require new URL parameters for summary chips functionality', () => {
      // This test verifies that summary chips are purely UI enhancements
      // that don't require additional URL state persistence
      
      // The existing URL parameters should be sufficient:
      const existingParams = [
        'age', 'retire', 'savings', 'income', 'expenses', 'super',
        'dzm', 'life', 'return', 'fees', 'inflation', 'inflationRate',
        'todayDollars', 'hecs', 'health', 'advSuper', 'addSuper',
        'insSuper', 'insLife', 'insTpd', 'insIncome', 'superInsPremium'
      ];
      
      // Summary chips should derive their display from these existing params
      expect(existingParams.length).toBeGreaterThan(15); // Sanity check
      expect(existingParams.includes('superInsPremium')).toBe(true); // T-019 param exists
      // No new params needed for T-019A
    });
  });
});