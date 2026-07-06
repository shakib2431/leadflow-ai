import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildPublicPreOnboardingLink } from '@/lib/hrms/preOnboardingIntake';

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const employeeId = String(body?.employee_id || '').trim();
    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id is required' }, { status: 422 });
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const appBase = new URL(req.url).origin;
    const intakeLink = buildPublicPreOnboardingLink(employeeId, appBase);

    return NextResponse.json({ data: { intake_link: intakeLink } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
