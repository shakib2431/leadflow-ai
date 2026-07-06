import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjust based on your client setup
import { validateWageFloor, SalaryComponent } from '@/lib/compliance/validateWageFloor';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, ctc_annual, effective_from, components } = body;

    // 1. Fetch the dynamic Wage Floor Percent from compliance_rules
    const { data: rulesData, error: rulesError } = await supabase
      .from('compliance_rules')
      .select('value_numeric')
      .eq('rule_type', 'WAGE_FLOOR_PERCENT')
      .single();

    if (rulesError || !rulesData) {
      return NextResponse.json({ error: "System Configuration Error: Missing Wage Floor Rule." }, { status: 500 });
    }

    const wageFloorPercent = parseFloat(rulesData.value_numeric);

    // 2. Run the deterministic compliance engine BEFORE saving to the database
    const complianceResult = validateWageFloor(components, ctc_annual, wageFloorPercent);

    if (!complianceResult.isCompliant) {
      // BLOCK SAVE AND RETURN VIOLATION
      return NextResponse.json({ 
        error: "Compliance Violation: Salary structure does not meet the statutory wage floor.",
        details: {
          requiredWageBase: ctc_annual / 12 * wageFloorPercent,
          actualWageBase: complianceResult.wageBase,
          excessAllowances: complianceResult.excessAmount
        }
      }, { status: 400 });
    }

    // 3. If compliant, proceed with insertion
    // The Postgres Trigger we created will automatically close out the previous active structure
    const { data: structData, error: structError } = await supabase
      .from('salary_structures')
      .insert({ employee_id, ctc_annual, effective_from })
      .select('id')
      .single();

    if (structError) throw structError;

    // 4. Insert components linked to the new structure
    const componentsToInsert = components.map((c: SalaryComponent) => ({
      salary_structure_id: structData.id,
      component_name: c.component_name,
      component_type: c.component_type,
      amount_monthly: c.amount_monthly
    }));

    const { error: compError } = await supabase.from('salary_components').insert(componentsToInsert);
    if (compError) throw compError;

    return NextResponse.json({ success: true, message: "Salary structure validated and saved successfully." });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}