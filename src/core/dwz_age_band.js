/**
 * Die-With-Zero age-band spending solver
 * 
 * Uses binary search to find sustainable spending amount S such that:
 * PV(spending) + PV(bequest) = PV(total_wealth)
 * 
 * Spending varies by age band with multipliers applied to base amount S.
 */
import Decimal from 'decimal.js-light';
import { bandScheduleFor, pvSpendAtR, pvBridgeAtR, pvPostAtR } from './age_bands.js';

// --- helpers & analyzer: constraint explainer functions ---

/** Build a band-multiplier accessor from a bands array. */
export function makeBandAtAge(bands = []) {
  return (age) => {
    for (const b of bands) {
      const start = (b.start ?? b.from ?? 0);
      const end   = (b.end ?? b.to ?? 200);
      const mult  = (b.mult ?? b.multiplier ?? 1);
      if (age >= start && age < end) return mult;
    }
    return 1;
  };
}

/** Banded annuity factor for ages [startAge, endAgeExclusive). */
export function bandedAnnuityFactor({ startAge, endAgeExclusive, bandAtAge, realReturn }) {
  const r = new Decimal(realReturn ?? 0);
  let sum = new Decimal(0);
  for (let a = startAge; a < endAgeExclusive; a += 1) {
    const k = new Decimal(bandAtAge ? bandAtAge(a) : 1);
    if (r.isZero()) {
      sum = sum.plus(k);
    } else {
      const n = new Decimal(a - startAge + 1);
      sum = sum.plus(k.div(r.add(1).pow(n)));
    }
  }
  return sum;
}

/** Discount a value at age X back to age R */
export function discountToAgeR({ valueAtAgeX, R, X, realReturn }) {
  const r = new Decimal(realReturn ?? 0);
  if (r.isZero()) return new Decimal(valueAtAgeX ?? 0);
  const n = new Decimal(Math.max(0, X - R));
  return new Decimal(valueAtAgeX ?? 0).div(r.add(1).pow(n));
}

/**
 * Analyze what binds S* at earliest R under age-band DWZ.
 * Returns { type:'bridge'|'horizon', atAge, sBridgeMax, sTotalMax, epsilon }
 */
export function analyzeBindingConstraint(p) {
  const {
    R, L, preservationAge: P, realReturn,
    bands, bandAtAge: bandAtAgeFn,
    outsideNow, superAtPreservation, sustainableAnnual,
  } = p;

  const bandAtAge = bandAtAgeFn || makeBandAtAge(bands);

  const A_bridge = (R >= P)
    ? new Decimal(0)
    : bandedAnnuityFactor({ startAge: R, endAgeExclusive: P, bandAtAge, realReturn });

  const A_total = bandedAnnuityFactor({ startAge: R, endAgeExclusive: L, bandAtAge, realReturn });

  const PV_super_R = (P <= R)
    ? new Decimal(superAtPreservation ?? 0)
    : discountToAgeR({ valueAtAgeX: superAtPreservation ?? 0, R, X: P, realReturn });

  const outsideD = new Decimal(outsideNow ?? 0);

  const sBridgeMax = A_bridge.isZero()
    ? Infinity  // Return JS number Infinity for no bridge constraint
    : outsideD.div(A_bridge).toNumber();

  const sTotalMax = outsideD.plus(PV_super_R).div(A_total).toNumber();

  const Sstar = new Decimal(sustainableAnnual ?? 0);
  const epsCalc = Sstar.times(0.002);
  const eps = epsCalc.gt(1) ? epsCalc.toNumber() : 1; // $1 or 0.2% of S*

  const bridgeClearlyTighter = (sBridgeMax + eps) < sTotalMax;
  const SnearBridge = Math.abs(Sstar.toNumber() - sBridgeMax) <= eps;

  return {
    type: (bridgeClearlyTighter || SnearBridge) ? 'bridge' : 'horizon',
    atAge: (bridgeClearlyTighter || SnearBridge) ? P : L,
    sBridgeMax: sBridgeMax,
    sTotalMax: sTotalMax,
    epsilon: eps,
  };
}

