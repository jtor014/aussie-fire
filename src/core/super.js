import rulesDefault from "../data/au_rules.json";
import * as Money from "../lib/money.js";

/** SG + extra contributions; returns totals and cap flags */
export function calcSuperContribs(
  income,
  extra = 0,
  insurancePremiums = 0,
  rules = rulesDefault
) {
  const employer = Money.mul(Money.min(income, rules.sg_max_base), 0.12);
  const total = Money.add(employer, extra);
  const net = Money.max(0, Money.sub(total, insurancePremiums));
  const cap = Money.money(rules.concessional_cap);

  return {
    employer: Money.toNumber(employer),
    additional: extra,
    total: Money.toNumber(total),
    net: Money.toNumber(net),
    remainingCap: Money.toNumber(Money.max(0, Money.sub(cap, total))),
    isOverCap: Money.toNumber(total) > rules.concessional_cap,
    cap: rules.concessional_cap
  };
}