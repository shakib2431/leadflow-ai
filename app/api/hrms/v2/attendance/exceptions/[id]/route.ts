import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { AttendanceExceptionStatus, updateAttendanceExceptionStatus } from '@/lib/hrms/attendanceExceptions';

const VALID_STATUS = new Set<AttendanceExceptionStatus>(['open', 'in_review', 'resolved', 'dismissed']);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const id = String(route?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 422 });

    const body = await req.json();
    const status = String(body?.status || '').trim().toLowerCase() as AttendanceExceptionStatus;
    const resolutionNote = body?.resolution_note ? String(body.resolution_note).trim() : null;

    if (!VALID_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid status. Use open, in_review, resolved, dismissed.' }, { status: 422 });
    }

    if ((status === 'resolved' || status === 'dismissed') && (!resolutionNote || resolutionNote.length < 5)) {
      return NextResponse.json({ error: 'resolution_note (minimum 5 chars) is required for resolved or dismissed status' }, { status: 422 });
    }

    const data = await updateAttendanceExceptionStatus({
      id,
      status,
      resolutionNote,
      resolvedBy: typeof auth.userId === 'string' ? auth.userId : null,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    const message = String(err?.message || 'Failed to update attendance exception');
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
