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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const id = String(route?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 422 });

    const body = await req.json();
    const ctcParsed = body?.ctc_annual === undefined ? null : validateCtcAnnual(body?.ctc_annual);
    if (ctcParsed && !ctcParsed.ok) {
      return NextResponse.json({ error: ctcParsed.error }, { status: 422 });
    }
    const ctcAnnual = ctcParsed?.ok ? ctcParsed.value : Number.NaN;
    const effectiveFrom = body?.effective_from === undefined ? undefined : normalizeDate(body?.effective_from);
    const components = body?.components === undefined ? undefined : sanitizeComponents(body?.components);
    if (components !== undefined) {
      const componentValidation = validateComponents(components);
      if (!componentValidation.ok) {
        return NextResponse.json({ error: componentValidation.error }, { status: 422 });
      }
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('salary_structures')
      .select('id, employee_id, ctc_annual')
      .eq('id', id)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });

    const finalCtcAnnual = Number.isFinite(ctcAnnual) ? ctcAnnual : Number(existing.ctc_annual || 0);

    if (components && components.length > 0) {
      const wageFloorPercent = await getWageFloorPercent();
      const compliance = validateWageFloor(components, finalCtcAnnual, wageFloorPercent);
      if (!compliance.isCompliant) {
        return NextResponse.json(
          {
            error: 'Compliance Violation: Salary structure does not meet statutory wage floor.',
            details: {
              wage_floor_percent: wageFloorPercent,
              required_wage_base: (finalCtcAnnual / 12) * wageFloorPercent,
              actual_wage_base: compliance.wageBase,
              excess_allowances: compliance.excessAmount,
            },
          },
          { status: 400 }
        );
      }
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (Number.isFinite(ctcAnnual)) payload.ctc_annual = ctcAnnual;
    if (body?.effective_from !== undefined) payload.effective_from = effectiveFrom;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('salary_structures')
      .update(payload)
      .eq('id', id)
      .select('id, employee_id, ctc_annual, effective_from, effective_to, updated_at')
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (components && components.length > 0) {
      const { error: deleteError } = await supabaseAdmin.from('salary_components').delete().eq('salary_structure_id', id);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

      const insertRows = components.map((row) => ({
        salary_structure_id: id,
        component_name: row.component_name,
        component_type: row.component_type,
        amount_monthly: row.amount_monthly,
      }));
      const { error: insertError } = await supabaseAdmin.from('salary_components').insert(insertRows);
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await logHRMSAudit({
      action: 'salary_structure_updated',
      entity_type: 'salary_structure',
      entity_id: id,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        employee_id: existing.employee_id,
        ctc_annual: Number.isFinite(ctcAnnual) ? ctcAnnual : null,
        effective_from: effectiveFrom,
        components_updated: !!components,
        component_count: components?.length || 0,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const id = String(route?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 422 });

    const archivedDate = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin
      .from('salary_structures')
      .update({ effective_to: archivedDate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, employee_id, effective_to')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });

    await logHRMSAudit({
      action: 'salary_structure_archived',
      entity_type: 'salary_structure',
      entity_id: id,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: { archived_date: archivedDate },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}
