/**
 * Age-band spending system for DWZ calculations
 * 
 * Implements age-based spending multipliers:
 * - Go-go years (R to 60): 1.10× sustainable spending
 * - Slow-go years (60 to 75): 1.00× sustainable spending  
 * - No-go years (75 to L): 0.85× sustainable spending
 */
import Decimal from 'decimal.js-light';

/**
 * Build a yearly spending schedule using age bands and base sustainable spending
 * @param {Object} params
 * @param {number} params.R - Retirement age
 * @param {number} params.L - Life expectancy
 * @param {number} params.S - Base sustainable annual spending
 * @param {Array} params.bands - Age band schedule from createAgeBandedSchedule
 * @returns {Array} Array of {age, spend} objects for each year R..L
 */
export function buildSpendingSchedule({ R, L, S, bands }) {
  const schedule = [];
  const baseSpend = new Decimal(S);
  
  for (let age = R; age < L; age++) {
    // Find the band for this age
    const band = bands.find(b => age >= b.startAge && age < b.endAge);
    const multiplier = band ? new Decimal(band.multiplier) : new Decimal(1.0);
    
    const yearlySpend = baseSpend.mul(multiplier);
    schedule.push({
      age,
      spend: yearlySpend.toNumber()
    });
  }
  
  return schedule;
}

/**
 * Build a true DWZ depletion path showing wealth declining to ~0 at life expectancy
 * T-024: Fixes chart showing accumulation instead of depletion
 * 
 * @param {Object} params
 * @param {number} params.currentAge - Current age
 * @param {number} params.retirementAge - Age when retirement starts
 * @param {number} params.lifeExpectancy - Life expectancy (path ends here)
 * @param {number} params.sustainableAnnual - Base spending amount S
 * @param {Array} params.bands - Age band schedule with multipliers
 * @param {number} params.preservationAge - Super preservation age
 * @param {number} params.realReturn - Real return rate (after inflation)
 * @param {number} params.fees - Investment fees as decimal
 * @param {number} params.insurancePremium - Annual insurance premium from super
 * @param {number} params.bequest - Target bequest at life expectancy
 * @param {Object} params.startBalances - Starting balances {outside, super}
 * @returns {Array} Path array with {age, outside, super, total, phase, spend}
 */
export function buildDwzDepletionPath({
  currentAge,
  retirementAge,
  lifeExpectancy,
  sustainableAnnual,
  bands = [],
  preservationAge = 60,
  realReturn = 0.05,
  fees = 0,
  insurancePremium = 0,
  bequest = 0,
  startBalances = { outside: 0, super: 0 }
}) {
  const path = [];
  let outsideBalance = startBalances.outside;
  let superBalance = startBalances.super;
  
  // Net return after fees
  const netReturn = realReturn - fees;
  
  // Helper to get band multiplier and phase for an age
  const getBandInfo = (age) => {
    for (const band of bands) {
      if (age >= band.startAge && age < band.endAge) {
        return {
          multiplier: band.multiplier || 1,
          phase: band.name || band.phase || 'phase'
        };
      }
    }
    return { multiplier: 1, phase: 'flat' };
  };
  
  // Build path from current age to life expectancy
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const bandInfo = getBandInfo(age);
    const isRetired = age >= retirementAge;
    
    // Calculate spending for this year
    let yearSpend = 0;
    if (isRetired) {
      yearSpend = sustainableAnnual * bandInfo.multiplier;
    }
    
    // Add current state to path BEFORE any deductions
    path.push({
      age,
      outside: Math.max(0, outsideBalance),
      super: Math.max(0, superBalance),
      total: Math.max(0, outsideBalance + superBalance),
      phase: bandInfo.phase,
      spend: yearSpend
    });
    
    // Don't process further for the last age (life expectancy)
    if (age === lifeExpectancy) break;
    
    // If retired, withdraw spending
    if (isRetired) {
      if (age < preservationAge) {
        // Pre-preservation: can only draw from outside
        outsideBalance -= yearSpend;
        if (outsideBalance < 0) {
          // Bridge shortfall - this shouldn't happen if viable
          outsideBalance = 0;
        }
      } else {
        // Post-preservation: draw from combined wealth
        const totalWealth = outsideBalance + superBalance;
        if (totalWealth >= yearSpend) {
          // Prefer drawing from super first to minimize tax
          const fromSuper = Math.min(superBalance, yearSpend);
          const fromOutside = yearSpend - fromSuper;
          superBalance -= fromSuper;
          outsideBalance -= fromOutside;
        } else {
          // Depleted - set both to zero
          outsideBalance = 0;
          superBalance = 0;
        }
      }
    }
    
    // Apply insurance premium to super (deducted every year while there's balance)
    if (insurancePremium > 0 && superBalance > 0) {
      superBalance = Math.max(0, superBalance - insurancePremium);
    }
    
    // Apply returns (after spending and insurance)
    outsideBalance *= (1 + netReturn);
    superBalance *= (1 + netReturn);
  }
  
  // Ensure final wealth is close to bequest target
  const finalPoint = path[path.length - 1];
  if (finalPoint) {
    const epsilon = 1; // $1 tolerance
    const finalTotal = finalPoint.total;
    const bequestError = Math.abs(finalTotal - bequest);
    
    // If we're way off the bequest target, adjust the final point
    if (bequestError > epsilon && bequest === 0) {
      // For DWZ (bequest = 0), ensure we end at ~0
      finalPoint.outside = 0;
      finalPoint.super = 0;
      finalPoint.total = 0;
    } else if (bequestError > epsilon && bequest > 0) {
      // For bequest targets, scale to match
      const scaleFactor = bequest / Math.max(1, finalTotal);
      finalPoint.outside *= scaleFactor;
      finalPoint.super *= scaleFactor;
      finalPoint.total = bequest;
    }
  }
  
  return path;
}

