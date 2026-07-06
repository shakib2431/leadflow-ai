import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateWageFloor } from '@/lib/compliance/validateWageFloor';
import { logHRMSAudit } from '@/lib/hrms/audit';
import { normalizeDate, sanitizeComponents, validateComponents, validateCtcAnnual } from '@/lib/hrms/payrollPhase8Schemas';

async function getWageFloorPercent() {
  const { data } = await supabaseAdmin
    .from('compliance_rules')
    .select('value_numeric')
    .eq('rule_type', 'WAGE_FLOOR_PERCENT')
    .maybeSingle();
  const percent = Number(data?.value_numeric || 0.5);
  return percent > 0 && percent <= 1 ? percent : 0.5;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const employeeId = String(url.searchParams.get('employee_id') || '').trim();
  const includeArchived = String(url.searchParams.get('includeArchived') || '').trim().toLowerCase() === 'true';

  let query = supabaseAdmin
    .from('salary_structures')
    .select('id, employee_id, ctc_annual, effective_from, effective_to, created_at, updated_at, salary_components(id, component_name, component_type, amount_monthly)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!includeArchived) query = query.is('effective_to', null);
  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logHRMSAudit({
    action: 'salary_structures_listed',
    entity_type: 'salary_structure',
    actor_id: auth.userId,
    actor_email: auth.email,
    actor_role: auth.role,
    metadata: { employee_id: employeeId || null, include_archived: includeArchived, rows: (data || []).length },
  });

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const employeeId = String(body?.employee_id || '').trim();
    const ctcValidation = validateCtcAnnual(body?.ctc_annual);
    if (!ctcValidation.ok) {
      return NextResponse.json({ error: ctcValidation.error }, { status: 422 });
    }
    const ctcAnnual = ctcValidation.value;
    const effectiveFrom = normalizeDate(body?.effective_from) || new Date().toISOString().slice(0, 10);
    const components = sanitizeComponents(body?.components);
    const componentValidation = validateComponents(components);
    if (!componentValidation.ok) {
      return NextResponse.json({ error: componentValidation.error }, { status: 422 });
    }

    if (!employeeId || !effectiveFrom) {
      return NextResponse.json({ error: 'employee_id, ctc_annual and valid effective_from are required' }, { status: 422 });
    }

    const wageFloorPercent = await getWageFloorPercent();
    const compliance = validateWageFloor(components, ctcAnnual, wageFloorPercent);

    if (!compliance.isCompliant) {
      return NextResponse.json(
        {
          error: 'Compliance Violation: Salary structure does not meet statutory wage floor.',
          details: {
            wage_floor_percent: wageFloorPercent,
            required_wage_base: (ctcAnnual / 12) * wageFloorPercent,
            actual_wage_base: compliance.wageBase,
            excess_allowances: compliance.excessAmount,
          },
        },
        { status: 400 }
      );
    }

    const prevDate = new Date(`${effectiveFrom}T00:00:00.000Z`);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevEffectiveTo = prevDate.toISOString().slice(0, 10);

    await supabaseAdmin
      .from('salary_structures')
      .update({ effective_to: prevEffectiveTo, updated_at: new Date().toISOString() })
      .eq('employee_id', employeeId)
      .is('effective_to', null);

    const { data: structure, error: structureError } = await supabaseAdmin
      .from('salary_structures')
      .insert({ employee_id: employeeId, ctc_annual: ctcAnnual, effective_from: effectiveFrom })
      .select('id, employee_id, ctc_annual, effective_from, effective_to, created_at, updated_at')
      .single();

    if (structureError) return NextResponse.json({ error: structureError.message }, { status: 500 });

    const componentRows = components.map((row) => ({
      salary_structure_id: structure.id,
      component_name: row.component_name,
      component_type: row.component_type,
      amount_monthly: row.amount_monthly,
    }));

    const { error: componentsError } = await supabaseAdmin.from('salary_components').insert(componentRows);
    if (componentsError) return NextResponse.json({ error: componentsError.message }, { status: 500 });

    await logHRMSAudit({
      action: 'salary_structure_created',
      entity_type: 'salary_structure',
      entity_id: structure.id,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        employee_id: employeeId,
        effective_from: effectiveFrom,
        component_count: componentRows.length,
        ctc_annual: ctcAnnual,
      },
    });

    return NextResponse.json({
      data: {
        ...structure,
        components: componentRows,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
