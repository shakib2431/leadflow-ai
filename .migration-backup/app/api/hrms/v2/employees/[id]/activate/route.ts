import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeOnboardingChecklist } from '@/lib/hrms/onboardingChecklist';

type ActivationTask = {
  id: string;
  label?: string;
  title?: string;
  done?: boolean;
  status?: string;
};

function normalizeTasks(raw: unknown) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((task) => task && typeof task === 'object')
    .map((task) => {
      const row = task as Record<string, any>;
      const done =
        Boolean(row.done) ||
        String(row.status || '').toLowerCase() === 'completed';

      return {
        id: String(row.id || '').trim(),
        label: String(row.label || row.title || '').trim() || 'Checklist item',
        done,
        status: done ? 'completed' : 'pending',
      };
    })
    .filter((task) => Boolean(task.id));
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const checklistTasks = normalizeTasks(body?.checklist_tasks);

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id,email,onboarding_checklist,status,employment_status')
      .eq('id', id)
      .maybeSingle();

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const checklist = normalizeOnboardingChecklist(employee.onboarding_checklist);
    const preStatus = String(checklist.pre_onboarding?.status || '').toLowerCase();

    if (preStatus !== 'reviewed') {
      return NextResponse.json(
        { error: 'Pre-onboarding review must be completed before activation' },
        { status: 422 }
      );
    }

    const { data: activeStructure, error: structureError } = await supabaseAdmin
      .from('salary_structures')
      .select('id, ctc_annual, effective_from, effective_to')
      .eq('employee_id', id)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (structureError) {
      return NextResponse.json({ error: structureError.message }, { status: 500 });
    }

    if (!activeStructure) {
      return NextResponse.json(
        {
          error: 'Cannot activate employee without an active salary structure',
          action_required: 'Create salary structure before activation',
        },
        { status: 422 }
      );
    }

    const nowIso = new Date().toISOString();

    const nextChecklist = {
      ...checklist,
      tasks: checklistTasks.length > 0 ? checklistTasks : checklist.tasks,
      onboarding_handoff: {
        stage: 'activated',
        marked_at: nowIso,
      },
    };

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        status: 'active',
        employment_status: 'active',
        onboarding_checklist: nextChecklist,
        updated_at: nowIso,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const nextPath = `/hrms/v2/self-service?employee=${encodeURIComponent(id)}`;
    const accessLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?next=${encodeURIComponent(nextPath)}`;

    return NextResponse.json({
      success: true,
      message: 'Employee activated successfully.',
      access_link: accessLink,
      employee_id: id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Activation failed' }, { status: 500 });
  }
}