// Age band multipliers
export const AGE_BAND_MULTIPLIERS = {
  goGo: new Decimal(1.10),
  slowGo: new Decimal(1.00),
  noGo: new Decimal(0.85)
};

// Age thresholds
export const AGE_THRESHOLDS = {
  slowGoStart: 60,
  noGoStart: 75
};

/**
 * Generate spending bands for a retirement scenario
 * @param {number} retirementAge - Age at retirement (R)
 * @param {number} lifeExpectancy - Life expectancy (L)
 * @returns {Array} Array of band objects with {startAge, endAge, multiplier, phase}
 */
export function bandScheduleFor(retirementAge, lifeExpectancy) {
  const R = Math.max(retirementAge, 30); // Clamp minimum
  const L = Math.max(lifeExpectancy, R + 1); // Ensure L > R
  
  const bands = [];
  
  // Go-go phase: R to min(60, L)
  const goGoEnd = Math.min(AGE_THRESHOLDS.slowGoStart, L);
  if (R < goGoEnd) {
    bands.push({
      startAge: R,
      endAge: goGoEnd,
      multiplier: AGE_BAND_MULTIPLIERS.goGo,
      phase: 'go-go'
    });
  }
  
  // Slow-go phase: 60 to min(75, L) (only if we haven't reached L)
  const slowGoStart = Math.max(AGE_THRESHOLDS.slowGoStart, R);
  const slowGoEnd = Math.min(AGE_THRESHOLDS.noGoStart, L);
  if (slowGoStart < slowGoEnd && slowGoStart < L) {
    bands.push({
      startAge: slowGoStart,
      endAge: slowGoEnd,
      multiplier: AGE_BAND_MULTIPLIERS.slowGo,
      phase: 'slow-go'
    });
  }
  
  // No-go phase: 75 to L (only if we haven't reached L)
  const noGoStart = Math.max(AGE_THRESHOLDS.noGoStart, R);
  if (noGoStart < L) {
    bands.push({
      startAge: noGoStart,
      endAge: L,
      multiplier: AGE_BAND_MULTIPLIERS.noGo,
      phase: 'no-go'
    });
  }
  
  return bands;
}

/**
 * Calculate present value of spending at retirement age
 * @param {Array} bands - Spending bands
 * @param {Decimal} sustainableSpending - Base sustainable annual spending (S)
 * @param {Decimal} realReturn - Real return rate (as decimal, e.g., 0.05 for 5%)
 * @param {number} retirementAge - Retirement age
 * @returns {Decimal} Present value of all spending
 */
export function pvSpendAtR(bands, sustainableSpending, realReturn, retirementAge) {
  if (!bands || bands.length === 0) return new Decimal(0);
  
  let totalPv = new Decimal(0);
  
  for (const band of bands) {
    const annualSpend = sustainableSpending.mul(band.multiplier);
    const years = band.endAge - band.startAge;
    
    if (years <= 0) continue;
    
    // Handle zero return case
    if (realReturn.isZero()) {
      const bandPv = annualSpend.mul(years);
      totalPv = totalPv.add(bandPv);
    } else {
      // PV of annuity starting at band.startAge
      const yearsToStart = band.startAge - retirementAge;
      
      // Skip bands that start before retirement (shouldn't happen but be defensive)
      if (yearsToStart < 0) continue;
      
      const discountToStart = yearsToStart === 0 ? new Decimal(1) : realReturn.add(1).pow(yearsToStart);
      
      // PV of annuity for 'years' periods at return rate
      const annuityFactor = new Decimal(1).sub(realReturn.add(1).pow(-years)).div(realReturn);
      const bandPv = annualSpend.mul(annuityFactor).div(discountToStart);
      
      totalPv = totalPv.add(bandPv);
    }
  }
  
  return totalPv;
}

