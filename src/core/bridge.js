import * as Money from "../lib/money.js";
import Decimal from 'decimal.js-light';

/**
 * Compute bridge requirement using age-banded spending schedule
 * Integrates PV of spending from R to preservationAge for outside-funded years only
 * 
 * @param {Object} params
 * @param {number} params.R - Retirement age 
 * @param {number} params.presAge - Preservation age (when super unlocks)
 * @param {Array} params.schedule - Yearly spending schedule [{age, spend}, ...]
 * @param {number} params.outsideAtR - Outside wealth available at retirement
 * @param {number} params.realReturn - Real return rate (decimal, e.g., 0.055)
 * @returns {Object} Bridge assessment {neededPV, havePV, years, covered}
 */
export function computeBridgeRequirement({ R, presAge, schedule, outsideAtR, realReturn }) {
  const bridgeYears = Math.max(0, presAge - R);
  
  if (bridgeYears === 0) {
    // No bridge period needed
    return {
      neededPV: 0,
      havePV: outsideAtR,
      years: 0,
      covered: true
    };
  }
  
  // Calculate PV of spending during bridge period (R to presAge)
  let neededPV = 0;
  const returnRate = new Decimal(realReturn);
  const discountFactor = returnRate.add(1);
  
  for (let i = 0; i < bridgeYears; i++) {
    const ageIdx = R + i;
    const yearSpend = schedule.find(s => s.age === ageIdx)?.spend || 0;
    
    // Discount to present value (at retirement age R)  
    const pvSpend = new Decimal(yearSpend).div(discountFactor.pow(i));
    neededPV += pvSpend.toNumber();
  }
  
  const havePV = outsideAtR;
  const covered = havePV >= neededPV;
  
  return {
    neededPV,
    havePV, 
    years: bridgeYears,
    covered
  };
}

/**
 * Assess whether outside-super funds can cover the years between
 * retirement and preservation age (default 60).
 *
 * Inputs assume yearly steps and a constant real/nominal returnRate
 * that matches how you're rendering (today's dollars vs future).
 */
export function assessBridge({
  currentAge,
  retirementAge,
  preservationAge = 60,
  currentOutsideSuper,      // number
  annualOutsideSavings,     // after-tax savings that go to outside-super before retirement
  annualExpenseNeed,        // household spend (match your UI)
  returnRate,               // real or nominal depending on toggle
  dieWithZero = false,
  spendToZeroAnnual = 0     // optional override of expense need (min'ed below)
}) {
  const yearsToRetirement = retirementAge - currentAge;
  const needsBridge = retirementAge < preservationAge;
  if (!needsBridge) {
    return {
      needsBridge: false,
      bridgeYears: 0,
      fundsNeeded: 0,
      fundsAvailable: 0,
      shortfall: 0,
      feasible: true
    };
  }

  const bridgeYears =
    yearsToRetirement > 0
      ? preservationAge - retirementAge
      : Math.max(0, preservationAge - currentAge);

  // What we need to spend each year during the bridge
  const annualNeed = Money.toNumber(Money.max(
    0,
    dieWithZero && spendToZeroAnnual != null 
      ? Money.min(annualExpenseNeed, spendToZeroAnnual) 
      : Money.money(annualExpenseNeed)
  ));

  // Funds available outside super at the START of the bridge
  let fundsAvailable;
  if (yearsToRetirement > 0) {
    // FV of existing outside-super + savings stream until retirement
    if (returnRate !== 0) {
      const fvCurrent = Money.mul(currentOutsideSuper, Money.pow(1 + returnRate, yearsToRetirement));
      const fvSavings = Money.mul(
        Money.max(0, annualOutsideSavings),
        Money.div(
          Money.sub(Money.pow(1 + returnRate, yearsToRetirement), 1),
          returnRate
        )
      );
      fundsAvailable = Money.toNumber(Money.add(fvCurrent, fvSavings));
    } else {
      fundsAvailable = Money.toNumber(
        Money.add(currentOutsideSuper, Money.mul(Money.max(0, annualOutsideSavings), yearsToRetirement))
      );
    }
  } else {
    // Already retired: use current outside-super as the starting pot
    fundsAvailable = currentOutsideSuper;
  }

  // Present value at the START of the bridge of an n-year spend stream
  let fundsNeeded;
  if (returnRate !== 0) {
    const pvFactor = Money.div(
      Money.sub(1, Money.pow(1 + returnRate, -bridgeYears)),
      returnRate
    );
    fundsNeeded = Money.toNumber(Money.mul(annualNeed, pvFactor));
  } else {
    fundsNeeded = Money.toNumber(Money.mul(annualNeed, bridgeYears));
  }

  const shortfall = Money.toNumber(Money.max(0, Money.sub(fundsNeeded, fundsAvailable)));

  return {
    needsBridge: true,
    bridgeYears,
    fundsNeeded,
    fundsAvailable,
    shortfall,
    feasible: shortfall === 0
  };
}