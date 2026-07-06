import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from('payroll_line_items')
    .select(
      'id, payroll_run_id, employee_id, gross_earnings, wage_base, pf_employee, pf_employer, esi_employee, esi_employer, professional_tax, tds, lwf_employee, lwf_employer, lop_days, net_pay, calculation_breakdown, payroll_runs(id, period_month, period_year, status, finalized_at, created_at), employees(id, first_name, last_name, employee_code, email)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId || scope.employeeId !== data.employee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['finalized', 'paid'].includes(String(data.payroll_runs?.status || '').toLowerCase())) {
      return NextResponse.json({ error: 'Payslip is not available yet' }, { status: 409 });
    }
  }

  return NextResponse.json({ data });
}
