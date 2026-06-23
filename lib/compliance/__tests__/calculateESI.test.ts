import { describe, it, expect } from 'vitest';
import { calculateESI } from '../calculateESI';

describe('Wage Compliance Engine: calculateESI', () => {
  const ESI_THRESHOLD = 21000;
  const ESI_EMP_RATE = 0.0075; // 0.75%
  const ESI_EMPR_RATE = 0.0325; // 3.25%

  it('1. Calculates correct ESI for wage below threshold', () => {
    // 10,000 wage base. Emp: 75, Empr: 325
    const result = calculateESI(10000, true, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(75);
    expect(result.employerContribution).toBe(325);
  });

  it('2. Returns zero if wage strictly exceeds the threshold', () => {
    // 22,000 wage base makes them ineligible for ESI
    const result = calculateESI(22000, true, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
    
    expect(result.isCalculated).toBe(false);
    expect(result.employeeContribution).toBe(0);
    expect(result.employerContribution).toBe(0);
  });

  it('3. Calculates correctly at the exact threshold boundary & rounds UP correctly', () => {
    // 21,000 wage base. 
    // 21000 * 0.0075 = 157.5 (Rounds UP to 158)
    // 21000 * 0.0325 = 682.5 (Rounds UP to 683)
    const result = calculateESI(21000, true, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
    
    expect(result.isCalculated).toBe(true);
    expect(result.employeeContribution).toBe(158); 
    expect(result.employerContribution).toBe(683); 
  });

  it('4. Returns exactly zero if employee is not applicable (opted out)', () => {
    // 15,000 wage base, but NOT applicable for ESI
    const result = calculateESI(15000, false, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
    
    expect(result.isCalculated).toBe(false);
    expect(result.employeeContribution).toBe(0);
    expect(result.employerContribution).toBe(0);
  });

  it('5. Handles zero wage base', () => {
    // 0 wage base.
    const result = calculateESI(0, true, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
    
    expect(result.isCalculated).toBe(false);
    expect(result.employeeContribution).toBe(0);
    expect(result.employerContribution).toBe(0);
  });
});