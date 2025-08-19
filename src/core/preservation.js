import rulesDefault from "../data/au_rules.json";

/**
 * Return preservation age (years) from DOB using rules table.
 * If dob is missing/invalid, fall back to 60 (safe for V1).
 */
export function getPreservationAge(dobISO, rules = rulesDefault) {
  if (!dobISO) return 60;
  const dob = new Date(dobISO);
  if (Number.isNaN(dob.getTime())) return 60;

  // Find the first rule where dob < born_before
  for (const row of rules.preservation_age_table) {
    const cutoff = new Date(row.born_before);
    if (dob < cutoff) return row.age;
  }
  return 60; // default ceiling
}