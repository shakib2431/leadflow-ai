import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { getPunchMapForDate } from '@/lib/hrms/attendancePunch';

const MARKABLE_STATUSES = new Set(['present', 'absent', 'half_day']);

function normalizeDate(input?: string | null) {
  if (!input) return new Date().toISOString().slice(0, 10);
  const text = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const date = normalizeDate(url.searchParams.get('date'));
  if (!date) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 422 });
  }

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;

  const employeeId = scope.employeeId;
  const isEmployee = auth.role === 'Employee';

  const employeesQuery = supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, status, employment_history!employment_history_employee_id_fkey (designation, effective_to)')
    .in('status', ['active', 'onboarding'])
    .order('first_name');

  const attendanceQuery = supabaseAdmin
    .from('attendance_records')
    .select('employee_id, status')
    .eq('date', date);

  const pendingPtoQuery = supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, leave_type, start_date, end_date, days_count, status, created_at, employees!leave_requests_employee_id_fkey(first_name, last_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const approvedPtoQuery = supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, leave_type, start_date, end_date, days_count, status, employees!leave_requests_employee_id_fkey(first_name, last_name)')
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date);

  if (isEmployee && employeeId) {
    employeesQuery.eq('id', employeeId);
    attendanceQuery.eq('employee_id', employeeId);
    pendingPtoQuery.eq('employee_id', employeeId);
    approvedPtoQuery.eq('employee_id', employeeId);
  }

  const [employeesRes, attendanceRes, pendingPtoRes, approvedPtoRes] = await Promise.all([
    employeesQuery,
    attendanceQuery,
    pendingPtoQuery,
    approvedPtoQuery,
  ]);

  if (employeesRes.error) return NextResponse.json({ error: employeesRes.error.message }, { status: 500 });
  if (attendanceRes.error) return NextResponse.json({ error: attendanceRes.error.message }, { status: 500 });
  if (pendingPtoRes.error) return NextResponse.json({ error: pendingPtoRes.error.message }, { status: 500 });
  if (approvedPtoRes.error) return NextResponse.json({ error: approvedPtoRes.error.message }, { status: 500 });

  const employeeIds = ((employeesRes.data || []) as Array<{ id: string }>).map((row) => String(row.id));
  const punchMap = await getPunchMapForDate(employeeIds, date);
  const attendanceRows = ((attendanceRes.data || []) as Array<{ employee_id: string; status: string }>).map((row) => ({
    ...row,
    check_in_at: punchMap[String(row.employee_id)]?.check_in_at || null,
    check_out_at: punchMap[String(row.employee_id)]?.check_out_at || null,
  }));

  return NextResponse.json({
    data: {
      date,
      employees: employeesRes.data || [],
      attendanceRecords: attendanceRows,
      pendingPTO: pendingPtoRes.data || [],
      approvedPTO: approvedPtoRes.data || [],
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const employeeId = String(body.employee_id || '').trim();
    const date = normalizeDate(body.date);
    const status = String(body.status || '').trim();

    if (!employeeId || !date || !status) {
      return NextResponse.json({ error: 'employee_id, date and status are required' }, { status: 422 });
    }

    if (auth.role === 'Employee') {
      const scope = await getScopedEmployeeId(auth as any);
      if (scope.response) return scope.response;
      if (!scope.employeeId || scope.employeeId !== employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    if (!MARKABLE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status. Use present, absent, or half_day.' }, { status: 422 });
    }
    if (new Date(date) > new Date()) {
      return NextResponse.json({ error: 'Cannot mark attendance for future dates.' }, { status: 422 });
    }

    const { error } = await supabaseAdmin
      .from('attendance_records')
      .upsert(
        {
          employee_id: employeeId,
          date,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,date' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { employee_id: employeeId, date, status } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}