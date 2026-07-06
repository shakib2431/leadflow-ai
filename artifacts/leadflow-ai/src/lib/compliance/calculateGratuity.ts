export type EmploymentType = 'permanent' | 'fixed_term' | 'contract' | 'intern';

export interface GratuityResult {
  isEligible: boolean;
  eligibilityBasis: string;
  provisionedAmount: number;
  requiresHRReview: boolean;
  breakdown: {
    totalTenureYears: number;
    preCutoverYears: number;
    postCutoverYears: number;
    preCutoverAmount: number;
    postCutoverAmount: number;
  };
}

/**
 * Calculates statutory gratuity based on the Payment of Gratuity Act.
 * Handles the hybrid wage-base cutover (Nov 21, 2025) strictly.
 */
export function calculateGratuity(
  employmentType: EmploymentType,
  joinDateStr: string,
  exitDateStr: string,
  oldWageBase: number, // e.g., Basic Salary only (Pre-Cutover)
  newWageBase: number  // e.g., Adjusted Wage Base (Post-Cutover)
): GratuityResult {
  const joinDate = new Date(joinDateStr);
  const exitDate = new Date(exitDateStr);
  const CUTOVER_DATE = new Date('2025-11-21');

  // Calculate total tenure in days
  const totalDays = (exitDate.getTime() - joinDate.getTime()) / (1000 * 3600 * 24);
  
  // Statutory Rule: Tenure > 6 months (approx 180 days) in the final year rounds UP to a full year.
  const exactYears = totalDays / 365;
  const totalTenureYears = (totalDays % 365 > 180) ? Math.floor(exactYears) + 1 : Math.floor(exactYears);

  // 1. Check Eligibility
  let isEligible = false;
  let eligibilityBasis = 'ineligible';

  if (employmentType === 'permanent' && totalTenureYears >= 5) {
    isEligible = true;
    eligibilityBasis = 'permanent_5yr';
  } else if (employmentType === 'fixed_term' && totalTenureYears >= 1) {
    isEligible = true;
    eligibilityBasis = 'fixed_term_1yr';
  }

  if (!isEligible) {
    return {
      isEligible: false,
      eligibilityBasis,
      provisionedAmount: 0,
      requiresHRReview: false,
      breakdown: { totalTenureYears, preCutoverYears: 0, postCutoverYears: 0, preCutoverAmount: 0, postCutoverAmount: 0 }
    };
  }

  // 2. Calculate Tenure Split normalized to statutory integer years
  let preCutoverYears = 0;
  let postCutoverYears = 0;
  let requiresHRReview = false;

  if (joinDate < CUTOVER_DATE && exitDate > CUTOVER_DATE) {
    // Spans the cutover - HYBRID CALCULATION
    const preDays = (CUTOVER_DATE.getTime() - joinDate.getTime()) / (1000 * 3600 * 24);
    const postDays = (exitDate.getTime() - CUTOVER_DATE.getTime()) / (1000 * 3600 * 24);
    const totalActualDays = preDays + postDays;

    // Distribute the statutory integer years proportionally based on actual days served
    preCutoverYears = (preDays / totalActualDays) * totalTenureYears;
    postCutoverYears = (postDays / totalActualDays) * totalTenureYears;
    requiresHRReview = true; 
  } else if (exitDate <= CUTOVER_DATE) {
    // Entirely old regime - use full statutory rounded integer years
    preCutoverYears = totalTenureYears;
  } else {
    // Entirely new regime - use full statutory rounded integer years
    postCutoverYears = totalTenureYears;
  }

  // 3. Mathematical Formula: (15 / 26) * Last Drawn Wage * Years
  const GRATUITY_FACTOR = 15 / 26;

  const preCutoverAmount = Math.round(GRATUITY_FACTOR * oldWageBase * preCutoverYears);
  const postCutoverAmount = Math.round(GRATUITY_FACTOR * newWageBase * postCutoverYears);
  
  const provisionedAmount = preCutoverAmount + postCutoverAmount;

  return {
    isEligible: true,
    eligibilityBasis,
    provisionedAmount,
    requiresHRReview,
    breakdown: {
      totalTenureYears,
      preCutoverYears: parseFloat(preCutoverYears.toFixed(2)),
      postCutoverYears: parseFloat(postCutoverYears.toFixed(2)),
      preCutoverAmount,
      postCutoverAmount
    }
  };
}