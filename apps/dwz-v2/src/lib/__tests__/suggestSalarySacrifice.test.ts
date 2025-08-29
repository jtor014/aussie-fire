import { splitSalarySacrifice } from '../suggestSalarySacrifice';

test('splits across caps greedily', () => {
  expect(splitSalarySacrifice(20_000, [5_000, 18_000])).toEqual([5000, 15000]);
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
  expect(splitSalarySacrifice(10_000, [0, 5_000, 0, 8_000])).toEqual([0, 5000, 0, 5000]);
});

test('exact fit across multiple people', () => {
  expect(splitSalarySacrifice(15_000, [5_000, 10_000])).toEqual([5000, 10000]);
});

test('rounds to nearest dollar', () => {
  expect(splitSalarySacrifice(1000.7, [2000])).toEqual([1001]);
  expect(splitSalarySacrifice(1000.4, [2000])).toEqual([1000]);
});