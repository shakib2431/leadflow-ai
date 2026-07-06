import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateRequired } from '@/lib/hrms/validators';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from('hr_letter_templates')
    .select('*')
    .order('template_key')
    .order('version', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const required = validateRequired(body, ['template_key', 'name', 'letter_type', 'subject_template', 'body_template']);
    if (!required.valid) {
      return NextResponse.json({ error: 'Missing required fields', missing: required.missing }, { status: 422 });
    }

    const payload = {
      template_key: String(body.template_key).trim(),
      name: String(body.name).trim(),
      letter_type: String(body.letter_type).trim(),
      subject_template: String(body.subject_template),
      body_template: String(body.body_template),
      version: Number(body.version) > 0 ? Number(body.version) : 1,
      is_active: body.is_active !== false,
      created_by: auth.userId,
      updated_at: new Date().toISOString(),
    };

    const allowedTypes = new Set(['offer', 'appointment', 'contract']);
    if (!allowedTypes.has(payload.letter_type)) {
      return NextResponse.json({ error: 'letter_type must be one of: offer, appointment, contract' }, { status: 422 });
    }

    if (payload.is_active) {
      await supabaseAdmin
        .from('hr_letter_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('template_key', payload.template_key);
    }

    const { data, error } = await supabaseAdmin
      .from('hr_letter_templates')
      .insert([payload])
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}