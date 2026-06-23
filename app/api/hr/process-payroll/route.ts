import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateWageFloor } from '@/lib/compliance/validateWageFloor';
import { calculatePF } from '@/lib/compliance/calculatePF';
import { calculateESI } from '@/lib/compliance/calculateESI';
import { calculateProfessionalTax } from '@/lib/compliance/calculateProfessionalTax';

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
    const getRule = (type: string) => Number(rules?.find(r => r.rule_type === type)?.value_numeric || 0);
    
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
        id, work_state,
        salary_structures ( id, ctc_annual, salary_components ( component_name, component_type, amount_monthly ) ),
        statutory_registrations ( registration_type, is_applicable )
      `)
      .eq('status', 'active')
      .is('salary_structures.effective_to', null); // Only current structure

    if (!employees || employees.length === 0) throw new Error("No active employees found.");

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
    const lineItemsToInsert = [];

    for (const emp of employees) {
      const structure = emp.salary_structures[0];
      if (!structure) continue; // Skip if no salary structure is defined

      // A. LOP (Loss of Pay) calculation
      const lopDays = attendance?.filter(a => a.employee_id === emp.id).length || 0;
      const lopMultiplier = Math.max(0, (lastDay - lopDays) / lastDay);

      // B. Pro-rate Components & Validate Wage Floor
      const proRatedComponents = structure.salary_components.map((c: any) => ({
        ...c,
        amount_monthly: Math.round(c.amount_monthly * lopMultiplier)
      }));

      const wageFloorResult = validateWageFloor(proRatedComponents, structure.ctc_annual, WAGE_FLOOR_PERCENT);
      
      const grossEarnings = proRatedComponents.reduce((sum: number, c: any) => sum + c.amount_monthly, 0);
      const adjustedWageBase = wageFloorResult.adjustedWageBase;

      // C. Statutory Flags
      const checkReg = (type: string) => emp.statutory_registrations.some((r: any) => r.registration_type === type && r.is_applicable);
      const isPfApplicable = checkReg('PF');
      const isEsiApplicable = checkReg('ESI');
      const isPtApplicable = checkReg('PT');

      // D. Execute Deterministic Math Engines
      const pfResult = calculatePF(adjustedWageBase, isPfApplicable, PF_RATE, PF_CEILING);
      const esiResult = calculateESI(adjustedWageBase, isEsiApplicable, ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
      const ptAmount = calculateProfessionalTax(grossEarnings, isPtApplicable, PT_SLABS as any);
      
      // TDS is bypassed for this monthly run demo to keep the loop fast, 
      // but in production, you'd feed calculateTDS() here.
      const tdsAmount = 0; 

      // E. Final Net Pay Calculation
      const totalDeductions = pfResult.employeeContribution + esiResult.employeeContribution + ptAmount + tdsAmount;
      const netPay = grossEarnings - totalDeductions;

      lineItemsToInsert.push({
        payroll_run_id: run.id,
        employee_id: emp.id,
        gross_earnings: grossEarnings,
        wage_base: adjustedWageBase,
        pf_employee: pfResult.employeeContribution,
        pf_employer: pfResult.employerContribution,
        esi_employee: esiResult.employeeContribution,
        esi_employer: esiResult.employerContribution,
        professional_tax: ptAmount,
        tds: tdsAmount,
        lwf_employee: 0, // Placeholder
        lwf_employer: 0,
        lop_days: lopDays,
        net_pay: netPay,
        calculation_breakdown: {
          components: proRatedComponents,
          wage_floor_compliant: wageFloorResult.isCompliant,
          deductions: { pf: pfResult.employeeContribution, esi: esiResult.employeeContribution, pt: ptAmount }
        }
      });
    }

    // 6. Bulk Insert Line Items (Clear old drafts first)
    await supabase.from('payroll_line_items').delete().eq('payroll_run_id', run.id);
    const { error: insertItemsError } = await supabase.from('payroll_line_items').insert(lineItemsToInsert);
    
    if (insertItemsError) throw insertItemsError;

    // 7. Update status to draft for HR review
    await supabase.from('payroll_runs').update({ status: 'draft' }).eq('id', run.id);

    return NextResponse.json({ success: true, message: `Processed payroll for ${lineItemsToInsert.length} employees.` });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}