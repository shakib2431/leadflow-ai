import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateWageFloor, SalaryComponent } from '@/lib/compliance/validateWageFloor';
import { normalizeOnboardingChecklist } from '@/lib/hrms/onboardingChecklist';

function extractMissingColumn(errorMessage: string): string | null {
  const message = String(errorMessage || '');
  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column/i);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const postgresMatch = message.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id, date_of_birth, gender, pan_number, 
      aadhaar_number_masked, bank_account_number, bank_ifsc, ctc_annual,
      department, designation, current_title, master_profile
    } = body;

    // 0. Verify Employee ID Exists
    const { data: empCheck } = await supabase
      .from('employees')
      .select('id, onboarding_checklist')
      .eq('id', employee_id)
      .maybeSingle();
    if (!empCheck) throw new Error(`ID ${employee_id} not found in 'employees' table.`);

    const checklist = normalizeOnboardingChecklist(empCheck?.onboarding_checklist);
        const nowIso = new Date().toISOString();
        const sanitizedProfile = master_profile && typeof master_profile === 'object'
          ? {
              personal: {
                first_name: String(master_profile?.personal?.first_name || '').trim(),
                last_name: String(master_profile?.personal?.last_name || '').trim(),
                middle_name: String(master_profile?.personal?.middle_name || '').trim(),
                preferred_name: String(master_profile?.personal?.preferred_name || '').trim(),
                marital_status: String(master_profile?.personal?.marital_status || '').trim(),
                nationality: String(master_profile?.personal?.nationality || '').trim(),
                blood_group: String(master_profile?.personal?.blood_group || '').trim(),
                personal_email: String(master_profile?.personal?.personal_email || '').trim(),
                personal_phone: String(master_profile?.personal?.personal_phone || '').trim(),
              },
              family: {
                father_name: String(master_profile?.family?.father_name || '').trim(),
                mother_name: String(master_profile?.family?.mother_name || '').trim(),
                spouse_name: String(master_profile?.family?.spouse_name || '').trim(),
                dependents_count: Number(master_profile?.family?.dependents_count || 0),
              },
              addresses: {
                current_address: String(master_profile?.addresses?.current_address || '').trim(),
                permanent_address: String(master_profile?.addresses?.permanent_address || '').trim(),
                city: String(master_profile?.addresses?.city || '').trim(),
                state: String(master_profile?.addresses?.state || '').trim(),
                postal_code: String(master_profile?.addresses?.postal_code || '').trim(),
                country: String(master_profile?.addresses?.country || '').trim(),
              },
              emergency_contact: {
                name: String(master_profile?.emergency_contact?.name || '').trim(),
                relationship: String(master_profile?.emergency_contact?.relationship || '').trim(),
                phone: String(master_profile?.emergency_contact?.phone || '').trim(),
                alternate_phone: String(master_profile?.emergency_contact?.alternate_phone || '').trim(),
              },
              education: {
                highest_qualification: String(master_profile?.education?.highest_qualification || '').trim(),
                institution: String(master_profile?.education?.institution || '').trim(),
                graduation_year: String(master_profile?.education?.graduation_year || '').trim(),
                specialization: String(master_profile?.education?.specialization || '').trim(),
              },
              previous_employment: {
                employer_name: String(master_profile?.previous_employment?.employer_name || '').trim(),
                designation: String(master_profile?.previous_employment?.designation || '').trim(),
                start_date: String(master_profile?.previous_employment?.start_date || '').trim(),
                end_date: String(master_profile?.previous_employment?.end_date || '').trim(),
                total_experience_years: Number(master_profile?.previous_employment?.total_experience_years || 0),
                last_drawn_ctc: Number(master_profile?.previous_employment?.last_drawn_ctc || 0),
                reason_for_leaving: String(master_profile?.previous_employment?.reason_for_leaving || '').trim(),
              },
              statutory: {
                uan_number: String(master_profile?.statutory?.uan_number || '').trim(),
                esic_number: String(master_profile?.statutory?.esic_number || '').trim(),
                passport_number: String(master_profile?.statutory?.passport_number || '').trim(),
                driving_license_number: String(master_profile?.statutory?.driving_license_number || '').trim(),
                voter_id: String(master_profile?.statutory?.voter_id || '').trim(),
              },
              medical: {
                known_conditions: String(master_profile?.medical?.known_conditions || '').trim(),
                allergies: String(master_profile?.medical?.allergies || '').trim(),
                disability_details: String(master_profile?.medical?.disability_details || '').trim(),
              },
              metadata: {
                collected_at: nowIso,
                collected_by: 'hr_activation_flow',
              },
            }
          : null;

    const preOnboarding =
      checklist.pre_onboarding && typeof checklist.pre_onboarding === 'object'
        ? checklist.pre_onboarding
        : null;

    // 1. Fetch Dynamic Compliance Rules
    const { data: rulesData, error: rulesError } = await supabase.from('compliance_rules').select('rule_type, value_numeric');
    if (rulesError || !rulesData || rulesData.length === 0) return NextResponse.json({ error: "System Error: Compliance rules not configured." }, { status: 500 });

    const wageFloorPercent = parseFloat(rulesData.find(r => r.rule_type === 'WAGE_FLOOR_PERCENT')?.value_numeric || '0.50');
    const esiThreshold = parseFloat(rulesData.find(r => r.rule_type === 'ESI_THRESHOLD')?.value_numeric || '21000');

    // 2. Generate a compliant Baseline Salary Structure
    const ctcMonthly = ctc_annual / 12;
    const basicAmount = Math.round(ctcMonthly * wageFloorPercent);
    const hraAmount = ctcMonthly - basicAmount;

    const components: SalaryComponent[] = [
      { component_name: 'Basic', component_type: 'wages', amount_monthly: basicAmount },
      { component_name: 'HRA', component_type: 'allowance', amount_monthly: hraAmount }
    ];

    // 3. Run the Wage Floor Engine
    const wageResult = validateWageFloor(components, ctc_annual, wageFloorPercent);
    if (!wageResult.isCompliant) throw new Error("Generated baseline structure failed compliance check.");

    // 4. Determine Statutory Applicability
    const isEsiApplicable = wageResult.adjustedWageBase <= esiThreshold;
    const isPfApplicable = true;

    // 5. Execute Database Updates (Activating the Employee)
    const nextChecklist = {
      ...checklist,
      employee_master_profile: sanitizedProfile,
      pre_onboarding: preOnboarding
        ? {
            ...preOnboarding,
            status: 'reviewed',
            hr_reviewed_at: nowIso,
          }
        : checklist.pre_onboarding,
      onboarding_handoff: {
        stage: 'payroll_ready',
        marked_at: nowIso,
      },
    };

    const employeeUpdatePayload: Record<string, any> = {
      date_of_birth,
      gender,
      pan_number,
      aadhaar_number_masked,
      bank_account_number,
      bank_ifsc,
      status: 'active',
      employment_status: 'active',
      onboarding_checklist: nextChecklist,
      department: String(department || '').trim() || null,
      designation: String(designation || current_title || '').trim() || null,
      current_title: String(current_title || designation || '').trim() || null,
      updated_at: nowIso,
    };

    const optionalColumns = new Set(['current_title', 'designation', 'department']);
    let empError: any = null;

    // Retry update if environment schema lacks optional employee profile columns.
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await supabase.from('employees').update(employeeUpdatePayload).eq('id', employee_id);
      empError = result.error;
      if (!empError) break;

      const missing = extractMissingColumn(empError.message);
      if (!missing || !optionalColumns.has(missing) || !(missing in employeeUpdatePayload)) {
        break;
      }

      delete employeeUpdatePayload[missing];
    }

    if (empError) throw empError;

    // 6. UPSERT Salary Structure
    const { data: existingStruct } = await supabase.from('salary_structures').select('id').eq('employee_id', employee_id).maybeSingle(); 

    let salaryStructureId;
    if (existingStruct) {
      salaryStructureId = existingStruct.id;
      await supabase.from('salary_components').delete().eq('salary_structure_id', salaryStructureId);
    } else {
      const { data: structData, error: structError } = await supabase.from('salary_structures').insert({ employee_id, ctc_annual, effective_from: new Date().toISOString().split('T')[0] }).select('id').single();
      if (structError) throw structError;
      salaryStructureId = structData.id;
    }

    // 7. Insert Salary Components 
    const componentsToInsert = components.map(c => ({ salary_structure_id: salaryStructureId, ...c }));
    const { error: compError } = await supabase.from('salary_components').insert(componentsToInsert);
    if (compError) throw compError;

    // 8. UPSERT Statutory Registrations 
    const regsToInsert = [
      { employee_id, registration_type: 'PF', is_applicable: isPfApplicable },
      { employee_id, registration_type: 'ESI', is_applicable: isEsiApplicable },
      { employee_id, registration_type: 'PT', is_applicable: true } 
    ];
    
    const { error: regError } = await supabase.from('statutory_registrations').upsert(regsToInsert, { onConflict: 'employee_id, registration_type' });
    if (regError) throw regError;

    return NextResponse.json({
      success: true,
      message: 'Employee activated and ready for payroll.',
      payroll_handoff: 'ready',
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}