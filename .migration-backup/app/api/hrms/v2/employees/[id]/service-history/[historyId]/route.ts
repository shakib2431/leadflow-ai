import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function PUT(req: Request, context: { params: Promise<{ id: string; historyId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id, historyId } = await context.params;
    const body = await req.json();
    const payload = {
      designation: body.designation ? String(body.designation).trim() : undefined,
      department: body.department ? String(body.department).trim() : undefined,
      effective_from: body.effective_from ? String(body.effective_from) : undefined,
      effective_to: body.effective_to === undefined ? undefined : (body.effective_to ? String(body.effective_to) : null),
    };

    const { data, error } = await supabaseAdmin
      .from('employment_history')
      .update(payload)
      .eq('id', historyId)
      .eq('employee_id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; historyId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;
  const { id, historyId } = await context.params;

  const { error } = await supabaseAdmin
    .from('employment_history')
    .delete()
    .eq('id', historyId)
    .eq('employee_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
