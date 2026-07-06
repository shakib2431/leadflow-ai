import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { listAuditLogs } from '@/lib/hrms/adminConsole';

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
    const page = parsePositiveInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 25), 200);
    const action = String(url.searchParams.get('action') || '').trim();
    const actorRole = String(url.searchParams.get('actor_role') || '').trim();
    const q = String(url.searchParams.get('q') || '').trim();

    const result = await listAuditLogs({ page, pageSize, action, actorRole, q });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch audit logs' }, { status: 500 });
  }
}
