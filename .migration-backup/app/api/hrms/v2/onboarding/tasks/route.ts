import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

/**
 * Create onboarding tasks and notify team members
 * Tasks are automatically created when employee moves to onboarding stage
 */
async function handler(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    if (req.method === 'POST') {
      const { employee_id, title, assigned_to, due_date, category, description } = await req.json();

      if (!employee_id || !title || !assigned_to) {
        return NextResponse.json(
          { error: 'employee_id, title, assigned_to required' },
          { status: 400 }
        );
      }

      // Get employee details
      const { data: emp, error: empError } = await supabaseAdmin
        .from('employees')
        .select('first_name, last_name')
        .eq('id', employee_id)
        .single();

      if (empError) throw empError;

      // Get assigned person details
      const { data: assignee, error: assigneeError } = await supabaseAdmin
        .from('employees')
        .select('first_name, last_name, email')
        .eq('id', assigned_to)
        .single();

      if (assigneeError) throw assigneeError;

      // Create task
      const { data: task, error: taskError } = await supabaseAdmin
        .from('onboarding_tasks')
        .insert({
          employee_id,
          title,
          assigned_to,
          category: category || 'general',
          description,
          due_date: due_date || new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Send notification email to assigned person
      try {
        await sendNotificationEmail({
          event: 'onboarding_task_assigned',
          recipient_email: assignee.email,
          recipient_name: assignee.first_name,
          subject: `New Onboarding Task: ${title}`,
          data: {
            assigned_to: assignee.first_name,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            task: title,
            due_date: due_date ? new Date(due_date).toLocaleDateString() : 'Not specified',
            description,
            task_link: `${process.env.NEXT_PUBLIC_APP_URL}/team/onboarding/tasks/${task.id}`,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send task assignment email:', emailErr);
      }

      return NextResponse.json({ data: task }, { status: 201 });
    }

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const employeeId = url.searchParams.get('employee_id');
      const status = url.searchParams.get('status');
      const category = url.searchParams.get('category');

      let query = supabaseAdmin
        .from('onboarding_tasks')
        .select('id, title, assigned_to, employees(first_name, last_name, email), status, due_date, category, created_at')
        .order('due_date', { ascending: true });

      if (employeeId) query = query.eq('employee_id', employeeId);
      if (status) query = query.eq('status', status);
      if (category) query = query.eq('category', category);

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    if (req.method === 'PUT') {
      const { id, status } = await req.json();

      if (!id || !status) {
        return NextResponse.json({ error: 'id and status required' }, { status: 400 });
      }

      const { data: task, error } = await supabaseAdmin
        .from('onboarding_tasks')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data: task }, { status: 200 });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from('onboarding_tasks').delete().eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = rateLimitMiddleware('onboarding-tasks')(handler);
export const POST = rateLimitMiddleware('onboarding-tasks')(handler);
export const PUT = rateLimitMiddleware('onboarding-tasks')(handler);
export const DELETE = rateLimitMiddleware('onboarding-tasks')(handler);
