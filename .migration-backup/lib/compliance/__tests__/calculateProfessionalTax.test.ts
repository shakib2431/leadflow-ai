import { describe, it, expect } from 'vitest';
import { calculateProfessionalTax, PTSlab } from '../calculateProfessionalTax';

describe('Wage Compliance Engine: calculateProfessionalTax', () => {
  // Dummy slab representing a typical state structure (e.g., simplified Maharashtra)
  const maharashtraSlabs: PTSlab[] = [
    { min_earnings: 0, max_earnings: 7500, tax_amount: 0 },
    { min_earnings: 7501, max_earnings: 10000, tax_amount: 175 },
    { min_earnings: 10001, max_earnings: Infinity, tax_amount: 200 }
  ];

  it('1. Calculates correct PT for a mid-tier slab', () => {
    // 8,500 gross falls in the 7501-10000 range. Tax should be 175.
    const result = calculateProfessionalTax(8500, true, maharashtraSlabs);
    expect(result).toBe(175);
  });

  it('2. Calculates correct PT for the highest (Infinity) slab', () => {
    // 50,000 gross falls in the 10001+ range. Tax should be 200.
    const result = calculateProfessionalTax(50000, true, maharashtraSlabs);
    expect(result).toBe(200);
  });

  it('3. Returns exactly zero for the lowest exempt slab', () => {
    // 5,000 gross falls in the 0-7500 range. Tax should be 0.
    const result = calculateProfessionalTax(5000, true, maharashtraSlabs);
    expect(result).toBe(0);
  });

  it('4. Returns exactly zero if employee is not applicable (opted out)', () => {
    // 50,000 gross, but not applicable for PT
    const result = calculateProfessionalTax(50000, false, maharashtraSlabs);
    expect(result).toBe(0);
  });

  it('5. Returns exactly zero if the state has no PT rules (slabs are null)', () => {
    // E.g., An employee working in Delhi where stateSlabs = null
    const result = calculateProfessionalTax(50000, true, null);
    expect(result).toBe(0);
  });
});