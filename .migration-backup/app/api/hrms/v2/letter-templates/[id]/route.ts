import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.subject_template !== undefined) patch.subject_template = String(body.subject_template);
    if (body.body_template !== undefined) patch.body_template = String(body.body_template);
    if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

    if (patch.is_active === true) {
      const { data: currentRow } = await supabaseAdmin
        .from('hr_letter_templates')
        .select('template_key')
        .eq('id', id)
        .maybeSingle();

      if (currentRow?.template_key) {
        await supabaseAdmin
          .from('hr_letter_templates')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('template_key', currentRow.template_key);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('hr_letter_templates')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}