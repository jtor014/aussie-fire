import rulesDefault from "../data/au_rules.json";
import { calcIncomeTax, getMarginalRate } from "./tax";
import { calcSuperContribs } from "./super";
import { assessBridge } from "./bridge";
import { getPreservationAge } from "./preservation";

/**
 * Assumptions bundle to match your component toggles
 * { returnRate, swr, showInTodaysDollars, spendToZeroAnnual? }
 */
export function projectCouple({
  household,            // mkHousehold()
  assumptions,          // { returnRate, swr, showInTodaysDollars }
  rules = rulesDefault
}) {
  const P = household.partners;
  if (!P.length) throw new Error("Need at least one partner");

  // Determine simulation bounds
  const minStartAge = Math.min(...P.map(p => p.currentAge));
  const maxHorizonAge = household.lifeExpectancy; // simple horizon
  const returnRate = assumptions.returnRate;      // already real or nominal per UI
  const swr = assumptions.swr / 100;

  // Precompute preservation ages
  const preservation = P.map(p => p.dob ? getPreservationAge(p.dob, rules) : 60);

  // Running balances (household totals, but we track partner supers too for future)
  let outsideSuper = P.reduce((a,p)=>a + p.liquidStart, 0);
  let superBalances = P.map(p => p.superStart);

  // First, assess bridge feasibility at the EARLIEST retirement
  const earliestRet = Math.min(...P.map(p => p.retireAge));
  const annualOutsideSavingsNow = P.reduce((sum, p) => {
    if (p.currentAge >= p.retireAge) return sum; // already retired -> no saving
    // current-year after-tax saving estimate
    const tax = calcIncomeTax(p.income, { hasPrivateHealth: p.hasPrivateHealth, hecsDebt: p.hecsBalance }, rules);
    const afterTaxIncome = Math.max(0, p.income - tax);
    // Household expenses are shared; a single-person estimate would over-assign.
    // We'll use a crude 50/50 split for the *pre*retirement savings signal:
    const perPersonSpend = household.annualExpenses / Math.max(1, P.length);
    return sum + Math.max(0, afterTaxIncome - perPersonSpend);
  }, 0);

  const bridge = assessBridge({
    currentAge: minStartAge,
    retirementAge: earliestRet,
    preservationAge: Math.min(...preservation),
    currentOutsideSuper: outsideSuper,
    annualOutsideSavings: Math.max(0, annualOutsideSavingsNow),
    annualExpenseNeed: household.annualExpenses,
    returnRate,
    dieWithZero: household.dieWithZero,
    spendToZeroAnnual: 0
  });

  // Yearly simulation (shared timeline on min age)
  const series = [];
  for (let age = minStartAge; age <= Math.max(maxHorizonAge, minStartAge + 70); age++) {
    // Ages this year
    const ages = P.map(p => age - (minStartAge - p.currentAge));

    // Working incomes & super contributions for any partner still working
    let incomeThisYear = 0;
    let contribsThisYear = Array(P.length).fill(0);

    P.forEach((p, i) => {
      const a = ages[i];
      if (a < p.retireAge) {
        incomeThisYear += p.income;
        const contrib = calcSuperContribs(
          p.income,
          p.extraContrib,
          0, // premiums handled separately below
          rules
        );
        
        // V1 simplification—premiums reduce net super inflow
        const prem = p.hasInsuranceInSuper
          ? (p.insurancePremiums?.life || 0) + (p.insurancePremiums?.tpd || 0) + (p.insurancePremiums?.income || 0)
          : 0;
        
        const netSuperIn = Math.max(0, contrib.net - prem);
        contribsThisYear[i] = netSuperIn;
        superBalances[i] += netSuperIn; // add before growth
      }
    });

    // Taxes (simple: compute on each working partner independently)
    const totalTax = P.reduce((sum, p, i) => {
      const a = ages[i];
      if (a < p.retireAge) {
        return sum + calcIncomeTax(p.income, { hasPrivateHealth: p.hasPrivateHealth, hecsDebt: p.hecsBalance }, rules);
      }
      return sum;
    }, 0);

    const afterTaxIncome = Math.max(0, incomeThisYear - totalTax);

    // Household spend
    const spend = household.annualExpenses;

    if (incomeThisYear > 0) {
      // Working years (at least one partner working): add surplus to outsideSuper
      const surplus = Math.max(0, afterTaxIncome - spend);
      outsideSuper += surplus;
    } else {
      // Both retired: withdraw from assets
      let need = spend;
      // If at least one partner has reached preservation age, can tap super
      const anyPresOpen = ages.some((a, i) => a >= preservation[i]);
      if (!anyPresOpen) {
        // outside only
        outsideSuper = Math.max(0, outsideSuper - need);
      } else {
        // proportional draw across outside + total super
        const totalSuper = superBalances.reduce((a,b)=>a+b,0);
        const totalWealth = outsideSuper + totalSuper;
        if (totalWealth > 0) {
          const outTake = need * (outsideSuper / totalWealth);
          const supTake = need * (totalSuper / totalWealth);
          outsideSuper = Math.max(0, outsideSuper - outTake);

          // proportional across partner supers
          superBalances = superBalances.map(bal => {
            const part = totalSuper > 0 ? (bal / totalSuper) * supTake : 0;
            return Math.max(0, bal - part);
          });
        }
      }
    }

    // Apply growth after flows
    outsideSuper *= (1 + returnRate);
    superBalances = superBalances.map(b => b * (1 + returnRate));

    series.push({
      yearIndex: age - minStartAge,
      age,                  // household timeline anchor
      ages,                 // per partner ages
      outsideSuper,
      superBalances: [...superBalances],
      totalWealth: outsideSuper + superBalances.reduce((a,b)=>a+b,0),
      incomeThisYear,
      afterTaxIncome,
      spend,
    });
  }

  // Summary at earliest retirement
  const atEarliest = series.find(s => s.age === earliestRet) || series[0];
  const wealthAtRet = atEarliest.totalWealth;
  const swrWithdrawal = wealthAtRet * swr;
  const basicFeasible = swrWithdrawal >= household.annualExpenses;

  return {
    series,
    summary: {
      earliestRetirement: earliestRet,
      wealthAtRetirement: wealthAtRet,
      swrWithdrawal,
      canRetire: basicFeasible && (bridge.feasible ?? true),
      bridge,
    }
  };
}

/**
 * Lightweight helper if you only need the top-line "can retire?" check right now.
 */
export function summarizeCoupleQuick({ household, assumptions, rules = rulesDefault }) {
  return projectCouple({ household, assumptions, rules }).summary;
}