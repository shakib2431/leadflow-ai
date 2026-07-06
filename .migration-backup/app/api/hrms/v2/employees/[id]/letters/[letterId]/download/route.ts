import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';

export async function GET(req: Request, context: { params: Promise<{ id: string; letterId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id, letterId } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data: letter, error: fetchError } = await supabaseAdmin
    .from('employee_letters')
    .select('file_name,storage_path')
    .eq('id', letterId)
    .eq('employee_id', id)
    .maybeSingle();

  if (fetchError || !letter) {
    return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage.from('hr-docs').download(letter.storage_path);
  if (error || !data) {
    return NextResponse.json({ error: 'Letter file not found' }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${letter.file_name}"`,
    },
  });
}