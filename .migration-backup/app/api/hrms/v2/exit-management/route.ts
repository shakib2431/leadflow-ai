import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

async function handler(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          designations(name),
          exit_status,
          separation_stage,
          clearance_status,
          final_settlement_status,
          last_working_day,
          resignation_date,
          archived_at
        `
        )
        .eq('archived_at', null)
        .not('exit_status', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const employees = data?.map((emp: any) => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        designation: emp.designations?.name || 'N/A',
        exit_status: emp.exit_status || 'initiated',
        separation_stage: emp.separation_stage || 'pending',
        clearance_status: emp.clearance_status || 'pending',
        final_settlement_status: emp.final_settlement_status || 'pending',
        last_working_day: emp.last_working_day,
        resignation_date: emp.resignation_date,
      })) || [];

      return NextResponse.json({ data: employees }, { status: 200 });
    }

    if (req.method === 'POST') {
      const { employee_id, resignation_date, last_working_day } = await req.json();

      if (!employee_id || !resignation_date) {
        return NextResponse.json(
          { error: 'employee_id and resignation_date required' },
          { status: 400 }
        );
      }

      // Get employee details
      const { data: emp, error: empError } = await supabaseAdmin
        .from('employees')
        .select('first_name, last_name, email')
        .eq('id', employee_id)
        .single();

      if (empError) throw empError;

      // Create exit record
      const { data: exitData, error: exitError } = await supabaseAdmin
        .from('employees')
        .update({
          exit_status: 'initiated',
          separation_stage: 'pending',
          clearance_status: 'pending',
          final_settlement_status: 'pending',
          resignation_date,
          last_working_day: last_working_day || resignation_date,
        })
        .eq('id', employee_id)
        .select()
        .single();

      if (exitError) throw exitError;

      // Auto-create clearance checklist tasks
      const checklistTasks = [
        { task: 'IT: Return Laptop', category: 'it', assigned_to: 'IT Team' },
        { task: 'IT: Deactivate Access', category: 'it', assigned_to: 'IT Team' },
        { task: 'Finance: Salary Settlement', category: 'finance', assigned_to: 'Finance Team' },
        { task: 'HR: Update Records', category: 'hr', assigned_to: 'HR Team' },
        { task: 'Operations: Knowledge Transfer', category: 'operations', assigned_to: 'Manager' },
      ];

      for (const task of checklistTasks) {
        await supabaseAdmin.from('exit_checklist').insert({
          employee_id,
          ...task,
          status: 'pending',
          due_date: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Send notification email
      try {
        await sendNotificationEmail({
          event: 'exit_initiated',
          recipient_email: emp.email,
          recipient_name: emp.first_name,
          subject: 'Exit Process Initiated',
          data: {
            employee_name: emp.first_name,
            last_working_day: last_working_day || resignation_date,
            exit_link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/team/exit`,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send exit notification email:', emailErr);
      }

      return NextResponse.json({ data: exitData }, { status: 201 });
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process exit data' }, { status: 500 });
  }
}

export const GET = rateLimitMiddleware('exit-management')(handler);
export const POST = rateLimitMiddleware('exit-management')(handler);

