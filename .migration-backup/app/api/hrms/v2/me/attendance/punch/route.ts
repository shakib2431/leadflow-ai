import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { recordAttendancePunch } from '@/lib/hrms/attendancePunch';

export async function POST(req: Request) {
  const auth = await requireRole(req, ['Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) {
    return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const action = String(body?.action || '').trim().toLowerCase();

    if (action !== 'check_in' && action !== 'check_out') {
      return NextResponse.json({ error: 'action must be check_in or check_out' }, { status: 422 });
    }

    const data = await recordAttendancePunch({
      employeeId: scope.employeeId,
      date: body?.date,
      action,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process attendance punch' }, { status: 400 });
  }
}
