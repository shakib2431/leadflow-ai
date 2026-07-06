import { describe, it, expect } from 'vitest';
import { calculateGratuity } from '../calculateGratuity';

describe('Wage Compliance Engine: calculateGratuity', () => {
  it('1. Returns ineligible for permanent employees with < 5 years tenure', () => {
    // 3 years tenure
    const result = calculateGratuity('permanent', '2020-01-01', '2023-01-01', 50000, 50000);
    expect(result.isEligible).toBe(false);
    expect(result.provisionedAmount).toBe(0);
  });

  it('2. Returns eligible for fixed-term employees with >= 1 year tenure', () => {
    // 2 years tenure. Entirely pre-cutover.
    const result = calculateGratuity('fixed_term', '2020-01-01', '2022-01-01', 50000, 60000);
    expect(result.isEligible).toBe(true);
    expect(result.eligibilityBasis).toBe('fixed_term_1yr');
    
    // Formula: (15/26) * 50000 * 2 = 57692.30 -> 57692
    expect(result.provisionedAmount).toBe(57692);
    expect(result.requiresHRReview).toBe(false);
  });

  it('3. Ignores contract and intern types completely', () => {
    // 10 years tenure as an intern. Still ineligible.
    const result = calculateGratuity('intern', '2010-01-01', '2020-01-01', 50000, 50000);
    expect(result.isEligible).toBe(false);
  });

  it('4. Handles the exact hybrid cutover perfectly and flags for HR Review', () => {
    // Joined Jan 1, 2020. Exits Jan 1, 2028. (Total ~8 years).
    // Pre-cutover: 50k wage base. Post-cutover: 70k wage base (due to allowance rules).
    const result = calculateGratuity('permanent', '2020-01-01', '2028-01-01', 50000, 70000);
    
    expect(result.isEligible).toBe(true);
    expect(result.eligibilityBasis).toBe('permanent_5yr');
    expect(result.requiresHRReview).toBe(true); // Must be flagged
    
    // Check that pre and post amounts were isolated
    expect(result.breakdown.preCutoverAmount).toBeGreaterThan(0);
    expect(result.breakdown.postCutoverAmount).toBeGreaterThan(0);
    expect(result.provisionedAmount).toBe(result.breakdown.preCutoverAmount + result.breakdown.postCutoverAmount);
  });

  it('5. Rounds up > 6 months to a full year for eligibility', () => {
    // 4 years and 7 months (~4.6 years). Should be treated as 5 years for permanent eligibility.
    const result = calculateGratuity('permanent', '2020-01-01', '2024-08-01', 50000, 50000);
    
    expect(result.isEligible).toBe(true);
    expect(result.breakdown.totalTenureYears).toBe(5);
  });
});