import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateRequired } from '@/lib/hrms/validators';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data, error } = await supabaseAdmin
    .from('employment_history')
    .select('*')
    .eq('employee_id', id)
    .order('effective_from', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const check = validateRequired(body, ['designation', 'department', 'effective_from']);
    if (!check.valid) return NextResponse.json({ error: 'Missing required fields', missing: check.missing }, { status: 422 });

    const payload = {
      employee_id: id,
      designation: String(body.designation).trim(),
      department: String(body.department).trim(),
      effective_from: String(body.effective_from),
      effective_to: body.effective_to ? String(body.effective_to) : null,
    };

    const { data, error } = await supabaseAdmin.from('employment_history').insert([payload]).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
