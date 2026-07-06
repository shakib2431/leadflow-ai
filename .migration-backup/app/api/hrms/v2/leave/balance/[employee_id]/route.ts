import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Calculate leave balance for an employee
 * Returns opening, accrued, used, and closing balances per leave type
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ employee_id: string }> }
) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  try {
    const { employee_id: employeeId } = await params;

    // Verify employee exists
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, joining_date')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get leave policy
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('leave_policies')
      .select('*')
      .eq('is_active', true)
      .single();

    if (policyError) {
      return NextResponse.json({ error: 'Leave policy not configured' }, { status: 400 });
    }

    const leaveTypes = ['casual', 'sick', 'earned', 'unpaid'];
    const balances: any = {};

    // Calculate balance for each leave type
    for (const type of leaveTypes) {
      // Get opening balance (start of year or joining year)
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);

      // Get accrued leaves (monthly accrual from joining date)
      const monthsWorked = Math.floor(
        (new Date().getTime() - new Date(employee.joining_date).getTime()) / (30.44 * 24 * 60 * 60 * 1000)
      );
      const accrued = Math.floor((policy[`${type}_annual_entitlement`] || 0) * monthsWorked / 12);

      // Get used leaves
      const { data: usedData } = await supabaseAdmin
        .from('leave_requests')
        .select('days_count')
        .eq('employee_id', employeeId)
        .eq('leave_type', type)
        .eq('status', 'approved')
        .gte('end_date', yearStart.toISOString().split('T')[0]);

      const used = usedData?.reduce((sum: number, req: any) => sum + req.days_count, 0) || 0;

      // Opening balance
      const opening = policy[`${type}_opening_balance`] || 0;

      // Closing balance
      const closing = Math.max(0, opening + accrued - used);

      balances[type] = {
        type,
        opening,
        accrued,
        used,
        closing,
        policy_entitlement: policy[`${type}_annual_entitlement`],
      };
    }

    return NextResponse.json({ data: balances }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Update leave balance (admin only)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ employee_id: string }> }
) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const { employee_id } = await params;
    const { leave_type, opening_balance } = await req.json();

    if (!leave_type || opening_balance === undefined) {
      return NextResponse.json(
        { error: 'leave_type and opening_balance required' },
        { status: 400 }
      );
    }

    // Store opening balance override in a separate table
    const { data, error } = await supabaseAdmin
      .from('leave_balance_adjustments')
      .upsert(
        {
          employee_id,
          leave_type,
          opening_balance,
          adjusted_by: auth.userId,
          adjusted_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,leave_type' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
