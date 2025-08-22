import Decimal from 'decimal.js-light';

/**
 * Money utilities for decimal-safe currency arithmetic.
 * 
 * ROUNDING POLICY:
 * - Mode: ROUND_HALF_EVEN (banker's rounding) for fairness over many transactions
 * - When: Only at presentation/display edges, never during intermediate calculations
 * - Precision: Maintain full precision during calculations, round to cents for display
 * 
 * USAGE:
 * - All operations work in dollars (not cents) to match existing codebase
 * - Use toNumber() only at UI boundaries, keep as Decimal during calculations
 * - For display, use formatAUD() which handles rounding automatically
 */

// Configure Decimal for financial calculations with banker's rounding
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN,  // Banker's rounding: 0.5 rounds to nearest even
  toExpNeg: -9,
  toExpPos: 9
});

/**
 * Create a Money instance from a number or string
 * @param {number|string|Decimal} value - The monetary value in dollars
 * @returns {Decimal} A Decimal instance
 */
export function money(value) {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(value);
}

/**
 * Add two or more monetary values
 * @param {...(number|string|Decimal)} values - Values to add
 * @returns {Decimal} Sum of all values
 */
export function add(...values) {
  return values.reduce((sum, val) => sum.plus(money(val)), new Decimal(0));
}

/**
 * Subtract monetary values (a - b - c - ...)
 * @param {number|string|Decimal} minuend - Value to subtract from
 * @param {...(number|string|Decimal)} subtrahends - Values to subtract
 * @returns {Decimal} Result of subtraction
 */
export function sub(minuend, ...subtrahends) {
  return subtrahends.reduce((result, val) => result.minus(money(val)), money(minuend));
}

/**
 * Multiply monetary value by a factor
 * @param {number|string|Decimal} value - Monetary value
 * @param {number|string|Decimal} factor - Multiplication factor
 * @returns {Decimal} Product
 */
export function mul(value, factor) {
  return money(value).times(money(factor));
}

/**
 * Divide monetary value by a divisor
 * @param {number|string|Decimal} value - Monetary value
 * @param {number|string|Decimal} divisor - Divisor
 * @returns {Decimal} Quotient
 */
export function div(value, divisor) {
  if (money(divisor).isZero()) return new Decimal(0);
  return money(value).dividedBy(money(divisor));
}

/**
 * Round to nearest cent (2 decimal places) using banker's rounding
 * @param {number|string|Decimal} value - Value to round
 * @returns {Decimal} Rounded value
 */
export function roundCents(value) {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Round to nearest dollar (0 decimal places) using banker's rounding
 * @param {number|string|Decimal} value - Value to round
 * @returns {Decimal} Rounded value
 */
export function roundDollars(value) {
  return money(value).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);
}

/**
 * Format as AUD currency string
 * @param {number|string|Decimal} value - Value to format
 * @param {boolean} showCents - Whether to show cents (default: false for large amounts)
 * @returns {string} Formatted currency string
 */
export function formatAUD(value, showCents = false) {
  const decimal = money(value);
  const rounded = showCents ? roundCents(decimal) : roundDollars(decimal);
  const number = rounded.toNumber();
  
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  });
  
  return formatter.format(number);
}

/**
 * Convert Decimal to number for display/charting
 * WARNING: Only use at UI boundaries, not during calculations
 * @param {Decimal} value - Decimal value
 * @returns {number} JavaScript number
 */
export function toNumber(value) {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
}

/**
 * Get maximum of monetary values
 * @param {...(number|string|Decimal)} values - Values to compare
 * @returns {Decimal} Maximum value
 */
export function max(...values) {
  if (values.length === 0) return new Decimal(0);
  return values.reduce((maxVal, val) => {
    const current = money(val);
    return current.greaterThan(maxVal) ? current : maxVal;
  }, money(values[0]));
}

/**
 * Get minimum of monetary values
 * @param {...(number|string|Decimal)} values - Values to compare
 * @returns {Decimal} Minimum value
 */
export function min(...values) {
  if (values.length === 0) return new Decimal(0);
  return values.reduce((minVal, val) => {
    const current = money(val);
    return current.lessThan(minVal) ? current : minVal;
  }, money(values[0]));
}

/**
 * Calculate power for compound interest
 * @param {number|string|Decimal} base - Base value (1 + rate)
 * @param {number} exponent - Power to raise to
 * @returns {Decimal} Result
 */
export function pow(base, exponent) {
  return money(base).pow(exponent);
}

/**
 * Check if value is zero or negligible
 * @param {number|string|Decimal} value - Value to check
 * @param {number} epsilon - Threshold for zero (default: 0.01 = 1 cent)
 * @returns {boolean} True if effectively zero
 */
export function isZero(value, epsilon = 0.01) {
  return money(value).abs().lessThanOrEqualTo(epsilon);
}

/**
 * Check if value is positive
 * @param {number|string|Decimal} value - Value to check
 * @returns {boolean} True if positive
 */
export function isPositive(value) {
  return money(value).greaterThan(0);
}

/**
 * Check if value is negative
 * @param {number|string|Decimal} value - Value to check
 * @returns {boolean} True if negative
 */
export function isNegative(value) {
  return money(value).lessThan(0);
}

/**
 * Get absolute value
 * @param {number|string|Decimal} value - Input value
 * @returns {Decimal} Absolute value
 */
export function abs(value) {
  return money(value).abs();
}