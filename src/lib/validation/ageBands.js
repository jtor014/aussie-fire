/**
 * Age band settings validation and normalization
 * Ensures ordering: R ≤ gogoTo < slowTo < L
 * Clamps multipliers to [0.50, 1.50]
 */

/**
 * Normalize and validate age band settings
 * @param {Object} params
 * @param {number} params.R - Retirement age
 * @param {number} params.L - Life expectancy
 * @param {Object} params.settings - Raw band settings
 * @returns {Object} { settings: normalizedSettings, warnings: string[] }
 */
export function normalizeBandSettings({ R, L, settings }) {
  const warnings = [];
  let { gogoTo, slowTo, gogoMult, slowMult, nogoMult } = settings;

  // Clamp multipliers to [0.50, 1.50]
  const clampMult = (mult, name) => {
    const clamped = Math.max(0.50, Math.min(1.50, mult));
    if (Math.abs(clamped - mult) > 0.001) {
      warnings.push(`${name} multiplier clamped to ${clamped.toFixed(2)}× (was ${mult.toFixed(2)}×)`);
    }
    return clamped;
  };

  gogoMult = clampMult(gogoMult, 'Go-go');
  slowMult = clampMult(slowMult, 'Slow-go'); 
  nogoMult = clampMult(nogoMult, 'No-go');

  // Ensure age ordering: R ≤ gogoTo < slowTo < L
  let ageAdjusted = false;

  // Ensure gogoTo is at least R
  if (gogoTo < R) {
    gogoTo = R;
    ageAdjusted = true;
  }

  // Ensure slowTo > gogoTo
  if (slowTo <= gogoTo) {
    slowTo = gogoTo + 1;
    ageAdjusted = true;
  }

  // Ensure slowTo < L (leave at least 1 year for no-go)
  if (slowTo >= L) {
    slowTo = L - 1;
    ageAdjusted = true;
  }

  // Final check: if gogoTo >= slowTo after adjustment, fix it
  if (gogoTo >= slowTo) {
    gogoTo = Math.max(R, slowTo - 1);
    ageAdjusted = true;
  }

  if (ageAdjusted) {
    warnings.push('Adjusted ages to keep bands ordered (Go-go < Slow-go < Life expectancy)');
  }

  return {
    settings: {
      gogoTo,
      slowTo,
      gogoMult,
      slowMult,
      nogoMult
    },
    warnings
  };
}

/**
 * Create a flat spending schedule (all 1.00x multiplier)
 * @param {number} R - Retirement age
 * @param {number} L - Life expectancy
 * @returns {Array} Band schedule with single flat band
 */
export function createFlatSchedule(R, L) {
  if (R >= L) return [];
  
  return [{
    name: 'Flat',
    from: R,
    to: L,
    startAge: R,
    endAge: L,
    multiplier: 1.00
  }];
}

/**
 * Create age-banded schedule from validated settings
 * @param {number} R - Retirement age
 * @param {number} L - Life expectancy
 * @param {Object} settings - Validated band settings
 * @returns {Array} Band schedule
 */
export function createAgeBandedSchedule(R, L, settings) {
  const { gogoTo, slowTo, gogoMult, slowMult, nogoMult } = settings;
  const bands = [];

  // Go-go phase (R to gogoTo)
  if (R < gogoTo) {
    bands.push({
      name: 'Go-go',
      from: R,
      to: gogoTo,
      startAge: R,
      endAge: gogoTo,
      multiplier: gogoMult
    });
  }

  // Slow-go phase (gogoTo to slowTo)
  if (gogoTo < slowTo) {
    bands.push({
      name: 'Slow-go', 
      from: gogoTo,
      to: slowTo,
      startAge: gogoTo,
      endAge: slowTo,
      multiplier: slowMult
    });
  }

  // No-go phase (slowTo to L)
  if (slowTo < L) {
    bands.push({
      name: 'No-go',
      from: slowTo,
      to: L,
      startAge: slowTo,
      endAge: L,
      multiplier: nogoMult
    });
  }

  return bands;
}