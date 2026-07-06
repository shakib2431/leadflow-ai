export interface ExitSettlementBreakdown {
  regularPay: number;
  leaveEncashment: number;
  gratuity: number;
  totalEarnings: number;
  totalDeductions: number;
}

export interface ExitSettlementResult {
  settlementDueDate: string; // YYYY-MM-DD
  finalAmount: number;
  breakdown: ExitSettlementBreakdown;
}

/**
 * Helper function to add working days strictly skipping Saturdays (6) and Sundays (0).
 */
function addWorkingDays(startDateStr: string, daysToAdd: number): Date {
  const date = new Date(startDateStr);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  return date;
}

/**
 * Aggregates the Full and Final (FnF) settlement.
 * Calculates the exact statutory due date (Exit Date + 2 Working Days).
 */
export function calculateExitSettlement(
  exitDateStr: string, // YYYY-MM-DD
  regularPay: number, // Unpaid pro-rata salary for the final month
  leaveBalanceDays: number,
  wageBasePerDay: number, // Used to calculate leave encashment
  gratuityAmount: number, // Passed from calculateGratuity()
  deductions: number // e.g., Notice period shortfall, unreturned assets
): ExitSettlementResult {
  
  const leaveEncashment = Math.round(leaveBalanceDays * wageBasePerDay);
  const totalEarnings = regularPay + leaveEncashment + gratuityAmount;
  
  // Final amount can technically be negative if an employee owes a heavy notice period buyout
  const finalAmount = totalEarnings - deductions;

  // Calculate Settlement Due Date (Exit Date + 2 Working Days)
  const dueDate = addWorkingDays(exitDateStr, 2);
  const settlementDueDate = dueDate.toISOString().split('T')[0];

  return {
    settlementDueDate,
    finalAmount,
    breakdown: {
      regularPay,
      leaveEncashment,
      gratuity: gratuityAmount,
      totalEarnings,
      totalDeductions: deductions
    }
  };
}