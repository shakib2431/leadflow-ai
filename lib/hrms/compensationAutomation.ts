import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateWageFloor, SalaryComponent } from '@/lib/compliance/validateWageFloor';

type AutomationResult = { ok: true } | { ok: false; error: string };

function toPositiveNumber(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export async function ensureCompensationAutomation(employeeId: string, ctcAnnualInput: unknown): Promise<AutomationResult> {
  const ctcAnnual = toPositiveNumber(ctcAnnualInput);
  if (!ctcAnnual) return { ok: true };

  try {
    const { data: rulesData, error: rulesError } = await supabaseAdmin
      .from('compliance_rules')
      .select('rule_type, value_numeric');

    if (rulesError) return { ok: false, error: rulesError.message };

    const wageFloorPercent = Number(rulesData?.find((r: any) => r.rule_type === 'WAGE_FLOOR_PERCENT')?.value_numeric || 0.5);
    const esiThreshold = Number(rulesData?.find((r: any) => r.rule_type === 'ESI_THRESHOLD')?.value_numeric || 21000);

    const ctcMonthly = ctcAnnual / 12;
    const basicAmount = Math.round(ctcMonthly * wageFloorPercent);
    const hraAmount = Math.round(ctcMonthly - basicAmount);

    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: basicAmount },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: hraAmount },
    ];

    const wageResult = validateWageFloor(components, ctcAnnual, wageFloorPercent);
    if (!wageResult.isCompliant) {
      return { ok: false, error: 'Generated salary structure failed wage floor compliance check' };
    }

    const { data: existingStruct, error: structFindError } = await supabaseAdmin
      .from('salary_structures')
      .select('id')
      .eq('employee_id', employeeId)
      .is('effective_to', null)
      .maybeSingle();

    if (structFindError) return { ok: false, error: structFindError.message };

    let salaryStructureId = existingStruct?.id;

    if (salaryStructureId) {
      const { error: structUpdateError } = await supabaseAdmin
        .from('salary_structures')
        .update({ ctc_annual: ctcAnnual, updated_at: new Date().toISOString() })
        .eq('id', salaryStructureId);

      if (structUpdateError) return { ok: false, error: structUpdateError.message };

      const { error: deleteComponentsError } = await supabaseAdmin
        .from('salary_components')
        .delete()
        .eq('salary_structure_id', salaryStructureId);

      if (deleteComponentsError) return { ok: false, error: deleteComponentsError.message };
    } else {
      const { data: newStruct, error: createStructError } = await supabaseAdmin
        .from('salary_structures')
        .insert({ employee_id: employeeId, ctc_annual: ctcAnnual, effective_from: new Date().toISOString().slice(0, 10) })
        .select('id')
        .single();

      if (createStructError || !newStruct?.id) {
        return { ok: false, error: createStructError?.message || 'Failed to create salary structure' };
      }

      salaryStructureId = newStruct.id;
    }

    if (!salaryStructureId) return { ok: false, error: 'Unable to resolve salary structure id' };

    const componentsToInsert = components.map((component) => ({
      salary_structure_id: salaryStructureId,
      ...component,
    }));

    const { error: compError } = await supabaseAdmin.from('salary_components').insert(componentsToInsert);
    if (compError) return { ok: false, error: compError.message };

    const isPfApplicable = true;
    const isEsiApplicable = wageResult.adjustedWageBase <= esiThreshold;

    const { error: regError } = await supabaseAdmin
      .from('statutory_registrations')
      .upsert(
        [
          { employee_id: employeeId, registration_type: 'PF', is_applicable: isPfApplicable },
          { employee_id: employeeId, registration_type: 'ESI', is_applicable: isEsiApplicable },
          { employee_id: employeeId, registration_type: 'PT', is_applicable: true },
        ],
        { onConflict: 'employee_id, registration_type' }
      );

    if (regError) return { ok: false, error: regError.message };

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Compensation automation failed' };
  }
}
