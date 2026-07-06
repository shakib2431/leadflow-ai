import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { buildHRMSReportCenter } from '@/lib/hrms/reportCenter';
import { logHRMSAudit } from '@/lib/hrms/audit';

function parseMonth(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 1 && value <= 12 ? Math.floor(value) : new Date().getMonth() + 1;
}

function parseYear(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 2000 && value <= 2100 ? Math.floor(value) : new Date().getFullYear();
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(data: any, section: string) {
  if (section === 'department') {
    const header = ['department_id', 'employee_count', 'attendance_present', 'attendance_total', 'present_rate_percent', 'payroll_net'];
    const rows = (data.departmentBreakdown || []).map((row: any) =>
      [row.department_id, row.employee_count, row.attendance_present, row.attendance_total, row.present_rate_percent, row.payroll_net]
        .map(csvEscape)
        .join(',')
    );
    return `${header.join(',')}\n${rows.join('\n')}\n`;
  }

  if (section === 'employees') {
    const header = ['employee_id', 'employee_code', 'employee_name', 'gross_earnings', 'net_pay'];
    const rows = (data.topEmployees || []).map((row: any) =>
      [row.employee_id, row.employee_code || '', row.employee_name, row.gross_earnings, row.net_pay].map(csvEscape).join(',')
    );
    return `${header.join(',')}\n${rows.join('\n')}\n`;
  }

  const header = ['metric', 'value'];
  const rows = Object.entries(data.kpis || {}).map(([key, value]) => [key, value].map(csvEscape).join(','));
  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = parseMonth(url.searchParams.get('month'));
    const year = parseYear(url.searchParams.get('year'));
    const format = String(url.searchParams.get('format') || 'csv').trim().toLowerCase();
    const section = String(url.searchParams.get('section') || 'summary').trim().toLowerCase();

    const data = await buildHRMSReportCenter({
      month,
      year,
      businessEntityId: String(url.searchParams.get('business_entity_id') || '').trim() || undefined,
      departmentId: String(url.searchParams.get('department_id') || '').trim() || undefined,
      designationId: String(url.searchParams.get('designation_id') || '').trim() || undefined,
      employeeStatus: String(url.searchParams.get('employee_status') || '').trim() || undefined,
      includeArchived: String(url.searchParams.get('include_archived') || '').trim().toLowerCase() === 'true',
    });

    await logHRMSAudit({
      action: 'report_center_exported',
      entity_type: 'report_center',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: { month, year, format, section },
    });

    if (format === 'json') {
      return NextResponse.json({ data });
    }

    const csv = toCsv(data, section);
    const filename = `hrms-report-${section}-${year}-${String(month).padStart(2, '0')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to export report center data' }, { status: 500 });
  }
}
