import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateWageFloor } from '@/lib/compliance/validateWageFloor';
import { calculatePF } from '@/lib/compliance/calculatePF';
import { calculateESI } from '@/lib/compliance/calculateESI';
import { calculateProfessionalTax } from '@/lib/compliance/calculateProfessionalTax';
import { calculateTDS } from '@/lib/compliance/calculateTDS';
import { getTaxDeclarationsMap } from '@/lib/hrms/taxDeclarations';

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function monthsRemainingInIndianFY(month: number) {
  return month <= 3 ? 4 - month : 16 - month;
}

export async function POST(request: Request) {
  try {
    const { month, year, user_id } = await request.json();

    // 1. Create or fetch the Payroll Run record
    let { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('period_month', month)
      .eq('period_year', year)
      .single();

    if (!run) {
      const { data: newRun, error: insertError } = await supabase
        .from('payroll_runs')
        .insert({ period_month: month, period_year: year, status: 'processing', created_by: user_id })
        .select()
        .single();
      if (insertError) throw insertError;
      run = newRun;
    } else {
      // Prevent re-processing if finalized or paid
      if (run.status === 'finalized' || run.status === 'paid') {
        return NextResponse.json({ error: "Payroll for this period is locked." }, { status: 400 });
      }
      // Update status to processing
      await supabase.from('payroll_runs').update({ status: 'processing' }).eq('id', run.id);
    }

    // 2. Fetch Global Compliance Rules
    const { data: rules } = await supabase.from('compliance_rules').select('*');
    const getRule = (type: string) => toFiniteNumber(rules?.find(r => r.rule_type === type)?.value_numeric || 0, 0);
    
    const WAGE_FLOOR_PERCENT = getRule('WAGE_FLOOR_PERCENT') || 0.50;
    const PF_RATE = getRule('PF_RATE') || 0.12;
    const PF_CEILING = 15000; // Standard statutory cap
    const ESI_THRESHOLD = getRule('ESI_THRESHOLD') || 21000;
    const ESI_EMP_RATE = getRule('ESI_RATE') || 0.0075;
    const ESI_EMPR_RATE = 0.0325; // Standard employer rate
    const PT_SLABS = rules?.find(r => r.rule_type === 'PT_SLAB')?.value_json || [];

    // 3. Fetch Active Employees with Data Graph (Structures, Components, Registrations)
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        id, first_name, last_name, email, employee_code, work_state,
        salary_structures ( id, effective_from, effective_to, ctc_annual, salary_components ( component_name, component_type, amount_monthly ) ),
        statutory_registrations ( registration_type, is_applicable )
      `)
      .eq('status', 'active');

    if (!employees || employees.length === 0) throw new Error("No active employees found.");

    const employeeIds = employees.map((emp: any) => String(emp.id));
    const taxDeclarations = await getTaxDeclarationsMap(employeeIds);

    // 4. Fetch Attendance for LOP (Loss of Pay) Calculation
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('employee_id, status')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'absent'); // Only count absences for LOP

    // 5. The Core Calculation Loop
    const lineItemsToInsert: any[] = [];
    const skippedEmployees: Array<{ employee_id: string; employee_name: string; employee_code: string | null; reason: string }> = [];

    for (const emp of employees) {
      const allStructures = Array.isArray(emp.salary_structures) ? emp.salary_structures : [];
      const activeStructures = allStructures
        .filter((s: any) => !s?.effective_to)
        .sort((a: any, b: any) => {
          const aTime = new Date(String(a?.effective_from || 0)).getTime();
          const bTime = new Date(String(b?.effective_from || 0)).getTime();
          return bTime - aTime;
        });

      const structure = activeStructures[0];
      if (!structure) {
        skippedEmployees.push({
          employee_id: String(emp.id),
          employee_name: `${String(emp.first_name || '').trim()} ${String(emp.last_name || '').trim()}`.trim() || `Employee ${String(emp.id).slice(0, 8)}`,
          employee_code: emp.employee_code || null,
          reason: 'Missing active salary structure',
        });
        continue;
      }

      // A. LOP (Loss of Pay) calculation
      const lopDays = attendance?.filter(a => a.employee_id === emp.id).length || 0;
      const lopMultiplier = Math.max(0, (lastDay - lopDays) / lastDay);

      // B. Pro-rate Components & Validate Wage Floor
      const sourceComponents = Array.isArray(structure.salary_components) ? structure.salary_components : [];
      const proRatedComponents = sourceComponents.map((c: any) => ({
        ...c,
        amount_monthly: Math.round(toFiniteNumber(c.amount_monthly, 0) * lopMultiplier)
      }));

      const wageFloorResult = validateWageFloor(proRatedComponents, structure.ctc_annual, WAGE_FLOOR_PERCENT);
      
      const grossEarnings = toFiniteNumber(proRatedComponents.reduce((sum: number, c: any) => sum + toFiniteNumber(c.amount_monthly, 0), 0), 0);
      const adjustedWageBase = toFiniteNumber(wageFloorResult.adjustedWageBase, 0);

      // C. Statutory Flags
      const registrations = Array.isArray(emp.statutory_registrations) ? emp.statutory_registrations : [];
      const checkReg = (type: string) => registrations.some((r: any) => r.registration_type === type && r.is_applicable);
      const isPfApplicable = checkReg('PF');
      const isEsiApplicable = checkReg('ESI');
      const isPtApplicable = checkReg('PT');

      // D. Execute Deterministic Math Engines
      const pfResult = calculatePF(adjustedWageBase, isPfApplicable, PF_RATE, PF_CEILING);
      const esiResult = calculateESI(adjustedWageBase, isEsiApplicable, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
      const ptAmount = toFiniteNumber(calculateProfessionalTax(grossEarnings, isPtApplicable, PT_SLABS as any), 0);

      const taxDeclaration = taxDeclarations.get(String(emp.id));
      const regime = taxDeclaration?.regime || 'NEW';
      const declaredDeductions = toFiniteNumber(taxDeclaration?.declared_80c, 0) + toFiniteNumber(taxDeclaration?.declared_80d, 0);

      const annualGross = grossEarnings * 12;
      const tdsResult = calculateTDS(0, annualGross, regime, declaredDeductions, monthsRemainingInIndianFY(month));
      const tdsAmount = toFiniteNumber(tdsResult.monthlyTDS, 0);

      // E. Final Net Pay Calculation
      const pfEmployee = toFiniteNumber(pfResult.employeeContribution, 0);
      const pfEmployer = toFiniteNumber(pfResult.employerContribution, 0);
      const esiEmployee = toFiniteNumber(esiResult.employeeContribution, 0);
      const esiEmployer = toFiniteNumber(esiResult.employerContribution, 0);
      const totalDeductions = pfEmployee + esiEmployee + ptAmount + tdsAmount;
      const netPay = Math.max(0, toFiniteNumber(grossEarnings - totalDeductions, 0));

      lineItemsToInsert.push({
        payroll_run_id: run.id,
        employee_id: emp.id,
        gross_earnings: grossEarnings,
        wage_base: adjustedWageBase,
        pf_employee: pfEmployee,
        pf_employer: pfEmployer,
        esi_employee: esiEmployee,
        esi_employer: esiEmployer,
        professional_tax: ptAmount,
        tds: tdsAmount,
        lwf_employee: 0, // Placeholder
        lwf_employer: 0,
        lop_days: lopDays,
        net_pay: netPay,
        calculation_breakdown: {
          components: proRatedComponents,
          wage_floor_compliant: wageFloorResult.isCompliant,
          deductions: { pf: pfEmployee, esi: esiEmployee, pt: ptAmount, tds: tdsAmount },
          tax: {
            regime,
            declared_deductions: declaredDeductions,
            annual_taxable_income: tdsResult.taxableIncome,
            annual_tax: tdsResult.annualTax,
          },
        }
      });
    }

    // 6. Bulk Insert Line Items (Clear old drafts first)
    await supabase.from('payroll_line_items').delete().eq('payroll_run_id', run.id);
    const { error: insertItemsError } = await supabase.from('payroll_line_items').insert(lineItemsToInsert);
    
    if (insertItemsError) throw insertItemsError;

    // 7. Update status to draft for HR review
    await supabase.from('payroll_runs').update({ status: 'draft' }).eq('id', run.id);

    const activeEmployeeCount = employees.length;
    const skippedCount = skippedEmployees.length;

    return NextResponse.json({
      success: true,
      message: `Processed payroll for ${lineItemsToInsert.length} of ${activeEmployeeCount} active employees.`,
      data: {
        active_employee_count: activeEmployeeCount,
        processed_employee_count: lineItemsToInsert.length,
        skipped_employee_count: skippedCount,
        skipped_employees: skippedEmployees,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}