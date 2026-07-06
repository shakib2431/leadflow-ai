import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculatePF } from '@/lib/compliance/calculatePF';
import { calculateESI } from '@/lib/compliance/calculateESI';
import { calculateProfessionalTax } from '@/lib/compliance/calculateProfessionalTax';
import { calculateTDS } from '@/lib/compliance/calculateTDS';
import { validateWageFloor } from '@/lib/compliance/validateWageFloor';
import { getTaxDeclarationsMap } from '@/lib/hrms/taxDeclarations';

function monthsRemainingInIndianFY(month: number) {
  return month <= 3 ? 4 - month : 16 - month;
}

function toInt(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.floor(num);
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const now = new Date();
    const body = await req.json();

    const month = toInt(body.month, now.getMonth() + 1);
    const year = toInt(body.year, now.getFullYear());

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'month/year are invalid' }, { status: 422 });
    }

    const { data: rules } = await supabaseAdmin.from('compliance_rules').select('*');
    const getRule = (type: string) => Number(rules?.find((r: any) => r.rule_type === type)?.value_numeric || 0);

    const WAGE_FLOOR_PERCENT = getRule('WAGE_FLOOR_PERCENT') || 0.5;
    const PF_RATE = getRule('PF_RATE') || 0.12;
    const PF_CEILING = 15000;
    const ESI_THRESHOLD = getRule('ESI_THRESHOLD') || 21000;
    const ESI_EMP_RATE = getRule('ESI_RATE') || 0.0075;
    const ESI_EMPR_RATE = 0.0325;
    const PT_SLABS = rules?.find((r: any) => r.rule_type === 'PT_SLAB')?.value_json || [];

    const { data: employees, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        employee_code,
        salary_structures ( id, ctc_annual, salary_components ( component_name, component_type, amount_monthly ) ),
        statutory_registrations ( registration_type, is_applicable )
      `)
      .eq('status', 'active')
      .is('salary_structures.effective_to', null);

    if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });

    const employeeIds = (employees || []).map((emp: any) => String(emp.id));
    const taxDeclarations = await getTaxDeclarationsMap(employeeIds);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data: attendance } = await supabaseAdmin
      .from('attendance_records')
      .select('employee_id, status')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'absent');

    const lineItems: any[] = [];

    for (const emp of employees || []) {
      const structure = emp.salary_structures?.[0];
      if (!structure) continue;

      const lopDays = attendance?.filter((a: any) => a.employee_id === emp.id).length || 0;
      const lopMultiplier = Math.max(0, (lastDay - lopDays) / lastDay);

      const proRatedComponents = (structure.salary_components || []).map((c: any) => ({
        ...c,
        amount_monthly: Math.round(Number(c.amount_monthly || 0) * lopMultiplier),
      }));

      const wageFloorResult = validateWageFloor(proRatedComponents, structure.ctc_annual, WAGE_FLOOR_PERCENT);
      const grossEarnings = proRatedComponents.reduce((sum: number, c: any) => sum + Number(c.amount_monthly || 0), 0);
      const adjustedWageBase = wageFloorResult.adjustedWageBase;

      const checkReg = (type: string) =>
        (emp.statutory_registrations || []).some((r: any) => r.registration_type === type && r.is_applicable);

      const pfResult = calculatePF(adjustedWageBase, checkReg('PF'), PF_RATE, PF_CEILING);
      const esiResult = calculateESI(adjustedWageBase, checkReg('ESI'), ESI_THRESHOLD, ESI_EMP_RATE, ESI_EMPR_RATE);
      const ptAmount = calculateProfessionalTax(grossEarnings, checkReg('PT'), PT_SLABS as any);

      const taxDeclaration = taxDeclarations.get(String(emp.id));
      const regime = taxDeclaration?.regime || 'NEW';
      const declaredDeductions = Number(taxDeclaration?.declared_80c || 0) + Number(taxDeclaration?.declared_80d || 0);

      const annualGross = grossEarnings * 12;
      const tdsResult = calculateTDS(0, annualGross, regime, declaredDeductions, monthsRemainingInIndianFY(month));
      const tdsAmount = tdsResult.monthlyTDS;

      const totalDeductions = pfResult.employeeContribution + esiResult.employeeContribution + ptAmount + tdsAmount;
      const netPay = grossEarnings - totalDeductions;

      lineItems.push({
        employee_id: emp.id,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code || emp.id,
        employee_code: emp.employee_code || null,
        tax_regime: regime,
        declared_deductions: declaredDeductions,
        lop_days: lopDays,
        gross_earnings: grossEarnings,
        pf_employee: pfResult.employeeContribution,
        esi_employee: esiResult.employeeContribution,
        professional_tax: ptAmount,
        tds: tdsAmount,
        deductions: totalDeductions,
        net_pay: netPay,
      });
    }

    const totals = lineItems.reduce(
      (acc, row) => {
        acc.gross += Number(row.gross_earnings || 0);
        acc.deductions += Number(row.deductions || 0);
        acc.net += Number(row.net_pay || 0);
        return acc;
      },
      { gross: 0, deductions: 0, net: 0 }
    );

    return NextResponse.json({
      data: {
        period: { month, year, startDate, endDate },
        totals,
        employeeCount: lineItems.length,
        items: lineItems.sort((a, b) => b.net_pay - a.net_pay).slice(0, 100),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
