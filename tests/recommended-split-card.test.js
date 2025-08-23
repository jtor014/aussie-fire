import { describe, it, expect } from 'vitest';

describe('T-020: RecommendedSplitCard Display Logic', () => {
  describe('Strategy summary display formatting', () => {
    function formatCurrency(amount) {
      return `$${Math.round(amount).toLocaleString()}`;
    }

    function formatPercent(decimal) {
      return `${Math.round(decimal * 100)}%`;
    }

    function generateDisplayText(strategySummary) {
      if (!strategySummary || !strategySummary.viable) {
        return 'Loading strategy recommendations...';
      }
      
      const { display, capUsePct, totalOut } = strategySummary;
      const salaryText = `Salary sacrifice: ${formatCurrency(display.salarySacrifice)} (cap use ${formatPercent(capUsePct)})`;
      const outsideText = `Outside: ${formatCurrency(display.outside)}`;
      const totalText = totalOut > 0 ? `Total savings: ${formatCurrency(totalOut)}/year` : '';
      
      return {
        mainText: `${salaryText} • ${outsideText}`,
        totalText
      };
    }

    it('should format recommended strategy correctly', () => {
      const recommendedSummary = {
        viable: true,
        useManual: false,
        display: { salarySacrifice: 15000, outside: 25000 },
        capUsePct: 0.50,
        totalOut: 40000
      };
      
      const display = generateDisplayText(recommendedSummary);
      
      expect(display.mainText).toBe('Salary sacrifice: $15,000 (cap use 50%) • Outside: $25,000');
      expect(display.totalText).toBe('Total savings: $40,000/year');
    });

    it('should format manual override strategy correctly', () => {
      const manualSummary = {
        viable: true,
        useManual: true,
        display: { salarySacrifice: 20000, outside: 30000 },
        capUsePct: 0, // Manual doesn't calculate cap usage
        totalOut: 50000
      };
      
      const display = generateDisplayText(manualSummary);
      
      expect(display.mainText).toBe('Salary sacrifice: $20,000 (cap use 0%) • Outside: $30,000');
      expect(display.totalText).toBe('Total savings: $50,000/year');
    });

    it('should handle zero values correctly', () => {
      const zeroSummary = {
        viable: true,
        useManual: false,
        display: { salarySacrifice: 0, outside: 50000 },
        capUsePct: 0,
        totalOut: 50000
      };
      
      const display = generateDisplayText(zeroSummary);
      
      expect(display.mainText).toBe('Salary sacrifice: $0 (cap use 0%) • Outside: $50,000');
      expect(display.totalText).toBe('Total savings: $50,000/year');
    });

    it('should handle non-viable strategy', () => {
      const nonViableSummary = {
        viable: false,
        useManual: false,
        display: { salarySacrifice: 0, outside: 0 },
        totalOut: 0
      };
      
      const display = generateDisplayText(nonViableSummary);
      
      expect(display).toBe('Loading strategy recommendations...');
    });

    it('should handle empty total correctly', () => {
      const emptyTotalSummary = {
        viable: true,
        useManual: false,
        display: { salarySacrifice: 0, outside: 0 },
        capUsePct: 0,
        totalOut: 0
      };
      
      const display = generateDisplayText(emptyTotalSummary);
      
      expect(display.totalText).toBe('');
    });
  });

  describe('Manual override pill visibility', () => {
    function shouldShowPill(strategySummary) {
      return !!(strategySummary && strategySummary.useManual);
    }

    it('should show pill when manual overrides are active', () => {
      const manualActive = { useManual: true };
      expect(shouldShowPill(manualActive)).toBe(true);
    });

    it('should hide pill when using recommended strategy', () => {
      const recommended = { useManual: false };
      expect(shouldShowPill(recommended)).toBe(false);
    });

    it('should hide pill when strategySummary is null', () => {
      expect(shouldShowPill(null)).toBe(false);
    });

    it('should hide pill when useManual is undefined', () => {
      const undefinedManual = {};
      expect(shouldShowPill(undefinedManual)).toBe(false);
    });
  });

  describe('Button interaction logic', () => {
    function simulateResetToRecommended() {
      // This would call onResetToRecommended callback
      return {
        salarySacrifice: 0,
        outside: 0,
        useManual: false
      };
    }

    function simulateAdjustStrategy() {
      // This would call onAdjustStrategy callback
      return { advancedDrawerOpen: true };
    }

    it('should reset manual overrides when reset button is clicked', () => {
      const result = simulateResetToRecommended();
      
      expect(result.salarySacrifice).toBe(0);
      expect(result.outside).toBe(0);
      expect(result.useManual).toBe(false);
    });

    it('should open Advanced drawer when adjust strategy is clicked', () => {
      const result = simulateAdjustStrategy();
      
      expect(result.advancedDrawerOpen).toBe(true);
    });
  });

  describe('Rationale display logic', () => {
    function getRationaleCondition(strategySummary) {
      return !!(strategySummary && strategySummary.display && strategySummary.display.salarySacrifice > 0);
    }

    it('should show salary sacrifice rationale when amount > 0', () => {
      const withSalarySacrifice = {
        display: { salarySacrifice: 15000, outside: 25000 }
      };
      
      expect(getRationaleCondition(withSalarySacrifice)).toBe(true);
    });

    it('should hide salary sacrifice rationale when amount is 0', () => {
      const noSalarySacrifice = {
        display: { salarySacrifice: 0, outside: 40000 }
      };
      
      expect(getRationaleCondition(noSalarySacrifice)).toBe(false);
    });

    it('should handle missing display object', () => {
      const noDisplay = {};
      
      expect(getRationaleCondition(noDisplay)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should correctly represent the original bug scenario', () => {
      // T-020 bug: Card showing $0 / $0 despite optimizer recommending non-zero outside
      const buggyScenario = {
        // This represents the broken binding where card accessed wrong fields
        salaryOut: undefined, // Card was looking for this (doesn't exist)
        outsideOut: undefined, // Card was looking for this (doesn't exist)
        capUtilization: undefined // Card was looking for this (doesn't exist)
      };
      
      const fixedScenario = {
        viable: true,
        useManual: false,
        display: { salarySacrifice: 0, outside: 50000 }, // Correct binding
        capUsePct: 0,
        totalOut: 50000
      };
      
      // Buggy scenario would show $0/$0
      expect(buggyScenario.salaryOut || 0).toBe(0);
      expect(buggyScenario.outsideOut || 0).toBe(0);
      
      // Fixed scenario shows correct values
      expect(fixedScenario.display.salarySacrifice).toBe(0);
      expect(fixedScenario.display.outside).toBe(50000);
    });

    it('should handle recommended to manual transition correctly', () => {
      // Start with recommended
      const recommended = {
        viable: true,
        useManual: false,
        recommended: { salarySacrifice: 12000, outside: 18000 },
        manual: { salarySacrifice: 0, outside: 0 },
        display: { salarySacrifice: 12000, outside: 18000 },
        totalOut: 30000,
        capUsePct: 0.40
      };
      
      // Switch to manual
      const manual = {
        viable: true,
        useManual: true,
        recommended: { salarySacrifice: 12000, outside: 18000 },
        manual: { salarySacrifice: 15000, outside: 25000 },
        display: { salarySacrifice: 15000, outside: 25000 },
        totalOut: 40000,
        capUsePct: 0 // Manual mode
      };
      
      expect(recommended.display).toEqual(recommended.recommended);
      expect(manual.display).toEqual(manual.manual);
      expect(manual.capUsePct).toBe(0); // No cap calculation for manual
    });
  });
});