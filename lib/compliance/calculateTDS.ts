export type TaxRegime = 'OLD' | 'NEW';

export interface TDSResult {
  annualGross: number;
  taxableIncome: number;
  annualTax: number;
  monthlyTDS: number;
}

/**
 * Calculates monthly TDS based on projected annual income and chosen tax regime.
 * Includes Standard Deduction, 87A Rebate, and 4% Health & Education Cess.
 */
export function calculateTDS(
  ytdEarnings: number,
  projectedRemainingEarnings: number,
  regime: TaxRegime,
  declaredDeductions: number, // e.g., 80C, 80D investments (Only applies to OLD regime)
  monthsRemaining: number
): TDSResult {
  const annualGross = ytdEarnings + projectedRemainingEarnings;
  const STANDARD_DEDUCTION = 50000;
  
  // Calculate Taxable Income
  let taxableIncome = annualGross - STANDARD_DEDUCTION;
  if (regime === 'OLD') {
    taxableIncome -= declaredDeductions;
  }
  
  // Round to nearest 10 (Income Tax Act Sec 288A)
  taxableIncome = Math.round(Math.max(0, taxableIncome) / 10) * 10;

  let baseTax = 0;

  // FY 24-25 Tax Slabs
  if (regime === 'NEW') {
    // New Regime Slabs
    if (taxableIncome > 1500000) baseTax += (taxableIncome - 1500000) * 0.30 + 150000;
    else if (taxableIncome > 1200000) baseTax += (taxableIncome - 1200000) * 0.20 + 90000;
    else if (taxableIncome > 900000) baseTax += (taxableIncome - 900000) * 0.15 + 45000;
    else if (taxableIncome > 600000) baseTax += (taxableIncome - 600000) * 0.10 + 15000;
    else if (taxableIncome > 300000) baseTax += (taxableIncome - 300000) * 0.05;

    // Sec 87A Rebate for New Regime (Zero tax up to 7 Lakhs taxable)
    if (taxableIncome <= 700000) {
      baseTax = 0;
    }
  } else {
    // Old Regime Slabs (Under 60 years)
    if (taxableIncome > 1000000) baseTax += (taxableIncome - 1000000) * 0.30 + 112500;
    else if (taxableIncome > 500000) baseTax += (taxableIncome - 500000) * 0.20 + 12500;
    else if (taxableIncome > 250000) baseTax += (taxableIncome - 250000) * 0.05;

    // Sec 87A Rebate for Old Regime (Zero tax up to 5 Lakhs taxable)
    if (taxableIncome <= 500000) {
      baseTax = 0;
    }
  }

  // Add 4% Health & Education Cess
  let totalAnnualTax = baseTax > 0 ? baseTax * 1.04 : 0;
  
  // Round tax to nearest 10 (Income Tax Act Sec 288B)
  totalAnnualTax = Math.round(totalAnnualTax / 10) * 10;

  // Calculate monthly deduction
  const monthlyTDS = monthsRemaining > 0 ? Math.round(totalAnnualTax / monthsRemaining) : 0;

  return {
    annualGross,
    taxableIncome,
    annualTax: totalAnnualTax,
    monthlyTDS
  };
}