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

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = parseMonth(url.searchParams.get('month'));
    const year = parseYear(url.searchParams.get('year'));

    let runQuery = supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24);

    if (month) runQuery = runQuery.eq('period_month', month);
    if (year) runQuery = runQuery.eq('period_year', year);

    const { data: runs, error: runError } = await runQuery;
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

    const runIds = (runs || []).map((row) => String(row.id));
    let lines: any[] = [];

    if (runIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('payroll_line_items')
        .select('payroll_run_id, employee_id, pf_employee, pf_employer')
        .in('payroll_run_id', runIds);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      lines = data || [];
    }

    const employeeIds = Array.from(new Set(lines.map((row) => String(row.employee_id))));

    const [{ count: activeEmployeeCount }, { data: pfRegs }] = await Promise.all([
      supabaseAdmin.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      employeeIds.length > 0
        ? supabaseAdmin
            .from('statutory_registrations')
            .select('employee_id, is_applicable')
            .eq('registration_type', 'PF')
            .in('employee_id', employeeIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const applicableSet = new Set(
      (pfRegs || []).filter((row: any) => row.is_applicable).map((row: any) => String(row.employee_id))
    );

    const totals = lines.reduce(
      (acc, row) => {
        const employeePf = Number(row.pf_employee || 0);
        const employerPf = Number(row.pf_employer || 0);
        acc.employee_contribution += employeePf;
        acc.employer_contribution += employerPf;
        acc.total_contribution += employeePf + employerPf;
        return acc;
      },
      { employee_contribution: 0, employer_contribution: 0, total_contribution: 0 }
    );

    const byPeriodMap = new Map<string, { month: number; year: number; employee_contribution: number; employer_contribution: number; total_contribution: number }>();
    const runMap = new Map((runs || []).map((run) => [String(run.id), run]));

    for (const row of lines) {
      const run = runMap.get(String(row.payroll_run_id));
      if (!run) continue;
      const key = `${run.period_year}-${String(run.period_month).padStart(2, '0')}`;
      if (!byPeriodMap.has(key)) {
        byPeriodMap.set(key, {
          month: Number(run.period_month),
          year: Number(run.period_year),
          employee_contribution: 0,
          employer_contribution: 0,
          total_contribution: 0,
        });
      }
      const bucket = byPeriodMap.get(key)!;
      const employeePf = Number(row.pf_employee || 0);
      const employerPf = Number(row.pf_employer || 0);
      bucket.employee_contribution += employeePf;
      bucket.employer_contribution += employerPf;
      bucket.total_contribution += employeePf + employerPf;
    }

    const byPeriod = Array.from(byPeriodMap.values())
      .sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year))
      .slice(0, 12);

    const coverage = {
      active_employees: Number(activeEmployeeCount || 0),
      payroll_employees: employeeIds.length,
      pf_applicable_employees: applicableSet.size,
      pf_coverage_percent: employeeIds.length > 0 ? Number(((applicableSet.size / employeeIds.length) * 100).toFixed(2)) : 0,
    };

    await logHRMSAudit({
      action: 'pf_summary_viewed',
      entity_type: 'pf_management',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        run_count: runIds.length,
        payroll_employees: employeeIds.length,
      },
    });

    return NextResponse.json({ data: { period_filter: { month, year }, totals, coverage, byPeriod } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch PF summary' }, { status: 500 });
  }
}
