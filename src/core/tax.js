import rulesDefault from "../data/au_rules.json";

/** Progressive tax + Medicare + optional MLS + HECS */
export function calcIncomeTax(
  income,
  { hasPrivateHealth = false, hecsDebt = 0 } = {},
  rules = rulesDefault
) {
  const brackets = rules.tax_years["2025_26"];
  let tax = 0;

  for (const b of brackets) {
    const upper = b.max ?? income;
    if (income > b.min) {
      const slice = Math.min(income, upper) - b.min;
      tax += slice * b.rate;
    }
  }

  // Medicare levy
  if (income > rules.medicare.threshold) tax += income * rules.medicare.rate;

  // MLS (tiered; we only model the first tier in V1)
  const mlsTier = rules.mls.find(t => income > t.threshold);
  if (mlsTier && !hasPrivateHealth) tax += income * mlsTier.surcharge;

  // HECS repayment
  tax += calcHecsRepayment(income, hecsDebt, rules);

  return Math.max(0, tax);
}

export function calcHecsRepayment(income, hecsDebt = 0, rules = rulesDefault) {
  if (hecsDebt <= 0) return 0;
  const bracket = rules.hecs_thresholds.find(t => income >= t.min) || { rate: 0 };
  return Math.min(income * bracket.rate, hecsDebt);
}

/** Bracket + Medicare (used for salary sacrifice benefit calc) */
export function getMarginalRate(income, rules = rulesDefault) {
  const brackets = rules.tax_years["2025_26"];
  let base = 0;
  for (const b of brackets) {
    if (income > (b.max ?? Infinity)) base = b.rate;
    else if (income > b.min) { base = b.rate; break; }
  }
  const medicare = income > rules.medicare.threshold ? rules.medicare.rate : 0;
  return base + medicare; // excludes MLS on purpose
}