import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateRequired } from '@/lib/hrms/validators';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin.from('business_entities').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const check = validateRequired(body, ['name']);
  if (!check.valid) return NextResponse.json({ error: 'Missing required fields', missing: check.missing }, { status: 422 });

  const payload = {
    name: String(body.name).trim(),
    code: body.code ? String(body.code).trim() : null,
    is_active: body.is_active !== false
  };

  const { data, error } = await supabaseAdmin.from('business_entities').insert([payload]).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
