import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { AttendanceProvider, createAttendanceSource, listAttendanceSources } from '@/lib/hrms/attendanceSources';

const VALID_PROVIDERS = new Set<AttendanceProvider>(['manual', 'biometric_csv', 'biometric_api']);

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const data = await listAttendanceSources();
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch attendance sources' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const provider = String(body?.provider || '').trim().toLowerCase() as AttendanceProvider;

    if (!name || !provider) {
      return NextResponse.json({ error: 'name and provider are required' }, { status: 422 });
    }

    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Invalid provider. Use manual, biometric_csv, or biometric_api.' }, { status: 422 });
    }

    const data = await createAttendanceSource({
      name,
      provider,
      status: 'active',
      config: body?.config && typeof body.config === 'object' && !Array.isArray(body.config) ? body.config : {},
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
