import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  try {
    const body = await req.json();
    const payload = {
      name: body.name ? String(body.name).trim() : undefined,
      code: body.code === undefined ? undefined : (body.code ? String(body.code).trim() : null),
      business_entity_id: body.business_entity_id ? String(body.business_entity_id) : undefined,
      is_active: body.is_active === undefined ? undefined : Boolean(body.is_active),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const { error } = await supabaseAdmin.from('departments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
