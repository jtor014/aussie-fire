import { describe, it, expect } from 'vitest';
import { formatCurrencyCompact } from '../src/lib/formatNumber.js';

describe('Compact Currency Formatting', () => {
  it('should format large numbers with compact notation', () => {
    expect(formatCurrencyCompact(1470000)).toBe('$1.47M');
    expect(formatCurrencyCompact(1000000)).toBe('$1.00M');
    expect(formatCurrencyCompact(500000)).toBe('$500.00K');
    expect(formatCurrencyCompact(250000)).toBe('$250.00K');
  });

  it('should format smaller numbers with compact notation', () => {
    expect(formatCurrencyCompact(50000)).toBe('$50.00K');
    expect(formatCurrencyCompact(1000)).toBe('$1.00K');
    expect(formatCurrencyCompact(500)).toBe('$500.00');
  });

  it('should handle edge cases', () => {
    expect(formatCurrencyCompact(0)).toBe('$0.00');
    expect(formatCurrencyCompact(null)).toBe('$0');
    expect(formatCurrencyCompact(undefined)).toBe('$0');
    expect(formatCurrencyCompact(NaN)).toBe('$0');
  });

  it('should format fractional millions and thousands', () => {
    expect(formatCurrencyCompact(1470000)).toBe('$1.47M');
    expect(formatCurrencyCompact(2350000)).toBe('$2.35M');
    expect(formatCurrencyCompact(150500)).toBe('$150.50K');
  });
});