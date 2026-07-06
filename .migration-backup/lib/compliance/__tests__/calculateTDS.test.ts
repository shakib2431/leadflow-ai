import { describe, it, expect } from 'vitest';
import { calculateTDS } from '../calculateTDS';

describe('Wage Compliance Engine: calculateTDS', () => {
  it('1. New Regime: Zero tax due to 87A Rebate (7 Lakhs or less)', () => {
    // Annual Gross = 7.5L. Minus 50k Std Deduction = 7L Taxable. Should be tax-free.
    const result = calculateTDS(350000, 400000, 'NEW', 0, 6);
    
    expect(result.taxableIncome).toBe(700000);
    expect(result.annualTax).toBe(0);
    expect(result.monthlyTDS).toBe(0);
  });

  it('2. New Regime: Calculates correct tax + 4% cess for 12 Lakhs gross', () => {
    // Annual Gross = 12L. Taxable = 11.5L.
    // 0-3L: 0
    // 3-6L: 15k
    // 6-9L: 30k
    // 9-11.5L: 37.5k
    // Base Tax = 82,500. Plus 4% Cess = 85,800.
    const result = calculateTDS(600000, 600000, 'NEW', 0, 12);
    
    expect(result.taxableIncome).toBe(1150000);
    expect(result.annualTax).toBe(85800);
    expect(result.monthlyTDS).toBe(7150); // 85800 / 12
  });

  it('3. Old Regime: Applies 80C declarations correctly to lower tax liability', () => {
    // Annual Gross = 10L. Std Deduction = 50k. 80C = 1.5L. Taxable = 8L.
    // 0-2.5L: 0
    // 2.5-5L: 12.5k
    // 5-8L: 60k
    // Base Tax = 72,500. Plus 4% Cess = 75,400.
    const result = calculateTDS(500000, 500000, 'OLD', 150000, 10);
    
    expect(result.taxableIncome).toBe(800000);
    expect(result.annualTax).toBe(75400);
    expect(result.monthlyTDS).toBe(7540); // 75400 / 10
  });

  it('4. Old Regime: Zero tax due to 87A Rebate (5 Lakhs or less)', () => {
    // Annual Gross = 6.5L. Std Ded = 50k. Declarations = 1L. Taxable = 5L. Should be tax-free.
    const result = calculateTDS(300000, 350000, 'OLD', 100000, 5);
    
    expect(result.taxableIncome).toBe(500000);
    expect(result.annualTax).toBe(0);
  });

  it('5. Ignores declarations if NEW regime is selected', () => {
    // Annual Gross = 10L. New Regime. Passes 1.5L in declarations but they must be ignored.
    // Taxable = 9.5L (10L - 50k std ded). Base Tax = 52,500. Plus 4% Cess = 54,600.
    const result = calculateTDS(1000000, 0, 'NEW', 150000, 1);
    
    expect(result.taxableIncome).toBe(950000);
    expect(result.annualTax).toBe(54600);
  });
});