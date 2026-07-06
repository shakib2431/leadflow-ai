import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const action = String(body.action || '').trim();
    const reviewNote = body.review_note ? String(body.review_note).trim() : null;
    const actorId = typeof auth.userId === 'string' ? auth.userId : '';

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 422 });
    }

    if (action === 'reject' && (!reviewNote || reviewNote.length < 5)) {
      return NextResponse.json({ error: 'review_note (minimum 5 chars) is required for rejection' }, { status: 422 });
    }

    const { data: correction, error: correctionErr } = await supabaseAdmin
      .from('attendance_corrections')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (correctionErr) return NextResponse.json({ error: correctionErr.message }, { status: 500 });
    if (!correction) return NextResponse.json({ error: 'Correction request not found' }, { status: 404 });
    if (correction.status !== 'pending') {
      return NextResponse.json({ error: 'Correction request is already processed' }, { status: 409 });
    }

    if (new Date(`${correction.date}T00:00:00Z`).getTime() > Date.now()) {
      return NextResponse.json({ error: 'Cannot review corrections for future dates' }, { status: 422 });
    }

    if (action === 'approve') {
      const { error: upsertError } = await supabaseAdmin
        .from('attendance_records')
        .upsert(
          {
            employee_id: correction.employee_id,
            date: correction.date,
            status: correction.requested_status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employee_id,date' }
        );

      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabaseAdmin
      .from('attendance_corrections')
      .update({
        status: nextStatus,
        reviewed_by: UUID_RE.test(actorId) ? actorId : null,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, employee_id, date, current_status, requested_status, status, review_note, reviewed_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}