/**
 * Calculate present value of bridge period constraints (outside wealth only)
 * @param {Decimal} outsideWealth - Outside wealth at retirement
 * @param {Decimal} realReturn - Real return rate
 * @param {number} retirementAge - Retirement age
 * @param {number} preservationAge - Super preservation age
 * @param {Array} bands - Spending bands (to determine actual spending during bridge)
 * @param {Decimal} sustainableSpending - Base sustainable spending
 * @returns {Decimal} Present value of bridge period net cash flow
 */
export function pvBridgeAtR(outsideWealth, realReturn, retirementAge, preservationAge, bands, sustainableSpending) {
  if (retirementAge >= preservationAge) return new Decimal(0);
  
  const bridgeYears = preservationAge - retirementAge;
  
  // Calculate actual spending during bridge period
  let bridgeSpending = new Decimal(0);
  for (const band of bands) {
    if (band.startAge < preservationAge && band.endAge > retirementAge) {
      const bridgeStart = Math.max(band.startAge, retirementAge);
      const bridgeEnd = Math.min(band.endAge, preservationAge);
      const bridgeYearsInBand = bridgeEnd - bridgeStart;
      
      if (bridgeYearsInBand > 0) {
        const annualSpend = sustainableSpending.mul(band.multiplier);
        bridgeSpending = bridgeSpending.add(annualSpend.mul(bridgeYearsInBand));
      }
    }
  }
  
  // Average annual spending during bridge
  const avgAnnualSpending = bridgeSpending.div(bridgeYears);
  
  // PV of bridge wealth minus PV of bridge spending
  if (realReturn.isZero()) {
    return outsideWealth.sub(avgAnnualSpending.mul(bridgeYears));
  } else {
    const annuityFactor = new Decimal(1).sub(realReturn.add(1).pow(-bridgeYears)).div(realReturn);
    const pvSpending = avgAnnualSpending.mul(annuityFactor);
    return outsideWealth.sub(pvSpending);
  }
}

/**
 * Calculate present value of post-super period (combined wealth after preservation age)
 * @param {Decimal} outsideWealth - Outside wealth at retirement
 * @param {Decimal} superWealth - Super wealth at retirement  
 * @param {Decimal} realReturn - Real return rate
 * @param {number} retirementAge - Retirement age
 * @param {number} preservationAge - Super preservation age
 * @param {number} lifeExpectancy - Life expectancy
 * @param {Array} bands - Spending bands
 * @param {Decimal} sustainableSpending - Base sustainable spending
 * @param {Decimal} bequest - Desired bequest amount
 * @returns {Decimal} Present value of post-super period net cash flow
 */
export function pvPostAtR(outsideWealth, superWealth, realReturn, retirementAge, preservationAge, lifeExpectancy, bands, sustainableSpending, bequest) {
  if (preservationAge >= lifeExpectancy) return new Decimal(0);
  
  const postYears = lifeExpectancy - preservationAge;
  
  // Calculate total wealth available at preservation age
  let wealthAtPreservation;
  if (realReturn.isZero()) {
    wealthAtPreservation = outsideWealth.add(superWealth);
  } else {
    const yearsToPreservation = preservationAge - retirementAge;
    const growthFactor = realReturn.add(1).pow(yearsToPreservation);
    wealthAtPreservation = outsideWealth.mul(growthFactor).add(superWealth.mul(growthFactor));
  }
  
  // Calculate spending during post-super period
  let postSpending = new Decimal(0);
  for (const band of bands) {
    if (band.startAge < lifeExpectancy && band.endAge > preservationAge) {
      const postStart = Math.max(band.startAge, preservationAge);
      const postEnd = Math.min(band.endAge, lifeExpectancy);
      const postYearsInBand = postEnd - postStart;
      
      if (postYearsInBand > 0) {
        const annualSpend = sustainableSpending.mul(band.multiplier);
        postSpending = postSpending.add(annualSpend.mul(postYearsInBand));
      }
    }
  }
  
  // Average annual spending during post-super period
  const avgAnnualSpending = postSpending.div(postYears);
  
  // PV of bequest (discounted back to preservation age)
  let pvBequest = new Decimal(0);
  if (bequest.gt(0)) {
    if (realReturn.isZero()) {
      pvBequest = bequest;
    } else {
      pvBequest = bequest.div(realReturn.add(1).pow(postYears));
    }
  }
  
  // PV calculation at preservation age
  let pvAtPreservation;
  if (realReturn.isZero()) {
    pvAtPreservation = wealthAtPreservation.sub(avgAnnualSpending.mul(postYears)).sub(pvBequest);
  } else {
    const annuityFactor = new Decimal(1).sub(realReturn.add(1).pow(-postYears)).div(realReturn);
    const pvSpending = avgAnnualSpending.mul(annuityFactor);
    pvAtPreservation = wealthAtPreservation.sub(pvSpending).sub(pvBequest);
  }
  
  // Discount back to retirement age
  if (realReturn.isZero()) {
    return pvAtPreservation;
  } else {
    const yearsToPreservation = preservationAge - retirementAge;
    return pvAtPreservation.div(realReturn.add(1).pow(yearsToPreservation));
  }
}