import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseMonthYear } from '@/lib/hrms/payrollPhase8Schemas';
import { logHRMSAudit } from '@/lib/hrms/audit';

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const { month, year } = parseMonthYear(url.searchParams.get('month'), url.searchParams.get('year'));

  let runQuery = supabaseAdmin
    .from('payroll_runs')
    .select('id, period_month, period_year, status')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(24);

  if (month) runQuery = runQuery.eq('period_month', month);
  if (year) runQuery = runQuery.eq('period_year', year);

  const { data: runs, error: runsError } = await runQuery;
  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

  const runIds = (runs || []).map((row) => String(row.id));
  if (runIds.length === 0) {
    return new NextResponse('period_month,period_year,run_status,employee_code,employee_name,gross_earnings,net_pay,pf_employee,esi_employee,professional_tax,tds,lwf_employee\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payroll-report-empty.csv"',
      },
    });
  }

  const { data: lines, error: linesError } = await supabaseAdmin
    .from('payroll_line_items')
    .select('payroll_run_id, gross_earnings, net_pay, pf_employee, esi_employee, professional_tax, tds, lwf_employee, employees(first_name,last_name,employee_code)')
    .in('payroll_run_id', runIds);

  if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });

  const runMap = new Map((runs || []).map((row) => [String(row.id), row]));

  const header = [
    'period_month',
    'period_year',
    'run_status',
    'employee_code',
    'employee_name',
    'gross_earnings',
    'net_pay',
    'pf_employee',
    'esi_employee',
    'professional_tax',
    'tds',
    'lwf_employee',
  ];

  const rows = (lines || []).map((line: any) => {
    const run = runMap.get(String(line.payroll_run_id));
    const employee = Array.isArray(line.employees) ? line.employees[0] : line.employees;
    const employeeName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
    return [
      run?.period_month || '',
      run?.period_year || '',
      run?.status || '',
      employee?.employee_code || '',
      employeeName,
      Number(line.gross_earnings || 0).toFixed(2),
      Number(line.net_pay || 0).toFixed(2),
      Number(line.pf_employee || 0).toFixed(2),
      Number(line.esi_employee || 0).toFixed(2),
      Number(line.professional_tax || 0).toFixed(2),
      Number(line.tds || 0).toFixed(2),
      Number(line.lwf_employee || 0).toFixed(2),
    ].map(csvEscape).join(',');
  });

  const csv = `${header.join(',')}\n${rows.join('\n')}\n`;

  await logHRMSAudit({
    action: 'payroll_report_csv_exported',
    entity_type: 'payroll_report',
    actor_id: auth.userId,
    actor_email: auth.email,
    actor_role: auth.role,
    metadata: {
      month,
      year,
      run_count: runs?.length || 0,
      row_count: rows.length,
    },
  });

  const filename = month && year ? `payroll-report-${year}-${String(month).padStart(2, '0')}.csv` : 'payroll-report.csv';

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
