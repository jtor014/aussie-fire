import { calcIncomeTax } from '../core/tax.js';
import { calcSuperContribs } from '../core/super.js';
import { dwzFromSingleState, maxSpendDWZSingle, maxSpendDWZSingleWithConstraint, earliestFireAgeDWZSingle } from '../core/dwz_single.js';
import { assessBridge } from '../core/bridge.js';
import * as Money from '../lib/money.js';

/**
 * Centralised KPI selector for Australian FIRE Calculator
 * 
 * This pure function computes all derived KPIs from the current state,
 * ensuring that changes to lifeExpectancy, retirementAge, or other inputs
 * immediately propagate to all dependent calculations.
 * 
 * @param {Object} state - Current application state
 * @param {Object} rules - Australian tax/super rules
 * @returns {Object} Complete KPI tuple with all derived metrics
 */
export function kpisFromState(state, rules) {
  const {
    // Core demographics
    currentAge,
    retirementAge,
    lifeExpectancy,
    
    // Financial inputs
    currentSavings,
    currentSuper,
    annualIncome,
    annualExpenses,
    
    // Tax & super inputs
    hecsDebt = 0,
    hasPrivateHealth = false,
    additionalSuperContributions = 0,
    hasInsuranceInSuper = false,
    insurancePremiums = { life: 0, tpd: 0, income: 0 },
    
    // Investment assumptions
    expectedReturn = 8.5,
    investmentFees = 0.5,
    // safeWithdrawalRate removed in DWZ-only mode
    inflationRate = 2.5,
    adjustForInflation = true,
    
    // Mode flags (T-015: DWZ-only mode)
    dieWithZeroMode = true,
    planningAs = 'single',
    
    // Partner data (couples mode)
    partnerB = {}
  } = state;

  // === Core Calculations ===
  const yearsToRetirement = retirementAge - currentAge;
  const isAlreadyRetired = yearsToRetirement <= 0;
  
  // Tax calculation
  const tax = calcIncomeTax(annualIncome, {
    hasPrivateHealth,
    hecsDebt
  }, rules);
  const afterTaxIncome = annualIncome - tax;
  const annualSavings = afterTaxIncome - annualExpenses;
  
  // Super contributions
  const totalInsurancePremiums = hasInsuranceInSuper 
    ? (insurancePremiums.life || 0) + (insurancePremiums.tpd || 0) + (insurancePremiums.income || 0)
    : 0;
  
  const superContribs = calcSuperContribs(
    annualIncome,
    additionalSuperContributions,
    totalInsurancePremiums,
    rules
  );
  
  // Investment returns
  const nominalReturn = expectedReturn / 100;
  const realReturn = adjustForInflation 
    ? ((1 + nominalReturn) / (1 + inflationRate / 100) - 1)
    : nominalReturn;
  const netReturn = realReturn - (investmentFees / 100);
  const returnRate = netReturn;
  
  // === FIRE Number removed in DWZ-only mode ===
  // DWZ uses sustainable spending instead of fixed withdrawal rate
  
  // === Wealth Projections ===
  let totalWealthAtRetirement = 0;
  if (!isAlreadyRetired) {
    // Outside super growth
    const outsideSuperAtRetirement = Money.toNumber(
      Money.add(
        Money.mul(currentSavings, Money.pow(1 + returnRate, yearsToRetirement)),
        Money.mul(
          Math.max(0, annualSavings),
          returnRate === 0 
            ? yearsToRetirement
            : Money.div(Money.sub(Money.pow(1 + returnRate, yearsToRetirement), 1), returnRate)
        )
      )
    );
    
    // Super growth
    const superAtRetirement = Money.toNumber(
      Money.add(
        Money.mul(currentSuper, Money.pow(1 + returnRate, yearsToRetirement)),
        Money.mul(
          superContribs.net,
          returnRate === 0
            ? yearsToRetirement  
            : Money.div(Money.sub(Money.pow(1 + returnRate, yearsToRetirement), 1), returnRate)
        )
      )
    );
    
    totalWealthAtRetirement = outsideSuperAtRetirement + superAtRetirement;
  } else {
    totalWealthAtRetirement = currentSavings + currentSuper;
  }
  
  // === Status vs Plan ===
  // Status based on expenses coverage in DWZ-only mode
  const annualNeed = Money.toNumber(annualExpenses);
  const estimatedSustainableSpend = Math.min(totalWealthAtRetirement * 0.04, annualNeed); // Simple estimate
  const statusVsPlan = estimatedSustainableSpend >= annualNeed ? 'On Track' : 'Behind';
  const shortfall = Math.max(0, annualNeed - estimatedSustainableSpend);
  
  // === Die With Zero Calculations ===
  let sustainableSpend = annualExpenses;
  let earliestFireAge = null;
  let bindingConstraint = null;
  
  // T-015: Always compute DWZ values (DWZ-only mode)
  {
    // Use simple annuity calculation for predictable life expectancy reactivity
    const retirementYears = lifeExpectancy - retirementAge;
    if (retirementYears > 0 && !isAlreadyRetired) {
      const r = returnRate;
      if (r === 0) {
        sustainableSpend = totalWealthAtRetirement / retirementYears;
      } else {
        const factor = Money.div(r, Money.sub(1, Money.pow(1 + r, -retirementYears)));
        sustainableSpend = Money.toNumber(Money.mul(totalWealthAtRetirement, factor));
      }
    } else if (isAlreadyRetired) {
      const yearsLeft = lifeExpectancy - currentAge;
      if (yearsLeft > 0) {
        const currentWealth = currentSavings + currentSuper;
        const r = returnRate;
        if (r === 0) {
          sustainableSpend = currentWealth / yearsLeft;
        } else {
          const factor = Money.div(r, Money.sub(1, Money.pow(1 + r, -yearsLeft)));
          sustainableSpend = Money.toNumber(Money.mul(currentWealth, factor));
        }
      }
    }
    
    // Try DWZ engine for detailed constraint analysis (if single mode)
    if (planningAs === 'single') {
      const assumptions = {
        nominalReturnOutside: expectedReturn / 100,
        nominalReturnSuper: expectedReturn / 100,
        inflation: inflationRate / 100
      };
      
      const dwzParams = dwzFromSingleState({
        currentAge,
        longevity: lifeExpectancy,
        liquidStart: currentSavings,
        superStart: currentSuper,
        income: annualIncome,
        extraSuper: additionalSuperContributions
      }, assumptions, rules);
      
      // Get sustainable spend with constraint information
      const dwzResult = maxSpendDWZSingleWithConstraint(dwzParams, retirementAge, lifeExpectancy);
      sustainableSpend = dwzResult.spend;
      bindingConstraint = dwzResult.constraint;
      
      // Earliest possible FIRE age
      earliestFireAge = earliestFireAgeDWZSingle(dwzParams, annualExpenses, lifeExpectancy);
    }
  }
  
  // === Bridge Period Assessment ===
  // T-015: Always use earliest fire age if available (DWZ-only mode)
  const effectiveRetirementAge = earliestFireAge || retirementAge;
  
  const bridgeAssessment = assessBridge({
    currentAge,
    retirementAge: effectiveRetirementAge,
    preservationAge: rules.preservation_age || 60,
    currentOutsideSuper: currentSavings,
    annualOutsideSavings: Math.max(0, annualSavings),
    annualExpenseNeed: sustainableSpend,
    returnRate,
    dieWithZero: true,
    spendToZeroAnnual: sustainableSpend
  });
  
  // === Annual Savings Rate ===
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;
  
  // === Bridge Years Calculation (T-015) ===
  const preservationAge = rules.preservation_age || 60;
  const bridgeYears = Math.max(0, preservationAge - effectiveRetirementAge);
  const yearsToFreedom = Math.max(0, effectiveRetirementAge - currentAge);
  
  // === Return Complete KPI Tuple ===
  return {
    // Core financial metrics
    tax,
    afterTaxIncome,
    annualSavings,
    savingsRate,
    
    // Super metrics
    superContribs,
    totalInsurancePremiums,
    
    // FIRE metrics
    // fireNumber removed in DWZ-only mode
    totalWealthAtRetirement,
    statusVsPlan,
    shortfall,
    
    // DWZ metrics
    sustainableSpend,
    earliestFireAge,
    bindingConstraint,
    
    // Bridge metrics
    bridgeAssessment,
    bridgeYears,
    yearsToFreedom,
    
    // Investment metrics
    realReturn,
    netReturn,
    returnRate,
    
    // Derived flags
    isAlreadyRetired,
    yearsToRetirement
  };
}

/**
 * Convenience function to extract just the key KPIs for display cards
 */
export function extractDisplayKpis(kpis) {
  return {
    sustainableSpend: Money.formatAUD(kpis.sustainableSpend),
    statusVsPlan: kpis.statusVsPlan,
    earliestFireAge: kpis.earliestFireAge,
    // fireNumber removed in DWZ-only mode
    totalWealthAtRetirement: Money.formatAUD(kpis.totalWealthAtRetirement),
    shortfall: Money.formatAUD(kpis.shortfall),
    savingsRate: `${kpis.savingsRate.toFixed(1)}%`,
    bridgeFeasible: kpis.bridgeAssessment.feasible
  };
}