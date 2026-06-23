import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjust based on your setup

export async function POST(request: Request) {
  try {
    const { first_name, last_name, email, phone, designation, department, join_date } = await request.json();

    // 1. Generate the next sequential Employee Code (e.g., EMP-001)
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });
    
    const nextNumber = (count || 0) + 1;
    const empCode = `EMP-${String(nextNumber).padStart(3, '0')}`;

    // 2. Insert into the core employees table
    const { data: newEmp, error: empError } = await supabase
      .from('employees')
      .insert({
        employee_code: empCode,
        first_name,
        last_name,
        email,
        phone,
        date_of_joining: join_date,
        employment_type: 'permanent', // Default, can be adjusted in onboarding
        status: 'onboarding',
        
        // Strict Schema Placeholders: HR/Employee will fill these during Onboarding
        date_of_birth: '1900-01-01',
        gender: 'Pending',
        pan_number: 'PENDING',
        aadhaar_number_masked: 'PENDING',
        bank_account_number: 'PENDING',
        bank_ifsc: 'PENDING',
        emergency_contact_name: 'PENDING',
        emergency_contact_phone: 'PENDING',
        work_state: 'Pending',
        work_location: 'Pending',
      })
      .select('id')
      .single();

    if (empError) throw empError;

    // 3. Initialize the Effective-Dated Employment History
    const { error: histError } = await supabase
      .from('employment_history')
      .insert({
        employee_id: newEmp.id,
        designation,
        department,
        effective_from: join_date
      });

    if (histError) throw histError;

    return NextResponse.json({ 
      success: true, 
      employee_id: newEmp.id,
      message: "Candidate successfully transitioned to Onboarding." 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}