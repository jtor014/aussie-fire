import Decimal from 'decimal.js-light';

/**
 * Shared constants for the Australian FIRE Calculator
 */

// T-023: Epsilon tolerance for bridge cash calculations
// Prevents "Need $0... Short" contradictions from rounding errors
export const EPSILON_CASH = new Decimal(1);

// Other shared constants can be added here
export const DEFAULT_REAL_RETURN = 0.05;
export const DEFAULT_INFLATION = 0.025;
export const PRESERVATION_AGE_DEFAULT = 60;