/**
 * Solve for sustainable spending amount using age-band multipliers
 * @param {Object} params - Parameters object
 * @param {number} params.retirementAge - Target retirement age
 * @param {number} params.lifeExpectancy - Life expectancy
 * @param {Decimal} params.outsideWealth - Outside super wealth at retirement
 * @param {Decimal} params.superWealth - Super wealth at retirement
 * @param {number} params.preservationAge - Super preservation age
 * @param {Decimal} params.realReturn - Real return rate (as decimal)
 * @param {Decimal} params.bequest - Desired bequest amount
 * @returns {Object} Solution with {sustainableAnnual, bands, iterations}
 */
export function solveSustainableSpending({
  retirementAge,
  lifeExpectancy,
  outsideWealth,
  superWealth,
  preservationAge,
  realReturn,
  bequest = new Decimal(0)
}) {
  // Generate spending bands
  const bands = bandScheduleFor(retirementAge, lifeExpectancy);
  
  if (bands.length === 0) {
    return {
      sustainableAnnual: new Decimal(0),
      bands: [],
      iterations: 0
    };
  }
  
  // Binary search bounds
  let low = new Decimal(0);
  let high = new Decimal(1000000); // $1M starting upper bound
  let iterations = 0;
  const maxIterations = 50;
  const tolerance = new Decimal(1); // $1 tolerance
  
  // Expand upper bound if needed
  while (iterations < 10) {
    const testValue = evaluateConstraints(high, bands, {
      retirementAge, lifeExpectancy, outsideWealth, superWealth,
      preservationAge, realReturn, bequest
    });
    
    if (testValue.gte(0)) break; // Found viable upper bound
    high = high.mul(2);
    iterations++;
  }
  
  // Binary search
  while (iterations < maxIterations && high.sub(low).gt(tolerance)) {
    const mid = low.add(high).div(2);
    
    const result = evaluateConstraints(mid, bands, {
      retirementAge, lifeExpectancy, outsideWealth, superWealth,
      preservationAge, realReturn, bequest
    });
    
    if (result.gte(0)) {
      low = mid;
    } else {
      high = mid;
    }
    
    iterations++;
  }
  
  return {
    sustainableAnnual: low,
    bands: bands,
    iterations: iterations
  };
}

/**
 * Evaluate constraint equation: PV(wealth) - PV(spending) - PV(bequest)
 * @param {Decimal} sustainableSpending - Trial spending amount
 * @param {Array} bands - Spending bands
 * @param {Object} params - Other parameters
 * @returns {Decimal} Constraint value (≥0 means feasible)
 */
function evaluateConstraints(sustainableSpending, bands, {
  retirementAge, lifeExpectancy, outsideWealth, superWealth,
  preservationAge, realReturn, bequest
}) {
  // Total present value of spending
  const pvSpend = pvSpendAtR(bands, sustainableSpending, realReturn, retirementAge);
  
  // Present value of bequest
  let pvBequest = new Decimal(0);
  if (bequest.gt(0)) {
    const yearsToLife = lifeExpectancy - retirementAge;
    if (realReturn.isZero()) {
      pvBequest = bequest;
    } else {
      pvBequest = bequest.div(realReturn.add(1).pow(yearsToLife));
    }
  }
  
  // Total available wealth
  const totalWealth = outsideWealth.add(superWealth);
  
  // Constraint: wealth - spending - bequest ≥ 0
  return totalWealth.sub(pvSpend).sub(pvBequest);
}

