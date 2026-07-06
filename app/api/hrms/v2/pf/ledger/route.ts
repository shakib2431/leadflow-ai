import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logHRMSAudit } from '@/lib/hrms/audit';

function parseMonth(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 1 && value <= 12 ? Math.floor(value) : null;
}

function parseYear(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 2000 && value <= 2100 ? Math.floor(value) : null;
}

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = parseMonth(url.searchParams.get('month'));
    const year = parseYear(url.searchParams.get('year'));
    const employeeIdFilter = String(url.searchParams.get('employee_id') || '').trim();

    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 50), 200);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let runQuery = supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(36);

    if (month) runQuery = runQuery.eq('period_month', month);
    if (year) runQuery = runQuery.eq('period_year', year);

    const { data: runs, error: runError } = await runQuery;
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

    const runIds = (runs || []).map((row) => String(row.id));
    if (runIds.length === 0) {
      return NextResponse.json({ data: [], meta: { page, pageSize, total: 0, totalPages: 1 } });
    }

    let query = supabaseAdmin
      .from('payroll_line_items')
      .select(
        'payroll_run_id, employee_id, pf_employee, pf_employer, payroll_runs!inner(period_month, period_year, status), employees(first_name, last_name, employee_code, pf_number)',
        { count: 'exact' }
      )
      .in('payroll_run_id', runIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (employeeIdFilter) query = query.eq('employee_id', employeeIdFilter);

    const { data: rows, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const employeeIds = Array.from(new Set((rows || []).map((row: any) => String(row.employee_id))));

    let pfRegMap = new Map<string, boolean>();
    if (employeeIds.length > 0) {
      const { data: regs } = await supabaseAdmin
        .from('statutory_registrations')
        .select('employee_id, is_applicable')
        .eq('registration_type', 'PF')
        .in('employee_id', employeeIds);

      pfRegMap = new Map((regs || []).map((row: any) => [String(row.employee_id), Boolean(row.is_applicable)]));
    }

    const data = (rows || []).map((row: any) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const run = Array.isArray(row.payroll_runs) ? row.payroll_runs[0] : row.payroll_runs;
      const employeeContribution = Number(row.pf_employee || 0);
      const employerContribution = Number(row.pf_employer || 0);
      return {
        employee_id: String(row.employee_id),
        employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.employee_code || row.employee_id,
        employee_code: employee?.employee_code || null,
        pf_number: employee?.pf_number || null,
        is_pf_applicable: pfRegMap.has(String(row.employee_id)) ? pfRegMap.get(String(row.employee_id)) : true,
        period_month: Number(run?.period_month || 0),
        period_year: Number(run?.period_year || 0),
        run_status: run?.status || null,
        pf_employee: employeeContribution,
        pf_employer: employerContribution,
        pf_total: employeeContribution + employerContribution,
      };
    });

    await logHRMSAudit({
      action: 'pf_ledger_viewed',
      entity_type: 'pf_management',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        employee_id: employeeIdFilter || null,
        rows: data.length,
      },
    });

    return NextResponse.json({
      data,
      meta: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch PF ledger' }, { status: 500 });
  }
}
