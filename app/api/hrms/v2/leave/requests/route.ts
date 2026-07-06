import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { logHRMSAudit } from '@/lib/hrms/audit';
import { supabaseAdmin } from '@/lib/supabase-admin';

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function normalizeDate(value: unknown) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function calculateDaysCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / oneDay) + 1;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 20), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
  const employeeIdFilter = String(url.searchParams.get('employee_id') || '').trim();

  let employeeId: string | null = null;
  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    employeeId = scope.employeeId;
    if (!employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });
  }

  let query = supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, leave_type, start_date, end_date, days_count, status, created_at, employees!leave_requests_employee_id_fkey(first_name,last_name,employee_code,email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  } else if (employeeIdFilter) {
    query = query.eq('employee_id', employeeIdFilter);
  }

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requestIds = (data || []).map((row) => String(row.id || '')).filter(Boolean);
  let noteByRequestId = new Map<string, string>();

  if (requestIds.length > 0) {
    const { data: auditRows } = await supabaseAdmin
      .from('hrms_audit_logs')
      .select('entity_id, metadata, created_at')
      .eq('entity_type', 'leave_request')
      .eq('action', 'leave_request_created')
      .in('entity_id', requestIds);

    noteByRequestId = new Map(
      (auditRows || [])
        .map((row) => {
          const entityId = String(row.entity_id || '').trim();
          const metadata = (row.metadata && typeof row.metadata === 'object') ? row.metadata as Record<string, any> : {};
          const note = String(metadata.reason || metadata.note || '').trim();
          return entityId && note ? [entityId, note] : null;
        })
        .filter(Boolean) as Array<[string, string]>
    );
  }

  const enrichedRows = (data || []).map((row) => ({
    ...row,
    note: noteByRequestId.get(String(row.id || '')) || null,
  }));

  return NextResponse.json({
    data: enrichedRows,
    meta: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const leaveType = String(body.leave_type || '').trim().toLowerCase();
    const startDate = normalizeDate(body.start_date);
    const endDate = normalizeDate(body.end_date);

    if (!leaveType) {
      return NextResponse.json({ error: 'leave_type is required' }, { status: 422 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date must be YYYY-MM-DD' }, { status: 422 });
    }

    const daysCount = calculateDaysCount(startDate, endDate);
    if (!daysCount) {
      return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 422 });
    }

    let employeeId = String(body.employee_id || '').trim();

    if (auth.role === 'Employee') {
      const scope = await getScopedEmployeeId(auth as any);
      if (scope.response) return scope.response;
      if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });
      employeeId = scope.employeeId;
    } else if (!employeeId) {
      return NextResponse.json({ error: 'employee_id is required for admin-created leave requests' }, { status: 422 });
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .insert([
        {
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
          status: 'pending',
        },
      ])
      .select('id, employee_id, leave_type, start_date, end_date, days_count, status, created_at')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const requestNote = String(body.reason || body.note || '').trim();
    if (data?.id && requestNote) {
      await logHRMSAudit({
        action: 'leave_request_created',
        entity_type: 'leave_request',
        entity_id: String(data.id),
        actor_id: typeof auth.userId === 'string' ? auth.userId : null,
        actor_email: auth.email || null,
        actor_role: auth.role,
        metadata: {
          employee_id: employeeId,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
          reason: requestNote,
        },
      });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
