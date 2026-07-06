export interface ESIResult {
  employeeContribution: number;
  employerContribution: number;
  isCalculated: boolean;
}

/**
 * Calculates Employee's State Insurance (ESI) contributions.
 * Eligibility is determined against the adjusted wage base.
 * Statutory rule: Contributions must be rounded UP to the next higher Rupee.
 */
export function calculateESI(
  adjustedWageBase: number,
  isApplicable: boolean,
  esiThreshold: number, // e.g., 21000 (fetched from compliance_rules)
  esiEmployeeRate: number, // e.g., 0.0075 (0.75%)
  esiEmployerRate: number // e.g., 0.0325 (3.25%)
): ESIResult {
  // ESI doesn't apply if opted out, or if the adjusted wage base crosses the statutory threshold
  if (!isApplicable || adjustedWageBase > esiThreshold || adjustedWageBase <= 0) {
    return {
      employeeContribution: 0,
      employerContribution: 0,
      isCalculated: false,
    };
  }

  // Statutory rule: ESI amounts are always rounded UP to the next Rupee (Math.ceil)
  const employeeContribution = Math.ceil(adjustedWageBase * esiEmployeeRate);
  const employerContribution = Math.ceil(adjustedWageBase * esiEmployerRate);

  return {
    employeeContribution,
    employerContribution,
    isCalculated: true,
  };
}