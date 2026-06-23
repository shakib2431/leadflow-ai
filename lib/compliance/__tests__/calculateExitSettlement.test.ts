import { describe, it, expect } from 'vitest';
import { calculateExitSettlement } from '../calculateExitSettlement';

describe('Wage Compliance Engine: calculateExitSettlement', () => {
  it('1. Aggregates a standard clean exit correctly', () => {
    // 10k pro-rata pay, 5 days leave @ 1000/day, 50k gratuity, 0 deductions
    const result = calculateExitSettlement('2026-06-15', 10000, 5, 1000, 50000, 0);
    
    expect(result.breakdown.leaveEncashment).toBe(5000);
    expect(result.breakdown.totalEarnings).toBe(65000);
    expect(result.finalAmount).toBe(65000);
  });

  it('2. Handles heavy deductions (Recovery from Employee)', () => {
    // 10k pay, 0 leave, 0 gratuity, 50k notice buyout deduction
    const result = calculateExitSettlement('2026-06-15', 10000, 0, 1000, 0, 50000);
    
    expect(result.breakdown.totalEarnings).toBe(10000);
    expect(result.finalAmount).toBe(-40000); // Represents 40k owed TO the company
  });

  it('3. Calculates Due Date correctly mid-week (Monday -> Wednesday)', () => {
    // Exit on Monday, June 1, 2026. +2 working days = Wednesday, June 3, 2026.
    const result = calculateExitSettlement('2026-06-01', 0, 0, 0, 0, 0);
    expect(result.settlementDueDate).toBe('2026-06-03');
  });

  it('4. Calculates Due Date correctly over a weekend (Friday -> Tuesday)', () => {
    // Exit on Friday, June 5, 2026. 
    // +1 working day = Monday (June 8)
    // +2 working days = Tuesday (June 9)
    const result = calculateExitSettlement('2026-06-05', 0, 0, 0, 0, 0);
    expect(result.settlementDueDate).toBe('2026-06-09');
  });

  it('5. Calculates Due Date correctly from a Thursday (Thursday -> Monday)', () => {
    // Exit on Thursday, June 4, 2026.
    // +1 working day = Friday (June 5)
    // +2 working days = Monday (June 8)
    const result = calculateExitSettlement('2026-06-04', 0, 0, 0, 0, 0);
    expect(result.settlementDueDate).toBe('2026-06-08');
  });
});