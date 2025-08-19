/**
 * Partner inputs for couples mode
 */
export function mkPartner({
  name = "You",
  currentAge = 30,
  retireAge = 50,
  income = 100000,
  extraContrib = 0,
  liquidStart = 50000,    // outside super
  superStart = 100000,
  hasPrivateHealth = false,
  hecsBalance = 0,
  dob = null               // optional; enables DOB->preservation mapping later
} = {}) {
  return {
    name, currentAge, retireAge, income, extraContrib,
    liquidStart, superStart, hasPrivateHealth, hecsBalance, dob
  };
}

/**
 * Household wrapper
 */
export function mkHousehold({
  partners = [mkPartner()],
  annualExpenses = 40000,
  dieWithZero = false,
  lifeExpectancy = 90
} = {}) {
  return { partners, annualExpenses, dieWithZero, lifeExpectancy };
}