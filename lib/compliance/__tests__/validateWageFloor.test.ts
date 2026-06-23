import { describe, it, expect } from 'vitest'; // <-- Add this line
import { validateWageFloor, SalaryComponent } from '../validateWageFloor';

describe('Wage Compliance Engine: validateWageFloor', () => {
  const WAGE_FLOOR_PERCENT = 0.50; // 50% statutory floor

  it('1. Passes a compliant structure (Wages > 50%)', () => {
    const ctcAnnual = 1200000; // 100k/month
    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: 60000 },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: 40000 },
    ];

    const result = validateWageFloor(components, ctcAnnual, WAGE_FLOOR_PERCENT);
    
    expect(result.isCompliant).toBe(true);
    expect(result.wageBase).toBe(60000);
    expect(result.excessAmount).toBe(0);
    expect(result.adjustedWageBase).toBe(60000);
  });

  it('2. Flags a non-compliant structure and calculates excess (Wages < 50%)', () => {
    const ctcAnnual = 1200000; // 100k/month
    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: 30000 },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: 50000 },
      { component_name: 'Special', component_type: 'allowance', amount_monthly: 20000 },
    ];

    const result = validateWageFloor(components, ctcAnnual, WAGE_FLOOR_PERCENT);
    
    expect(result.isCompliant).toBe(false);
    expect(result.wageBase).toBe(30000);
    // Allowances = 70k. Allowed = 50k. Excess = 20k.
    expect(result.excessAmount).toBe(20000); 
    // Adjusted Wage Base = 30k + 20k = 50k.
    expect(result.adjustedWageBase).toBe(50000);
  });

  it('3. Handles the exact 50% edge case perfectly', () => {
    const ctcAnnual = 600000; // 50k/month
    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: 25000 },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: 25000 },
    ];

    const result = validateWageFloor(components, ctcAnnual, WAGE_FLOOR_PERCENT);
    
    expect(result.isCompliant).toBe(true);
    expect(result.excessAmount).toBe(0);
    expect(result.adjustedWageBase).toBe(25000);
  });

  it('4. Handles zero-allowance (100% Basic) smoothly', () => {
    const ctcAnnual = 360000; // 30k/month
    const components: SalaryComponent[] = [
      { component_name: 'Consolidated Pay', component_type: 'wages', amount_monthly: 30000 },
    ];

    const result = validateWageFloor(components, ctcAnnual, WAGE_FLOOR_PERCENT);
    
    expect(result.isCompliant).toBe(true);
    expect(result.excessAmount).toBe(0);
    expect(result.adjustedWageBase).toBe(30000);
  });

  it('5. Ignores "other_remuneration" (overtime/bonus) in allowance threshold calculations', () => {
    const ctcAnnual = 1200000; // 100k/month CTC baseline
    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: 60000 },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: 40000 },
      // Overtime shouldn't penalize the core allowance ratio
      { component_name: 'Overtime', component_type: 'other_remuneration', amount_monthly: 15000 }, 
    ];

    const result = validateWageFloor(components, ctcAnnual, WAGE_FLOOR_PERCENT);
    
    expect(result.isCompliant).toBe(true);
    expect(result.excessAmount).toBe(0); // If OT was counted as allowance, this would fail.
    expect(result.adjustedWageBase).toBe(60000); 
  });
});