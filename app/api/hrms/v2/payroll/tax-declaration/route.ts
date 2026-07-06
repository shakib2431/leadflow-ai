import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateTDS } from '@/lib/compliance/calculateTDS';
import {
  EmployeeTaxRegime,
  getEmployeeTaxDeclaration,
  upsertEmployeeTaxDeclaration,
} from '@/lib/hrms/taxDeclarations';

function parseAmount(value: unknown, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.round(num), max);
}

function parseRegime(value: unknown): EmployeeTaxRegime {
  return String(value || '').toUpperCase() === 'OLD' ? 'OLD' : 'NEW';
}

async function resolveEmployeeId(req: Request, auth: any) {
  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth);
    if (scope.response) return { error: scope.response };
    if (!scope.employeeId) return { error: NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 }) };
    return { employeeId: scope.employeeId };
  }

  const employeeId = String(new URL(req.url).searchParams.get('employee_id') || '').trim();
  if (!employeeId) {
    return { error: NextResponse.json({ error: 'employee_id is required for HR roles' }, { status: 422 }) };
  }
  return { employeeId };
}

async function getMonthlyGross(employeeId: string) {
  const { data, error } = await supabaseAdmin
    .from('salary_structures')
    .select('ctc_annual, salary_components(amount_monthly)')
    .eq('employee_id', employeeId)
    .is('effective_to', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return 0;

  const fromComponents = (data.salary_components || []).reduce((sum: number, row: any) => sum + Number(row.amount_monthly || 0), 0);
  if (fromComponents > 0) return fromComponents;

  const annual = Number(data.ctc_annual || 0);
  return annual > 0 ? Math.round(annual / 12) : 0;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const resolved = await resolveEmployeeId(req, auth as any);
  if ('error' in resolved) return resolved.error;

  try {
    const declaration = await getEmployeeTaxDeclaration(resolved.employeeId);
    const monthlyGross = await getMonthlyGross(resolved.employeeId);

    const tds = calculateTDS(
      0,
      monthlyGross * 12,
      declaration.regime,
      declaration.declared_80c + declaration.declared_80d,
      12
    );

    return NextResponse.json({
      data: {
        ...declaration,
        simulation: {
          monthly_gross: monthlyGross,
          annual_taxable_income: tds.taxableIncome,
          annual_tax: tds.annualTax,
          estimated_monthly_tds: tds.monthlyTDS,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch tax declaration' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const resolved = await resolveEmployeeId(req, auth as any);
  if ('error' in resolved) return resolved.error;

  try {
    const body = await req.json();
    const regime = parseRegime(body.regime);
    const declared80c = parseAmount(body.declared_80c, 150000);
    const declared80d = parseAmount(body.declared_80d, 100000);

    const data = await upsertEmployeeTaxDeclaration({
      employee_id: resolved.employeeId,
      regime,
      declared_80c: declared80c,
      declared_80d: declared80d,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save tax declaration' }, { status: 500 });
  }
}
