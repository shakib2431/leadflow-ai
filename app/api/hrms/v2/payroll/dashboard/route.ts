import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logHRMSAudit } from '@/lib/hrms/audit';

function normalizeMonth(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 1 && value <= 12 ? Math.floor(value) : null;
}

function normalizeYear(input: string | null) {
  const value = Number(input);
  return Number.isFinite(value) && value >= 2000 && value <= 2100 ? Math.floor(value) : null;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const month = normalizeMonth(url.searchParams.get('month')) || new Date().getMonth() + 1;
    const year = normalizeYear(url.searchParams.get('year')) || new Date().getFullYear();

    const { data: runs, error: runsError } = await supabaseAdmin
      .from('payroll_runs')
      .select('id, period_month, period_year, status, created_at')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(24);

    if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

    const runIds = (runs || []).map((row) => String(row.id));
    let lineItems: any[] = [];

    if (runIds.length > 0) {
      const { data: lines, error: linesError } = await supabaseAdmin
        .from('payroll_line_items')
        .select('payroll_run_id, gross_earnings, net_pay, pf_employee, esi_employee, professional_tax, tds, lwf_employee')
        .in('payroll_run_id', runIds);
      if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 });
      lineItems = lines || [];
    }

    const targetRun = (runs || []).find((row) => Number(row.period_month) === month && Number(row.period_year) === year) || null;
    const targetLineItems = targetRun ? lineItems.filter((row) => String(row.payroll_run_id) === String(targetRun.id)) : [];

    const totals = targetLineItems.reduce(
      (acc, row) => {
        const gross = Number(row.gross_earnings || 0);
        const net = Number(row.net_pay || 0);
        const pf = Number(row.pf_employee || 0);
        const esi = Number(row.esi_employee || 0);
        const pt = Number(row.professional_tax || 0);
        const tds = Number(row.tds || 0);
        const lwf = Number(row.lwf_employee || 0);

        acc.gross += gross;
        acc.net += net;
        acc.deductions += gross - net;
        acc.pf += pf;
        acc.esi += esi;
        acc.pt += pt;
        acc.tds += tds;
        acc.lwf += lwf;
        return acc;
      },
      { gross: 0, net: 0, deductions: 0, pf: 0, esi: 0, pt: 0, tds: 0, lwf: 0 }
    );

    const statusCounts = { draft: 0, finalized: 0, paid: 0, processing: 0 } as Record<string, number>;
    for (const run of runs || []) {
      const status = String(run.status || '').toLowerCase();
      statusCounts[status] = Number(statusCounts[status] || 0) + 1;
    }

    const recentTrendMap = new Map<string, { month: number; year: number; gross: number; net: number }>();
    for (const run of runs || []) {
      const key = `${run.period_year}-${String(run.period_month).padStart(2, '0')}`;
      if (!recentTrendMap.has(key)) {
        recentTrendMap.set(key, { month: Number(run.period_month), year: Number(run.period_year), gross: 0, net: 0 });
      }
    }
    for (const run of runs || []) {
      const key = `${run.period_year}-${String(run.period_month).padStart(2, '0')}`;
      const bucket = recentTrendMap.get(key);
      if (!bucket) continue;
      const rows = lineItems.filter((line) => String(line.payroll_run_id) === String(run.id));
      for (const row of rows) {
        bucket.gross += Number(row.gross_earnings || 0);
        bucket.net += Number(row.net_pay || 0);
      }
    }

    const trend = Array.from(recentTrendMap.values())
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
      .slice(-6);

    await logHRMSAudit({
      action: 'payroll_dashboard_viewed',
      entity_type: 'payroll_dashboard',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        month,
        year,
        run_id: targetRun?.id || null,
        employee_count: targetLineItems.length,
      },
    });

    return NextResponse.json({
      data: {
        period: { month, year },
        run: targetRun,
        totals,
        employeeCount: targetLineItems.length,
        statusCounts,
        trend,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch payroll dashboard' }, { status: 500 });
  }
}
