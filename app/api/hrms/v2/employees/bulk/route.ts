import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map((id: any) => String(id)).filter(Boolean) : [];
    const action = String(body.action || '');

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No employee ids provided' }, { status: 422 });
    }

    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid bulk action' }, { status: 422 });
    }

    if (action === 'archive') {
      const { error } = await supabaseAdmin
        .from('employees')
        .update({ archived_at: new Date().toISOString(), status: 'archived' })
        .in('id', ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, action, count: ids.length });
    }

    const { data: structures, error: structureError } = await supabaseAdmin
      .from('salary_structures')
      .select('employee_id, effective_to')
      .in('employee_id', ids)
      .is('effective_to', null);

    if (structureError) {
      return NextResponse.json({ error: structureError.message }, { status: 500 });
    }

    const eligibleIds = new Set((structures || []).map((row: any) => String(row.employee_id || '')));
    const activatable = ids.filter((id) => eligibleIds.has(id));
    const skipped = ids.filter((id) => !eligibleIds.has(id));

    if (activatable.length > 0) {
      const { error } = await supabaseAdmin
        .from('employees')
        .update({ archived_at: null, status: 'active', employment_status: 'active' })
        .in('id', activatable);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (skipped.length > 0) {
      await supabaseAdmin
        .from('employees')
        .update({ archived_at: null, status: 'onboarding', employment_status: 'onboarding' })
        .in('id', skipped);
    }

    return NextResponse.json({
      success: true,
      action,
      count: activatable.length,
      skipped_count: skipped.length,
      skipped_ids: skipped,
      warning: skipped.length > 0 ? 'Some employees were unarchived to onboarding due to missing active salary structure.' : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
