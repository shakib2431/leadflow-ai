import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import {
  AttendanceExceptionSeverity,
  AttendanceExceptionStatus,
  AttendanceExceptionType,
  detectAttendanceExceptionsForDate,
  getAttendanceExceptionSummary,
  listAttendanceExceptions,
} from '@/lib/hrms/attendanceExceptions';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function normalizeDate(input?: string | null) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 25), 200);
    const status = String(url.searchParams.get('status') || '').trim().toLowerCase() as AttendanceExceptionStatus;
    const severity = String(url.searchParams.get('severity') || '').trim().toLowerCase() as AttendanceExceptionSeverity;
    const exceptionType = String(url.searchParams.get('exception_type') || '').trim().toLowerCase() as AttendanceExceptionType;
    const date = normalizeDate(url.searchParams.get('date')) || undefined;

    let employeeId = String(url.searchParams.get('employee_id') || '').trim();

    if (auth.role === 'Employee') {
      const scope = await getScopedEmployeeId(auth as any);
      if (scope.response) return scope.response;
      employeeId = String(scope.employeeId || '').trim();
      if (!employeeId) {
        return NextResponse.json({ data: [], meta: { page, pageSize, total: 0, totalPages: 1 }, summary: { total: 0, bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }, byType: { missing_attendance: 0, unplanned_absence: 0, pending_correction: 0, repeated_absence: 0 } } });
      }
    }

    const listing = await listAttendanceExceptions({
      page,
      pageSize,
      status,
      severity,
      exceptionType,
      employeeId,
      date,
    });

    const summary = await getAttendanceExceptionSummary({
      status: status || undefined,
      date,
    });

    return NextResponse.json({ data: listing.data, meta: listing.meta, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch attendance exceptions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const date = normalizeDate(body?.date) || new Date().toISOString().slice(0, 10);
    const data = await detectAttendanceExceptionsForDate({ date, detectedBy: auth.userId });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to detect attendance exceptions' }, { status: 400 });
  }
}
