import { splitSalarySacrifice } from '../suggestSalarySacrifice';

describe('splitSalarySacrifice - backward compatibility (no MTRs)', () => {
  test('splits across caps pro-rata when equal MTRs (default)', () => {
    // Without MTRs, should default to equal MTRs and split pro-rata
    expect(splitSalarySacrifice(20_000, [5_000, 18_000])).toEqual([4348, 15652]);
  });

  test('clamps when budget exceeds caps', () => {
    expect(splitSalarySacrifice(50_000, [10_000, 5_000])).toEqual([10000, 5000]);
  });

  test('zero budget', () => {
    expect(splitSalarySacrifice(0, [10_000, 5_000])).toEqual([0, 0]);
  });

  test('single person gets full allocation up to cap', () => {
    expect(splitSalarySacrifice(15_000, [30_000])).toEqual([15000]);
    expect(splitSalarySacrifice(40_000, [30_000])).toEqual([30000]);
  });

  test('empty caps array', () => {
    expect(splitSalarySacrifice(10_000, [])).toEqual([]);
  });

  test('caps with zero values', () => {
    expect(splitSalarySacrifice(10_000, [0, 5_000, 0, 8_000])).toEqual([0, 3846, 0, 6154]);
  });

  test('exact fit across multiple people', () => {
    expect(splitSalarySacrifice(15_000, [5_000, 10_000])).toEqual([5000, 10000]);
  });

  test('rounds to nearest dollar', () => {
    expect(splitSalarySacrifice(1000.7, [2000])).toEqual([1001]);
    expect(splitSalarySacrifice(1000.4, [2000])).toEqual([1000]);
  });
});

describe('splitSalarySacrifice - MTR priority', () => {
  test('prioritizes higher MTR', () => {
    const result = splitSalarySacrifice(20_000, [30_000, 30_000], [0.47, 0.345]);
    expect(result).toEqual([20000, 0]); // All to higher MTR person
  });

  test('splits pro-rata within equal MTR group', () => {
    const result = splitSalarySacrifice(30_000, [10_000, 20_000], [0.37, 0.37]);
    expect(result).toEqual([10000, 20000]); // Pro-rata by headroom
  });

  test('handles mixed MTRs with partial allocation', () => {
    const result = splitSalarySacrifice(25_000, [10_000, 15_000, 20_000], [0.47, 0.345, 0.19]);
    expect(result).toEqual([10000, 15000, 0]); // Fill highest MTR first, then second
  });

  test('respects cap constraints', () => {
    const result = splitSalarySacrifice(50_000, [5_000, 8_000], [0.47, 0.345]);
    expect(result).toEqual([5000, 8000]); // Capped by headroom despite higher allocation requested
  });
});