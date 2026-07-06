import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const month = Number(url.searchParams.get('month') || 0);
  const year = Number(url.searchParams.get('year') || 0);
  const requestedEmployeeId = String(url.searchParams.get('employee_id') || '').trim();
  const includeDraft = url.searchParams.get('includeDraft') === 'true';
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 20), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let scopedEmployeeId: string | null = null;
  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId) {
      return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });
    }
    scopedEmployeeId = scope.employeeId;
  }

  let query = supabaseAdmin
    .from('payroll_line_items')
    .select(
      'id, payroll_run_id, employee_id, gross_earnings, net_pay, pf_employee, esi_employee, professional_tax, tds, lop_days, payroll_runs!inner(id, period_month, period_year, status, finalized_at, created_at), employees(first_name, last_name, employee_code)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false, referencedTable: 'payroll_runs' })
    .range(from, to);

  const employeeId = scopedEmployeeId || requestedEmployeeId;
  if (employeeId) query = query.eq('employee_id', employeeId);

  if (month >= 1 && month <= 12) query = query.eq('payroll_runs.period_month', month);
  if (year >= 2000 && year <= 2100) query = query.eq('payroll_runs.period_year', year);

  if (!includeDraft) {
    query = query.in('payroll_runs.status', ['finalized', 'paid']);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).filter((row: any) => row.payroll_runs).map((row: any) => ({
    id: row.id,
    employee_id: row.employee_id,
    employee_name:
      `${row.employees?.first_name || ''} ${row.employees?.last_name || ''}`.trim() || row.employees?.employee_code || row.employee_id,
    employee_code: row.employees?.employee_code || null,
    payroll_run_id: row.payroll_run_id,
    period_month: row.payroll_runs?.period_month || null,
    period_year: row.payroll_runs?.period_year || null,
    run_status: row.payroll_runs?.status || null,
    gross_earnings: Number(row.gross_earnings || 0),
    pf_employee: Number(row.pf_employee || 0),
    esi_employee: Number(row.esi_employee || 0),
    professional_tax: Number(row.professional_tax || 0),
    tds: Number(row.tds || 0),
    net_pay: Number(row.net_pay || 0),
    lop_days: Number(row.lop_days || 0),
    finalized_at: row.payroll_runs?.finalized_at || null,
  }));

  return NextResponse.json({
    data: rows,
    meta: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
}
