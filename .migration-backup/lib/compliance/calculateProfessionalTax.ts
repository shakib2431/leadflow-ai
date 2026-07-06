export interface PTSlab {
  min_earnings: number;
  max_earnings: number; // Use Infinity for the highest bracket
  tax_amount: number;
}

/**
 * Calculates Professional Tax based on state-specific slab rules.
 * The slabs are dynamic and passed in from the compliance_rules JSONB column.
 */
export function calculateProfessionalTax(
  grossEarnings: number,
  isApplicable: boolean,
  stateSlabs: PTSlab[] | null // Null if the state does not levy PT (e.g., Delhi)
): number {
  // If not applicable, or if the state has no PT rules, return 0.
  if (!isApplicable || !stateSlabs || stateSlabs.length === 0) {
    return 0;
  }

  // Iterate through the state's slabs to find where the gross earnings fall
  for (const slab of stateSlabs) {
    if (grossEarnings >= slab.min_earnings && grossEarnings <= slab.max_earnings) {
      return slab.tax_amount;
    }
  }

  // Fallback in case of malformed slab data (should theoretically never hit)
  return 0;
}