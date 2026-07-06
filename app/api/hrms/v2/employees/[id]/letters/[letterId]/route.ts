import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; letterId: string }> }
) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id, letterId } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data, error } = await supabaseAdmin
    .from('employee_letters')
    .select('id,employee_id,template_key,template_version,letter_type,file_name,storage_path,rendered_subject,rendered_body,merge_payload,created_at,regenerated_from')
    .eq('id', letterId)
    .eq('employee_id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Letter not found' }, { status: 404 });

  return NextResponse.json({ data });
}