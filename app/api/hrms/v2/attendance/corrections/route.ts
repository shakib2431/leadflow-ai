import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

const REQUESTABLE_STATUSES = new Set(['present', 'absent', 'half_day']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function normalizeDate(input?: string | null) {
  if (!input) return null;
  const text = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') || 'pending').trim();
  const date = normalizeDate(url.searchParams.get('date'));
  const employeeId = String(url.searchParams.get('employee_id') || '').trim();
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 50), 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('attendance_corrections')
    .select('id, employee_id, date, current_status, requested_status, reason, status, review_note, reviewed_at, created_at, employees(first_name, last_name, employee_code)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (date) query = query.eq('date', date);
  if (employeeId) query = query.eq('employee_id', employeeId);

  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId) return NextResponse.json({ data: [] });
    query = query.eq('employee_id', scope.employeeId);
  }

  const { data, error, count } = await query;

  if (error) {
    // Allow rollout before migration application; UI can still render attendance without corrections.
    if (error.message.includes('attendance_corrections')) {
      return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
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
    const employeeId = String(body.employee_id || '').trim();
    const requestedStatus = String(body.requested_status || '').trim();
    const reason = String(body.reason || '').trim();
    const date = normalizeDate(body.date);
    const actorId = typeof auth.userId === 'string' ? auth.userId : '';

    if (!employeeId || !requestedStatus || !reason || !date) {
      return NextResponse.json({ error: 'employee_id, requested_status, date, and reason are required' }, { status: 422 });
    }
    if (!REQUESTABLE_STATUSES.has(requestedStatus)) {
      return NextResponse.json({ error: 'Invalid requested_status' }, { status: 422 });
    }

    if (reason.length < 5) {
      return NextResponse.json({ error: 'reason should be at least 5 characters' }, { status: 422 });
    }

    if (auth.role === 'Employee') {
      const scope = await getScopedEmployeeId(auth as any);
      if (scope.response) return scope.response;
      if (!scope.employeeId || scope.employeeId !== employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (new Date(date) > new Date()) {
      return NextResponse.json({ error: 'Cannot request correction for future dates.' }, { status: 422 });
    }

    const { data: attendanceRow } = await supabaseAdmin
      .from('attendance_records')
      .select('status')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle();

    const { data: existingPending, error: pendingError } = await supabaseAdmin
      .from('attendance_corrections')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError && !pendingError.message.includes('attendance_corrections')) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    if (existingPending?.id) {
      return NextResponse.json({ error: 'A pending correction already exists for this date' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_corrections')
      .insert([{
        employee_id: employeeId,
        date,
        current_status: attendanceRow?.status || null,
        requested_status: requestedStatus,
        reason,
        status: 'pending',
        requested_by: UUID_RE.test(actorId) ? actorId : null,
      }])
      .select('id, employee_id, date, current_status, requested_status, reason, status, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Best-effort admin email notification when configured.
    const notifyEnv = (process.env.HRMS_ADMIN_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL || '').trim();
    if (notifyEnv) {
      const recipients = notifyEnv
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      if (recipients.length > 0) {
        const { data: employeeProfile } = await supabaseAdmin
          .from('employees')
          .select('first_name,last_name,email,employee_code')
          .eq('id', employeeId)
          .maybeSingle();

        const employeeName = `${employeeProfile?.first_name || ''} ${employeeProfile?.last_name || ''}`.trim()
          || employeeProfile?.employee_code
          || 'Employee';

        const appBase = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
        const reviewLink = appBase ? `${appBase}/team/attendance-exceptions` : '/team/attendance-exceptions';

        await Promise.all(
          recipients.map((recipientEmail) =>
            sendNotificationEmail({
              event: 'attendance_correction_requested',
              recipient_email: recipientEmail,
              recipient_name: 'HR Admin',
              subject: `Attendance correction request: ${employeeName}`,
              data: {
                employee_name: employeeName,
                employee_email: employeeProfile?.email || auth.email || '',
                date,
                current_status: attendanceRow?.status || '-',
                requested_status: requestedStatus,
                reason,
                review_link: reviewLink,
              },
            })
          )
        );
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}