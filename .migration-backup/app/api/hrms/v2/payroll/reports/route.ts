import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseMonthYear } from '@/lib/hrms/payrollPhase8Schemas';
import { logHRMSAudit } from '@/lib/hrms/audit';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const { month, year } = parseMonthYear(url.searchParams.get('month'), url.searchParams.get('year'));

    let runQuery = supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status, finalized_at, created_at')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24);

    if (month) runQuery = runQuery.eq('period_month', month);
    if (year) runQuery = runQuery.eq('period_year', year);

    const { data: runs, error: runsError } = await runQuery;
    if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

    const runIds = (runs || []).map((row) => String(row.id));
    if (runIds.length === 0) {
      return NextResponse.json({ data: { runs: [], employeeSummary: [], monthlySummary: [] } });
    }

    const { data: lines, error: linesError } = await supabaseAdmin
      .from('payroll_line_items')
      .select('payroll_run_id, employee_id, gross_earnings, net_pay, pf_employee, esi_employee, professional_tax, tds, lwf_employee, employees(first_name,last_name,employee_code)')
      .in('payroll_run_id', runIds);

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

    const runById = new Map((runs || []).map((run) => [String(run.id), run]));

    const monthlyMap = new Map<string, any>();
    const employeeMap = new Map<string, any>();

    for (const row of lines || []) {
      const run = runById.get(String(row.payroll_run_id));
      if (!run) continue;
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

      const periodKey = `${run.period_year}-${String(run.period_month).padStart(2, '0')}`;
      if (!monthlyMap.has(periodKey)) {
        monthlyMap.set(periodKey, {
          period_key: periodKey,
          month: Number(run.period_month),
          year: Number(run.period_year),
          gross: 0,
          net: 0,
          deductions: 0,
          employees: new Set<string>(),
        });
      }

      const gross = Number(row.gross_earnings || 0);
      const net = Number(row.net_pay || 0);
      const ded = gross - net;

      const periodBucket = monthlyMap.get(periodKey);
      periodBucket.gross += gross;
      periodBucket.net += net;
      periodBucket.deductions += ded;
      periodBucket.employees.add(String(row.employee_id));

      const empKey = String(row.employee_id);
      if (!employeeMap.has(empKey)) {
        employeeMap.set(empKey, {
          employee_id: empKey,
          employee_name: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.employee_code || empKey,
          employee_code: employee?.employee_code || null,
          gross: 0,
          net: 0,
          deductions: 0,
          runs: 0,
        });
      }

      const empBucket = employeeMap.get(empKey);
      empBucket.gross += gross;
      empBucket.net += net;
      empBucket.deductions += ded;
      empBucket.runs += 1;
    }

    const monthlySummary = Array.from(monthlyMap.values())
      .map((row) => ({
        period_key: row.period_key,
        month: row.month,
        year: row.year,
        gross: row.gross,
        net: row.net,
        deductions: row.deductions,
        employee_count: row.employees.size,
      }))
      .sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year));

    const employeeSummary = Array.from(employeeMap.values()).sort((a, b) => b.net - a.net).slice(0, 50);

    await logHRMSAudit({
      action: 'payroll_report_viewed',
      entity_type: 'payroll_report',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        run_count: (runs || []).length,
        monthly_rows: monthlySummary.length,
        employee_rows: employeeSummary.length,
      },
    });

    return NextResponse.json({
      data: {
        runs: runs || [],
        monthlySummary,
        employeeSummary,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch payroll report' }, { status: 500 });
  }
}
