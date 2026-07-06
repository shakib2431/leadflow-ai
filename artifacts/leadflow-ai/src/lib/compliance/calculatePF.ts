export interface PFResult {
  employeeContribution: number;
  employerContribution: number;
  isCalculated: boolean;
}

/**
 * Calculates Provident Fund (PF) contributions for both employee and employer.
 * Caps the calculation at the statutory wage ceiling.
 */
export function calculatePF(
  adjustedWageBase: number,
  isApplicable: boolean,
  pfRate: number, // e.g., 0.12 (fetched from compliance_rules)
  pfWageCeiling: number // e.g., 15000 (fetched from compliance_rules)
): PFResult {
  // If the employee is not registered/applicable for PF, skip calculation
  if (!isApplicable) {
    return {
      employeeContribution: 0,
      employerContribution: 0,
      isCalculated: false,
    };
  }

  // Statutory rule: Mandatory PF is only calculated up to the wage ceiling
  const cappedWageBase = Math.min(adjustedWageBase, pfWageCeiling);

  // Standard PF calculation (rounded to the nearest Rupee per statutory norms)
  const employeeContribution = Math.round(cappedWageBase * pfRate);
  const employerContribution = Math.round(cappedWageBase * pfRate);

  return {
    employeeContribution,
    employerContribution,
    isCalculated: true,
  };
}