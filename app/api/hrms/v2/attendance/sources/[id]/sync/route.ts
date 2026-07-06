import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { runAttendanceSync } from '@/lib/hrms/attendanceSources';

const VALID_STATUSES = new Set(['present', 'absent', 'half_day']);

function normalizeDate(input?: string | null) {
  const value = String(input || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const sourceId = String(route?.id || '').trim();
    const body = await req.json();
    const syncDate = normalizeDate(body?.sync_date) || new Date().toISOString().slice(0, 10);

    if (!sourceId) {
      return NextResponse.json({ error: 'source id is required' }, { status: 422 });
    }

    const rawEntries = Array.isArray(body?.entries) ? body.entries : [];
    const entries = rawEntries
      .map((row: any) => ({
        employee_id: String(row?.employee_id || '').trim(),
        date: normalizeDate(row?.date) || syncDate,
        status: String(row?.status || '').trim().toLowerCase(),
      }))
      
      .filter((row: any) => row.employee_id && row.date && VALID_STATUSES.has(row.status));

    const data = await runAttendanceSync({
      sourceId,
      syncDate,
      entries: entries as any,
      triggeredBy: auth.userId,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to run source sync' }, { status: 400 });
  }
}
