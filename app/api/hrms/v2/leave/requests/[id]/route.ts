import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

const ADMIN_STATUSES = new Set(['pending', 'approved', 'rejected']);

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const { data: existing, error: findError } = await supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, status')
    .eq('id', id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

  try {
    const body = await req.json();
    const requestedStatus = String(body.status || '').trim().toLowerCase();

    if (!requestedStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 422 });
    }

    if (auth.role === 'Employee') {
      const scope = await getScopedEmployeeId(auth as any);
      if (scope.response) return scope.response;
      if (!scope.employeeId || scope.employeeId !== existing.employee_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ error: 'Employees cannot update leave status directly' }, { status: 403 });
    } else {
      if (!ADMIN_STATUSES.has(requestedStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 422 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: requestedStatus })
      .eq('id', id)
      .select('id, employee_id, leave_type, start_date, end_date, days_count, status, created_at')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log action to audit trail with timestamp
    if (requestedStatus !== existing.status) {
      await supabaseAdmin
        .from('hrms_audit_logs')
        .insert({
          entity_type: 'leave_request',
          entity_id: id,
          action: `leave_request_${requestedStatus}`,
          user_id: auth.userId,
          metadata: {
            previous_status: existing.status,
            new_status: requestedStatus,
            action_timestamp: new Date().toISOString(),
            approved_by_role: auth.role,
          },
          created_at: new Date().toISOString(),
        })
        .catch((err) => console.error('Audit log failed:', err));

      // Send notification email on status change
      try {
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .select('first_name, email')
          .eq('id', existing.employee_id)
          .single();

        if (empData) {
          const eventType = requestedStatus === 'approved' ? 'leave_approved' : 'leave_rejected';
          await sendNotificationEmail({
            event: eventType,
            recipient_email: empData.email,
            recipient_name: empData.first_name,
            subject: `Leave Request ${requestedStatus.charAt(0).toUpperCase() + requestedStatus.slice(1)}: ${data?.leave_type} on ${new Date().toLocaleDateString()}`,
            data: {
              employee_name: empData.first_name,
              leave_type: data?.leave_type,
              start_date: data?.start_date,
              end_date: data?.end_date,
              days_count: data?.days_count,
              action_timestamp: new Date().toLocaleString(),
            },
          });
        }
      } catch (emailErr) {
        console.error('Failed to send notification email:', emailErr);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const { data: existing, error: findError } = await supabaseAdmin
    .from('leave_requests')
    .select('id, employee_id, status')
    .eq('id', id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });

  if (auth.role === 'Employee') {
    const scope = await getScopedEmployeeId(auth as any);
    if (scope.response) return scope.response;
    if (!scope.employeeId || scope.employeeId !== existing.employee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending leave requests can be withdrawn' }, { status: 422 });
    }
  }

  const { error } = await supabaseAdmin.from('leave_requests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Wrap with rate limiting
const patchHandler = rateLimitMiddleware('leave-requests')(PATCH);
const deleteHandler = rateLimitMiddleware('leave-requests')(DELETE);

export { patchHandler as PATCH, deleteHandler as DELETE };
