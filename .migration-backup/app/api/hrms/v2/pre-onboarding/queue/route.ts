import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { buildPublicPreOnboardingLink } from '@/lib/hrms/preOnboardingIntake';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const selectVariants = [
    'id,first_name,last_name,email,status,designation,current_title,department,onboarding_checklist,created_at',
    'id,first_name,last_name,email,status,department,onboarding_checklist,created_at',
    'id,first_name,last_name,email,status,onboarding_checklist,created_at',
  ];

  let data: any[] | null = null;
  let error: any = null;

  for (const selectClause of selectVariants) {
    const res = await supabaseAdmin
      .from('employees')
      .select(selectClause)
      .eq('status', 'onboarding')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (!res.error) {
      data = res.data || [];
      error = null;
      break;
    }

    error = res.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appBaseUrl = new URL(req.url).origin;
  const rows = (data || []).map((row: any) => ({
    ...row,
    intake_link: buildPublicPreOnboardingLink(row.id, appBaseUrl),
  }));

  return NextResponse.json({ data: rows });
}
