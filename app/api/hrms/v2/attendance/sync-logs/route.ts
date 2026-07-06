import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { listAttendanceSyncLogs } from '@/lib/hrms/attendanceSources';

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const sourceId = String(url.searchParams.get('source_id') || '').trim();
    const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
    const limit = Math.min(parsePositiveInt(url.searchParams.get('limit'), 25), 200);

    const data = await listAttendanceSyncLogs({
      sourceId,
      status: status === 'success' || status === 'failed' ? (status as 'success' | 'failed') : undefined,
      limit,
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sync logs' }, { status: 500 });
  }
}
