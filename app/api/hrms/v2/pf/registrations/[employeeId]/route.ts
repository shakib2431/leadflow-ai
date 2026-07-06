import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logHRMSAudit } from '@/lib/hrms/audit';

const PF_REGEX = /^[A-Z0-9\/-]{6,30}$/i;

export async function GET(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const route = await params;
  const employeeId = String(route?.employeeId || '').trim();
  if (!employeeId) return NextResponse.json({ error: 'employeeId is required' }, { status: 422 });

  const [{ data: employee, error: employeeError }, { data: reg, error: regError }] = await Promise.all([
    supabaseAdmin.from('employees').select('id, first_name, last_name, employee_code, pf_number').eq('id', employeeId).maybeSingle(),
    supabaseAdmin
      .from('statutory_registrations')
      .select('employee_id, registration_type, is_applicable')
      .eq('employee_id', employeeId)
      .eq('registration_type', 'PF')
      .maybeSingle(),
  ]);

  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  return NextResponse.json({
    data: {
      employee_id: employee.id,
      employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_code || employee.id,
      employee_code: employee.employee_code || null,
      pf_number: employee.pf_number || null,
      is_pf_applicable: reg ? Boolean(reg.is_applicable) : true,
    },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const route = await params;
  const employeeId = String(route?.employeeId || '').trim();
  if (!employeeId) return NextResponse.json({ error: 'employeeId is required' }, { status: 422 });

  try {
    const body = await req.json();
    const hasApplicable = body?.is_pf_applicable !== undefined;
    const hasPfNumber = body?.pf_number !== undefined;

    if (!hasApplicable && !hasPfNumber) {
      return NextResponse.json({ error: 'is_pf_applicable or pf_number must be provided' }, { status: 422 });
    }

    const isPfApplicable = hasApplicable ? Boolean(body.is_pf_applicable) : true;
    const pfNumber = hasPfNumber ? String(body.pf_number || '').trim().toUpperCase() : undefined;

    if (hasPfNumber && pfNumber && !PF_REGEX.test(pfNumber)) {
      return NextResponse.json({ error: 'Invalid PF number format' }, { status: 422 });
    }

    if (hasPfNumber) {
      const { error: employeeError } = await supabaseAdmin
        .from('employees')
        .update({ pf_number: pfNumber || null, updated_at: new Date().toISOString() })
        .eq('id', employeeId);

      if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    if (hasApplicable) {
      const { error: regError } = await supabaseAdmin
        .from('statutory_registrations')
        .upsert(
          [{ employee_id: employeeId, registration_type: 'PF', is_applicable: isPfApplicable }],
          { onConflict: 'employee_id, registration_type' }
        );

      if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });
    }

    await logHRMSAudit({
      action: 'pf_registration_updated',
      entity_type: 'pf_management',
      entity_id: employeeId,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        is_pf_applicable: hasApplicable ? isPfApplicable : null,
        pf_number_updated: hasPfNumber,
      },
    });

    return NextResponse.json({ data: { employee_id: employeeId, is_pf_applicable: isPfApplicable, pf_number: pfNumber || null } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
