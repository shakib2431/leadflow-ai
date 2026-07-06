import { describe, it, expect } from 'vitest';
import { calculatePF } from '../calculatePF';

describe('Wage Compliance Engine: calculatePF', () => {
  const PF_RATE = 0.12; // 12%
  const PF_WAGE_CEILING = 15000; // Statutory cap

  it('1. Calculates correct PF for wage below the ceiling', () => {
    // 10,000 wage base. 12% should be 1,200.
    const result = calculatePF(10000, true, PF_RATE, PF_WAGE_CEILING);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(1200);
    expect(result.employerContribution).toBe(1200);
  });

  it('2. Caps the PF calculation strictly at the statutory ceiling', () => {
    // 50,000 wage base. Should cap at 15,000. 12% of 15,000 is 1,800.
    const result = calculatePF(50000, true, PF_RATE, PF_WAGE_CEILING);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(1800);
    expect(result.employerContribution).toBe(1800);
  });

  it('3. Returns exactly zero if employee is not applicable (opted out)', () => {
    // 20,000 wage base, but NOT applicable for PF
    const result = calculatePF(20000, false, PF_RATE, PF_WAGE_CEILING);
    
    expect(result.isCalculated).toBe(false);
    expect(result.employeeContribution).toBe(0);
    expect(result.employerContribution).toBe(0);
  });

  it('4. Handles the exact ceiling edge case flawlessly', () => {
    // Exactly 15,000 wage base.
    const result = calculatePF(15000, true, PF_RATE, PF_WAGE_CEILING);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(1800);
    expect(result.employerContribution).toBe(1800);
  });

  it('5. Handles zero wage base (e.g., 100% Leave Without Pay month)', () => {
    // 0 wage base.
    const result = calculatePF(0, true, PF_RATE, PF_WAGE_CEILING);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(0);
    expect(result.employerContribution).toBe(0);
  });
});