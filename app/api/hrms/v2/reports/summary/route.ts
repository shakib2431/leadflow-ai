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

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = parseMonth(url.searchParams.get('month'));
    const year = parseYear(url.searchParams.get('year'));

    const businessEntityId = String(url.searchParams.get('business_entity_id') || '').trim() || undefined;
    const departmentId = String(url.searchParams.get('department_id') || '').trim() || undefined;
    const designationId = String(url.searchParams.get('designation_id') || '').trim() || undefined;
    const employeeStatus = String(url.searchParams.get('employee_status') || '').trim() || undefined;
    const includeArchived = String(url.searchParams.get('include_archived') || '').trim().toLowerCase() === 'true';

    const data = await buildHRMSReportCenter({
      month,
      year,
      businessEntityId,
      departmentId,
      designationId,
      employeeStatus,
      includeArchived,
    });

    await logHRMSAudit({
      action: 'report_center_summary_viewed',
      entity_type: 'report_center',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        business_entity_id: businessEntityId || null,
        department_id: departmentId || null,
        designation_id: designationId || null,
        employee_status: employeeStatus || null,
        include_archived: includeArchived,
      },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch report center summary' }, { status: 500 });
  }
}
