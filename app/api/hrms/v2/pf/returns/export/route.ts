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

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
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
    const header = [
      'period_month',
      'period_year',
      'run_status',
      'employee_code',
      'employee_name',
      'pf_number',
      'pf_employee',
      'pf_employer',
      'pf_total',
    ];

    if (runIds.length === 0) {
      return new NextResponse(`${header.join(',')}\n`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="pf-return-empty.csv"',
        },
      });
    }

    const { data: lines, error: lineError } = await supabaseAdmin
      .from('payroll_line_items')
      .select('payroll_run_id, pf_employee, pf_employer, employees(first_name,last_name,employee_code,pf_number)')
      .in('payroll_run_id', runIds);

    if (lineError) return NextResponse.json({ error: lineError.message }, { status: 500 });

    const runMap = new Map((runs || []).map((row) => [String(row.id), row]));

    const rows = (lines || []).map((line: any) => {
      const run = runMap.get(String(line.payroll_run_id));
      const employee = Array.isArray(line.employees) ? line.employees[0] : line.employees;
      const employeePf = Number(line.pf_employee || 0);
      const employerPf = Number(line.pf_employer || 0);
      const employeeName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();

      return [
        run?.period_month || '',
        run?.period_year || '',
        run?.status || '',
        employee?.employee_code || '',
        employeeName,
        employee?.pf_number || '',
        employeePf.toFixed(2),
        employerPf.toFixed(2),
        (employeePf + employerPf).toFixed(2),
      ].map(csvEscape).join(',');
    });

    await logHRMSAudit({
      action: 'pf_return_exported',
      entity_type: 'pf_management',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        run_count: runIds.length,
        row_count: rows.length,
      },
    });

    const csv = `${header.join(',')}\n${rows.join('\n')}\n`;
    const filename = month && year ? `pf-return-${year}-${String(month).padStart(2, '0')}.csv` : 'pf-return.csv';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to export PF return CSV' }, { status: 500 });
  }
}
