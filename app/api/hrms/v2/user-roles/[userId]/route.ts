import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function DELETE(req: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;
  const { userId } = await context.params;

  const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
