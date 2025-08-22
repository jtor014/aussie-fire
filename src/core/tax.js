import rulesDefault from "../data/au_rules.json";
import * as Money from "../lib/money.js";

/** Progressive tax + Medicare + optional MLS + HECS */
export function calcIncomeTax(
  income,
  { hasPrivateHealth = false, hecsDebt = 0 } = {},
  rules = rulesDefault
) {
  const brackets = rules.tax_years["2025_26"];
  let tax = Money.money(0);
  const incomeDecimal = Money.money(income);

  for (const b of brackets) {
    const upper = b.max ?? income;
    if (income > b.min) {
      const slice = Money.sub(Money.min(incomeDecimal, upper), b.min);
      tax = Money.add(tax, Money.mul(slice, b.rate));
    }
  }

  // Medicare levy
  if (income > rules.medicare.threshold) {
    tax = Money.add(tax, Money.mul(incomeDecimal, rules.medicare.rate));
  }

  // MLS (tiered; we only model the first tier in V1)
  const mlsTier = rules.mls.find(t => income > t.threshold);
  if (mlsTier && !hasPrivateHealth) {
    tax = Money.add(tax, Money.mul(incomeDecimal, mlsTier.surcharge));
  }

  // HECS repayment
  tax = Money.add(tax, calcHecsRepayment(income, hecsDebt, rules));

  return Money.toNumber(Money.max(0, tax));
}

export function calcHecsRepayment(income, hecsDebt = 0, rules = rulesDefault) {
  if (hecsDebt <= 0) return 0;
  const bracket = rules.hecs_thresholds.find(t => income >= t.min) || { rate: 0 };
  const repayment = Money.mul(income, bracket.rate);
  return Money.toNumber(Money.min(repayment, hecsDebt));
}

/** Bracket + Medicare (used for salary sacrifice benefit calc) */
export function getMarginalRate(income, rules = rulesDefault) {
  const brackets = rules.tax_years["2025_26"];
  let base = Money.money(0);
  for (const b of brackets) {
    if (income > (b.max ?? Infinity)) base = Money.money(b.rate);
    else if (income > b.min) { base = Money.money(b.rate); break; }
  }
  const medicare = income > rules.medicare.threshold ? Money.money(rules.medicare.rate) : Money.money(0);
  return Money.toNumber(Money.add(base, medicare)); // excludes MLS on purpose
}