/**
 * Find earliest possible retirement age given wealth constraints
 * @param {Object} params - Parameters object
 * @param {number} params.currentAge - Current age
 * @param {number} params.maxRetirementAge - Maximum retirement age to consider
 * @param {Decimal} params.currentOutside - Current outside wealth
 * @param {Decimal} params.currentSuper - Current super wealth
 * @param {Decimal} params.annualSavings - Annual savings amount
 * @param {Decimal} params.annualSuperContrib - Annual super contributions
 * @param {Decimal} params.nominalReturn - Nominal return rate
 * @param {Decimal} params.inflation - Inflation rate
 * @param {number} params.lifeExpectancy - Life expectancy
 * @param {number} params.preservationAge - Super preservation age
 * @param {Decimal} params.bequest - Desired bequest
 * @param {Decimal} params.minSpending - Minimum acceptable spending
 * @returns {Object} {earliestAge, sustainableSpending} or {null, 0} if not achievable
 */
export function findEarliestRetirement({
  currentAge,
  maxRetirementAge,
  currentOutside,
  currentSuper,
  annualSavings,
  annualSuperContrib,
  nominalReturn,
  inflation,
  lifeExpectancy,
  preservationAge,
  bequest,
  minSpending = new Decimal(0)
}) {
  const realReturn = nominalReturn.sub(inflation).div(inflation.add(1));
  
  // Try each retirement age from current to max
  for (let retirementAge = currentAge; retirementAge <= maxRetirementAge; retirementAge++) {
    // Project wealth to retirement age
    const yearsToRetirement = retirementAge - currentAge;
    
    let futureOutside, futureSuper;
    if (realReturn.isZero()) {
      futureOutside = currentOutside.add(annualSavings.mul(yearsToRetirement));
      futureSuper = currentSuper.add(annualSuperContrib.mul(yearsToRetirement));
    } else {
      // Future value of current wealth
      const growthFactor = realReturn.add(1).pow(yearsToRetirement);
      futureOutside = currentOutside.mul(growthFactor);
      futureSuper = currentSuper.mul(growthFactor);
      
      // Future value of savings annuity
      if (yearsToRetirement > 0) {
        const annuityFactor = realReturn.add(1).pow(yearsToRetirement).sub(1).div(realReturn);
        futureOutside = futureOutside.add(annualSavings.mul(annuityFactor));
        futureSuper = futureSuper.add(annualSuperContrib.mul(annuityFactor));
      }
    }
    
    // Solve for sustainable spending at this retirement age
    const solution = solveSustainableSpending({
      retirementAge,
      lifeExpectancy,
      outsideWealth: futureOutside,
      superWealth: futureSuper,
      preservationAge,
      realReturn,
      bequest
    });
    
    // Check if this retirement age is viable
    if (solution.sustainableAnnual.gte(minSpending)) {
      return {
        earliestAge: retirementAge,
        sustainableSpending: solution.sustainableAnnual,
        bands: solution.bands
      };
    }
  }
  
  // No viable retirement age found
  return {
    earliestAge: null,
    sustainableSpending: new Decimal(0),
    bands: []
  };
}

/**
 * Check constraint violations for a given retirement scenario
 * @param {Object} params - Same as solveSustainableSpending
 * @param {Decimal} sustainableSpending - The spending amount to test
 * @returns {Object} {bridgeViable, postViable, overall}
 */
export function checkConstraintViolations({
  retirementAge, lifeExpectancy, outsideWealth, superWealth,
  preservationAge, realReturn, bequest, sustainableSpending
}) {
  const bands = bandScheduleFor(retirementAge, lifeExpectancy);
  
  // Bridge period constraint (outside wealth only)
  const bridgeConstraint = pvBridgeAtR(
    outsideWealth, realReturn, retirementAge, preservationAge,
    bands, sustainableSpending
  );
  
  // Post-super constraint (combined wealth)
  const postConstraint = pvPostAtR(
    outsideWealth, superWealth, realReturn, retirementAge,
    preservationAge, lifeExpectancy, bands, sustainableSpending, bequest
  );
  
  return {
    bridgeViable: bridgeConstraint.gte(0),
    postViable: postConstraint.gte(0),
    overall: bridgeConstraint.gte(0) && postConstraint.gte(0)
  };
}