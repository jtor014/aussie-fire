import rulesDefault from "../data/au_rules.json";

/** SG + extra contributions; returns totals and cap flags */
export function calcSuperContribs(
  income,
  extra = 0,
  insurancePremiums = 0,
  rules = rulesDefault
) {
  const employer = Math.min(income, rules.sg_max_base) * 0.12;
  const total = employer + extra;
  const net = Math.max(0, total - insurancePremiums);
  const cap = rules.concessional_cap;

  return {
    employer,
    additional: extra,
    total,
    net,
    remainingCap: Math.max(0, cap - total),
    isOverCap: total > cap,
    cap
  };
}