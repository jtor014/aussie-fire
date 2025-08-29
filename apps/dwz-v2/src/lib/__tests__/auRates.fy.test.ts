import { fyFromYearMonth, defaultsForYearMonth } from '../auRates';

describe('auRates FY boundary', () => {
  test('June 2025 is FY 2024-25', () => {
    expect(fyFromYearMonth(2025, 6)).toBe('2024-25');
    const d = defaultsForYearMonth(2025, 6);
    expect(d.sg).toBeCloseTo(0.115, 5);
    expect(d.cap).toBe(30000);
  });

  test('July 2025 is FY 2025-26', () => {
    expect(fyFromYearMonth(2025, 7)).toBe('2025-26');
    const d = defaultsForYearMonth(2025, 7);
    expect(d.sg).toBeCloseTo(0.12, 5);
    expect(d.cap).toBe(30000);
  });

  test('December 2024 is FY 2024-25', () => {
    expect(fyFromYearMonth(2024, 12)).toBe('2024-25');
    const d = defaultsForYearMonth(2024, 12);
    expect(d.sg).toBeCloseTo(0.115, 5);
    expect(d.cap).toBe(30000);
  });

  test('January 2025 is FY 2024-25', () => {
    expect(fyFromYearMonth(2025, 1)).toBe('2024-25');
    const d = defaultsForYearMonth(2025, 1);
    expect(d.sg).toBeCloseTo(0.115, 5);
    expect(d.cap).toBe(30000);
  });

  test('FY boundary edge cases', () => {
    // June 30 (last day of FY 2024-25)
    expect(fyFromYearMonth(2025, 6)).toBe('2024-25');
    
    // July 1 (first day of FY 2025-26)  
    expect(fyFromYearMonth(2025, 7)).toBe('2025-26');
    
    // Test the SG rate increase on July 1, 2025
    const june2025 = defaultsForYearMonth(2025, 6);
    const july2025 = defaultsForYearMonth(2025, 7);
    
    expect(june2025.sg).toBe(0.115); // 11.5%
    expect(july2025.sg).toBe(0.12);  // 12.0%
  });

  test('unknown FY defaults to 2024-25', () => {
    // Test future year not in AU_RATES
    expect(fyFromYearMonth(2030, 8)).toBe('2024-25');
    const d = defaultsForYearMonth(2030, 8);
    expect(d.sg).toBe(0.115);
    expect(d.cap).toBe(30000);
  });

  test('deterministic results (no randomness)', () => {
    // Call multiple times to ensure consistent results
    for (let i = 0; i < 10; i++) {
      expect(fyFromYearMonth(2025, 7)).toBe('2025-26');
      const d = defaultsForYearMonth(2025, 7);
      expect(d.sg).toBe(0.12);
      expect(d.cap).toBe(30000);
    }
  });
});