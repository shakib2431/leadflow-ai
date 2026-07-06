import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const action = String(body.action || '').trim().toLowerCase();

    if (!['approve', 'mark_paid', 'reopen_draft'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve, mark_paid or reopen_draft' }, { status: 422 });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, status, finalized_at')
      .eq('id', id)
      .maybeSingle();

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });

    let nextStatus = existing.status;
    let finalizedAt = existing.finalized_at || null;

    if (action === 'approve') {
      if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft runs can be approved' }, { status: 409 });
      }
      nextStatus = 'finalized';
      finalizedAt = new Date().toISOString();
    }

    if (action === 'mark_paid') {
      if (existing.status !== 'finalized') {
        return NextResponse.json({ error: 'Only finalized runs can be marked paid' }, { status: 409 });
      }
      nextStatus = 'paid';
    }

    if (action === 'reopen_draft') {
      if (auth.role !== 'HR Admin') {
        return NextResponse.json({ error: 'Only HR Admin can reopen finalized runs' }, { status: 403 });
      }
      if (existing.status !== 'finalized') {
        return NextResponse.json({ error: 'Only finalized runs can be reopened' }, { status: 409 });
      }
      nextStatus = 'draft';
    }

    const { data, error } = await supabaseAdmin
      .from('payroll_runs')
      .update({ status: nextStatus, finalized_at: finalizedAt })
      .eq('id', id)
      .select('id, period_month, period_year, status, finalized_at, created_at')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
