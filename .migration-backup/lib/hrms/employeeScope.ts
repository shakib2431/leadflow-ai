import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type AuthLike = {
  role: 'HR Admin' | 'HR Executive' | 'Employee';
  email?: string;
  devMode?: boolean;
};

export async function getScopedEmployeeId(auth: AuthLike) {
  if (auth.role !== 'Employee') return { employeeId: null as string | null, response: null as NextResponse | null };

  const email = String(auth.email || '').trim().toLowerCase();
  if (!email && !auth.devMode) {
    return {
      employeeId: null,
      response: NextResponse.json({ error: 'Missing employee email in auth context' }, { status: 401 }),
    };
  }

  let data: { id?: string } | null = null;
  let error: any = null;

  if (email) {
    const scoped = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    data = scoped.data as any;
    error = scoped.error;
  }

  if (error) {
    return {
      employeeId: null,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  // In local dev, allow fallback to any active/onboarding employee so self-service flows remain testable.
  if (!data?.id && auth.devMode) {
    const fallback = await supabaseAdmin
      .from('employees')
      .select('id')
      .in('status', ['active', 'onboarding'])
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallback.error && fallback.data?.id) {
      data = fallback.data as any;
    }
  }

  if (!data?.id) {
    return {
      employeeId: null,
      response: NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 }),
    };
  }

  return { employeeId: data.id as string, response: null as NextResponse | null };
}

export async function enforceEmployeeScope(auth: AuthLike, targetEmployeeId: string) {
  if (auth.role !== 'Employee') return null;

  const scope = await getScopedEmployeeId(auth);
  if (scope.response) return scope.response;
  if (!scope.employeeId || scope.employeeId !== targetEmployeeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}