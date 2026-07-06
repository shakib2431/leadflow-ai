import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';

function parsePositiveInt(input: string | null, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const month = Number(url.searchParams.get('month') || 0);
  const year = Number(url.searchParams.get('year') || 0);
  const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(parsePositiveInt(url.searchParams.get('pageSize'), 20), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('payroll_runs')
    .select('id, period_month, period_year, status, finalized_at, created_at', { count: 'exact' })
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .range(from, to);

  if (month >= 1 && month <= 12) query = query.eq('period_month', month);
  if (year >= 2000 && year <= 2100) query = query.eq('period_year', year);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data || [],
    meta: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
}
