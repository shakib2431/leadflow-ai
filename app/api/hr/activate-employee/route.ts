import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateWageFloor, SalaryComponent } from '@/lib/compliance/validateWageFloor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id, date_of_birth, gender, pan_number, 
      aadhaar_number_masked, bank_account_number, bank_ifsc, ctc_annual
    } = body;

    // 0. Verify Employee ID Exists
    const { data: empCheck } = await supabase.from('employees').select('id').eq('id', employee_id).maybeSingle();
    if (!empCheck) throw new Error(`ID ${employee_id} not found in 'employees' table.`);

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
    const { error: empError } = await supabase.from('employees').update({
        date_of_birth, gender, pan_number, aadhaar_number_masked, 
        bank_account_number, bank_ifsc, status: 'active', 
        updated_at: new Date().toISOString()
      }).eq('id', employee_id);

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

    return NextResponse.json({ success: true, message: "Employee activated." });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}