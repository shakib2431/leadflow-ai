import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getAttendanceSourceHealthMetrics } from '@/lib/hrms/attendanceSources';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const data = await getAttendanceSourceHealthMetrics();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch attendance source metrics' }, { status: 500 });
  }
}
