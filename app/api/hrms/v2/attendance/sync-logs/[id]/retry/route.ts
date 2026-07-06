import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { retryAttendanceSyncLog } from '@/lib/hrms/attendanceSources';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const logId = String(route?.id || '').trim();
    if (!logId) return NextResponse.json({ error: 'log id is required' }, { status: 422 });

    const data = await retryAttendanceSyncLog(logId, `${auth.userId || 'unknown'}:manual_retry`);
    return NextResponse.json({ data });
  } catch (err: any) {
    const msg = String(err?.message || 'Retry failed');
    const lower = msg.toLowerCase();
    const status = lower.includes('not found') ? 404 : lower.includes('retry not available') || lower.includes('invalid') ? 422 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
