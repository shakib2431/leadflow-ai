import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getEmployeePunchForDate } from '@/lib/hrms/attendancePunch';
import { getUpcomingHolidays } from '@/lib/hrms/companyHolidays';

const WORK_MODES = new Set(['office', 'remote', 'hybrid']);

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusRank(status: string): number {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 3;
  if (normalized === 'finalized') return 2;
  if (normalized === 'draft') return 1;
  return 0;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });

  const employeeId = scope.employeeId;
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Fetch employee separately so we can retry without avatar_url if column is missing
  let employeeRes = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, email, employee_code, status, work_location, date_of_joining, avatar_url, photo_url, designation, current_title, designation_id, department_id')
    .eq('id', employeeId)
    .maybeSingle();

  // Optional columns may not exist in some environments - retry with stable baseline fields
  if (
    employeeRes.error &&
    ['avatar_url', 'designation', 'current_title'].some((column) => String(employeeRes.error?.message || '').includes(column))
  ) {
    employeeRes = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, email, employee_code, status, work_location, date_of_joining, photo_url, designation_id, department_id')
      .eq('id', employeeId)
      .maybeSingle();
  }

  const employmentHistoryRes = await supabaseAdmin
    .from('employment_history')
    .select('designation, department, effective_from, effective_to')
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false })
    .limit(5);

  const [designationRes, departmentRes] = await Promise.all([
    employeeRes.data?.designation_id
      ? supabaseAdmin.from('designations').select('id, name').eq('id', employeeRes.data.designation_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    employeeRes.data?.department_id
      ? supabaseAdmin.from('departments').select('id, name').eq('id', employeeRes.data.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  if (designationRes.error) return NextResponse.json({ error: designationRes.error.message }, { status: 500 });
  if (departmentRes.error) return NextResponse.json({ error: departmentRes.error.message }, { status: 500 });
  if (employmentHistoryRes.error) return NextResponse.json({ error: employmentHistoryRes.error.message }, { status: 500 });

  const activeHistory = (employmentHistoryRes.data || []).find((row: any) => !row.effective_to) || (employmentHistoryRes.data || [])[0] || null;

  const [todayAttendanceRes, attendanceRes, leaveRes, approvedLeaveRes, latestPayslipRowsRes] = await Promise.all([
    supabaseAdmin
      .from('attendance_records')
      .select('date, status')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle(),
    supabaseAdmin
      .from('attendance_records')
      .select('date, status')
      .eq('employee_id', employeeId)
      .gte('date', thirtyDaysAgo)
      .lte('date', today)
      .order('date', { ascending: false }),
    supabaseAdmin
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, days_count, status, created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, days_count, status')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(5),
    supabaseAdmin
      .from('payroll_line_items')
      .select('id, payroll_run_id, gross_earnings, net_pay, tds, created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (employeeRes.error) return NextResponse.json({ error: employeeRes.error.message }, { status: 500 });
  if (todayAttendanceRes.error) return NextResponse.json({ error: todayAttendanceRes.error.message }, { status: 500 });
  if (attendanceRes.error) return NextResponse.json({ error: attendanceRes.error.message }, { status: 500 });
  if (leaveRes.error) return NextResponse.json({ error: leaveRes.error.message }, { status: 500 });
  if (approvedLeaveRes.error) return NextResponse.json({ error: approvedLeaveRes.error.message }, { status: 500 });
  if (latestPayslipRowsRes.error) return NextResponse.json({ error: latestPayslipRowsRes.error.message }, { status: 500 });

  const todayPunch = await getEmployeePunchForDate(employeeId, today);

  const payslipRows = latestPayslipRowsRes.data || [];
  const runIds = Array.from(new Set(payslipRows.map((row: any) => String(row.payroll_run_id || '')).filter(Boolean)));

  let runsById = new Map<string, any>();
  if (runIds.length > 0) {
    const { data: runRows, error: runError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status, created_at')
      .in('id', runIds);

    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });
    runsById = new Map((runRows || []).map((run: any) => [String(run.id), run]));
  }

  const latestPayslip = payslipRows
    .map((row: any) => ({ row, run: runsById.get(String(row.payroll_run_id || '')) }))
    .filter((item: any) => {
      const status = String(item.run?.status || '').toLowerCase();
      return status === 'draft' || status === 'finalized' || status === 'paid';
    })
    .sort((a: any, b: any) => {
      const aStatus = statusRank(a.run?.status);
      const bStatus = statusRank(b.run?.status);
      if (aStatus !== bStatus) return bStatus - aStatus;

      const aHasNet = toFiniteNumber(a.row?.net_pay) != null ? 1 : 0;
      const bHasNet = toFiniteNumber(b.row?.net_pay) != null ? 1 : 0;
      if (aHasNet !== bHasNet) return bHasNet - aHasNet;

      const aYear = Number(a.run?.period_year || 0);
      const bYear = Number(b.run?.period_year || 0);
      if (aYear !== bYear) return bYear - aYear;

      const aMonth = Number(a.run?.period_month || 0);
      const bMonth = Number(b.run?.period_month || 0);
      if (aMonth !== bMonth) return bMonth - aMonth;

      const aTime = new Date(String(a.run?.finalized_at || a.run?.created_at || a.row?.created_at || 0)).getTime();
      const bTime = new Date(String(b.run?.finalized_at || b.run?.created_at || b.row?.created_at || 0)).getTime();
      return bTime - aTime;
    })[0] || null;

  return NextResponse.json({
    data: {
      employee: {
        ...employeeRes.data,
        avatar_url: employeeRes.data?.avatar_url || employeeRes.data?.photo_url || null,
        designation: designationRes.data?.name || employeeRes.data?.designation || employeeRes.data?.current_title || activeHistory?.designation || null,
        department: departmentRes.data?.name || activeHistory?.department || null,
      },
      todayAttendance: todayAttendanceRes.data,
      todayPunch,
      attendanceLast30Days: attendanceRes.data || [],
      leaveHistory: leaveRes.data || [],
      upcomingApprovedLeave: approvedLeaveRes.data || [],
      calendar: {
        holidays: getUpcomingHolidays(today),
      },
      payroll: {
        enabled: true,
        message: latestPayslip
          ? String(latestPayslip.run?.status || '').toLowerCase() === 'draft'
            ? 'Latest payroll run is in draft and awaiting HR finalization.'
            : 'Your payroll and tax deductions are available below.'
          : 'No finalized payslips are available yet.',
        latest_payslip: latestPayslip
          ? {
              id: latestPayslip.row.id,
              period_month: latestPayslip.run?.period_month,
              period_year: latestPayslip.run?.period_year,
              gross_earnings: toFiniteNumber(latestPayslip.row.gross_earnings) ?? 0,
              net_pay: toFiniteNumber(latestPayslip.row.net_pay),
              tds: toFiniteNumber(latestPayslip.row.tds) ?? 0,
              run_status: latestPayslip.run?.status || 'unknown',
            }
          : null,
      },
      workMode: {
        value: String(employeeRes.data?.work_location || '').trim().toLowerCase() || 'office',
      },
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ['Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });

  try {
    const body = await req.json();
    const workMode = String(body.work_mode || '').trim().toLowerCase();

    if (!WORK_MODES.has(workMode)) {
      return NextResponse.json({ error: 'work_mode must be office, remote, or hybrid' }, { status: 422 });
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({ work_location: workMode, updated_at: new Date().toISOString() })
      .eq('id', scope.employeeId)
      .select('id, work_location')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}