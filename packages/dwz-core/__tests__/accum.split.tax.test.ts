import { describe, test, expect } from 'vitest';
import { accumulateUntil } from '../src/solver';
import { Inputs } from '../src/solver';

const baseInput: Inputs = {
  currentAge: 40,
  preserveAge: 60,
  lifeExp: 42,
  outside0: 0,
  super0: 0,
  annualSavings: 50_000, // treat as GROSS deferral capacity
  realReturn: 0, // no growth for simple testing
  bands: [],
  bequest: 0
};

describe('tax-aware savings split', () => {
  test('grossDeferral mode applies MTR to outside and 15% to super', () => {
    const result = accumulateUntil({
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: 0.6,             // desire 30k super gross (capped same)
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15,
        outsideTaxRate: 0.32,
        mode: 'grossDeferral'
      }
    }, 41);

    // With 50k gross at 60% to super: 30k super gross, 20k outside gross
    // Net should be: super 30k*(1-0.15)=25.5k, outside 20k*(1-0.32)=13.6k
    expect(result.super).toBeCloseTo(25_500, 1);
    expect(result.outside).toBeCloseTo(13_600, 1);
  });

  test('netFixed mode (default) preserves backward compatibility', () => {
    const result = accumulateUntil({
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: 0.6,             // desire 30k super gross
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15,
        outsideTaxRate: 0.32,        // should be ignored in netFixed mode
        mode: 'netFixed'
      }
    }, 41);

    // With 50k net at 60% to super: 30k super gross, 20k outside already-net
    // Net should be: super 30k*(1-0.15)=25.5k, outside 20k (untaxed)
    expect(result.super).toBeCloseTo(25_500, 1);
    expect(result.outside).toBeCloseTo(20_000, 1);
  });

  test('concessional cap is respected in grossDeferral mode', () => {
    const result = accumulateUntil({
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: 0.8,             // desire 40k super gross but capped at 25k
        capPerPerson: 25_000,
        eligiblePeople: 1,
        contribTaxRate: 0.15,
        outsideTaxRate: 0.32,
        mode: 'grossDeferral'
      }
    }, 41);

    // With 50k gross and 80% desired to super but capped at 25k:
    // 25k super gross, 25k outside gross
    // Net: super 25k*(1-0.15)=21.25k, outside 25k*(1-0.32)=17k
    expect(result.super).toBeCloseTo(21_250, 1);
    expect(result.outside).toBeCloseTo(17_000, 1);
  });

  test('tax rates are clamped to valid range', () => {
    const result = accumulateUntil({
      ...baseInput,
      preFireSavingsSplit: {
        toSuperPct: 0.5,
        capPerPerson: 30_000,
        eligiblePeople: 1,
        contribTaxRate: -0.1,        // invalid, should clamp to 0
        outsideTaxRate: 1.5,         // invalid, should clamp to 1
        mode: 'grossDeferral'
      }
    }, 41);

    // With clamped rates: contribTax=0, outsideTax=1
    // 25k super gross, 25k outside gross
    // Net: super 25k*(1-0)=25k, outside 25k*(1-1)=0
    expect(result.super).toBeCloseTo(25_000, 1);
    expect(result.outside).toBeCloseTo(0, 1);
  });
});