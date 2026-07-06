import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateRequired } from '@/lib/hrms/validators';

const ALLOWED = ['HR Admin', 'HR Executive', 'Employee'];

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin.from('user_roles').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const check = validateRequired(body, ['user_id', 'role']);
  if (!check.valid) return NextResponse.json({ error: 'Missing required fields', missing: check.missing }, { status: 422 });

  if (!ALLOWED.includes(String(body.role))) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 422 });
  }

  const payload = {
    user_id: String(body.user_id),
    role: String(body.role)
  };

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
