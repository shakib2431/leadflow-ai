import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildOnboardingChecklistState } from '@/lib/hrms/onboardingChecklist';

export async function POST(request: Request) {
  try {
    const { first_name, last_name, email, phone, designation, department, join_date } = await request.json();

    const payload = {
      first_name: String(first_name || '').trim(),
      last_name: String(last_name || '').trim(),
      email: String(email || '').trim().toLowerCase(),
      phone: String(phone || '').trim(),
      designation: String(designation || '').trim() || 'Unassigned',
      department: String(department || '').trim() || 'Unassigned',
      join_date: String(join_date || '').trim(),
    };

    const missing: string[] = [];
    if (!payload.first_name) missing.push('first_name');
    if (!payload.last_name) missing.push('last_name');
    if (!payload.email) missing.push('email');
    if (!payload.join_date) missing.push('join_date');

    if (missing.length > 0) {
      return NextResponse.json({ error: 'Missing required fields', missing }, { status: 422 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.join_date)) {
      return NextResponse.json({ error: 'join_date must be YYYY-MM-DD' }, { status: 422 });
    }

    // 1. Generate the next sequential Employee Code (e.g., EMP-001)
    const { count } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true });
    
    const nextNumber = (count || 0) + 1;
    const empCode = `EMP-${String(nextNumber).padStart(3, '0')}`;

    // 2. Insert into the core employees table
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', payload.email)
      .maybeSingle();

    if (existingEmployee) {
      return NextResponse.json({ error: 'An employee with this email already exists.' }, { status: 409 });
    }

    const { data: newEmp, error: empError } = await supabaseAdmin
      .from('employees')
      .insert({
        employee_code: empCode,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        mobile: payload.phone,
        date_of_joining: payload.join_date,
        joining_date: payload.join_date,
        employment_type: 'permanent', // Default, can be adjusted in onboarding
        status: 'onboarding',
        employment_status: 'onboarding',
        onboarding_checklist: buildOnboardingChecklistState('onboarding'),
      })
      .select('id')
      .single();

    if (empError) throw empError;

    // 3. Initialize the Effective-Dated Employment History
    const { error: histError } = await supabaseAdmin
      .from('employment_history')
      .insert({
        employee_id: newEmp.id,
        designation: payload.designation,
        department: payload.department,
        effective_from: payload.join_date,
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