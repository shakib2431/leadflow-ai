export type ComponentType = 'wages' | 'allowance' | 'other_remuneration';

export interface SalaryComponent {
  component_name: string;
  component_type: ComponentType;
  amount_monthly: number;
}

export interface WageFloorResult {
  isCompliant: boolean;
  wageBase: number;
  adjustedWageBase: number;
  excessAmount: number;
}

/**
 * Validates if the salary structure meets the statutory wage floor (e.g., 50% of CTC).
 * If allowances exceed the permitted threshold, the excess is added back to the wage base
 * for statutory calculations (PF, ESI, etc.).
 */
export function validateWageFloor(
  salaryComponents: SalaryComponent[],
  ctcAnnual: number,
  wageFloorPercent: number // e.g., 0.50. Fetched from compliance_rules DB.
): WageFloorResult {
  const ctcMonthly = ctcAnnual / 12;
  const wageFloorMonthly = ctcMonthly * wageFloorPercent;

  let wageBase = 0;
  let allowances = 0;

  for (const comp of salaryComponents) {
    if (comp.component_type === 'wages') {
      wageBase += comp.amount_monthly;
    } else if (comp.component_type === 'allowance') {
      allowances += comp.amount_monthly;
    }
    // 'other_remuneration' (like overtime, annual bonus) is explicitly excluded from this math.
  }

  const isCompliant = wageBase >= wageFloorMonthly;

  // If allowances exceed (CTC * allowed allowance percentage), the excess counts as wages.
  // E.g., if floor is 50%, allowances over 50% of CTC are excess.
  const allowedAllowancesMonthly = ctcMonthly * (1 - wageFloorPercent);
  const excessAmount = allowances > allowedAllowancesMonthly 
    ? allowances - allowedAllowancesMonthly 
    : 0;

  const adjustedWageBase = wageBase + excessAmount;

  return {
    isCompliant,
    wageBase,
    adjustedWageBase,
    excessAmount,
  };
}