import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimitMiddleware } from '@/lib/hrms/security-middleware';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

/**
 * Auto-detect attendance exceptions
 * - Missing punch (no check-in or check-out)
 * - Late arrival (after threshold)
 * - Early exit (before threshold)
 * - No checkout (check-in but no check-out)
 */
async function detectExceptions(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Get all attendance records for the date
    const { data: records, error } = await supabaseAdmin
      .from('attendance_records')
      .select(
        `
        id,
        employee_id,
        employees(first_name, last_name, email),
        date,
        check_in_at,
        check_out_at,
        status
      `
      )
      .eq('date', date);

    if (error) throw error;

    const exceptions = [];

    for (const record of records || []) {
      // Check for missing punch
      if (!record.check_in_at && !record.check_out_at) {
        exceptions.push({
          employee_id: record.employee_id,
          date,
          exception_type: 'missing_punch',
          severity: 'high',
          description: 'No check-in or check-out recorded',
          record_id: record.id,
        });
      }

      // Check for no checkout
      if (record.check_in_at && !record.check_out_at) {
        exceptions.push({
          employee_id: record.employee_id,
          date,
          exception_type: 'no_checkout',
          severity: 'medium',
          description: 'Employee checked in but not checked out',
          record_id: record.id,
        });
      }

      // Check for late arrival (after 10:00 AM)
      if (record.check_in_at) {
        const checkInTime = new Date(`${date}T${record.check_in_at}`);
        const threshold = new Date(`${date}T10:00:00`);
        if (checkInTime > threshold) {
          const lateMinutes = Math.floor((checkInTime.getTime() - threshold.getTime()) / 60000);
          exceptions.push({
            employee_id: record.employee_id,
            date,
            exception_type: 'late_arrival',
            severity: lateMinutes > 60 ? 'high' : 'medium',
            description: `Late by ${lateMinutes} minutes`,
            record_id: record.id,
          });
        }
      }

      // Check for early exit (before 6:00 PM)
      if (record.check_out_at) {
        const checkOutTime = new Date(`${date}T${record.check_out_at}`);
        const threshold = new Date(`${date}T18:00:00`);
        if (checkOutTime < threshold) {
          const earlyMinutes = Math.floor((threshold.getTime() - checkOutTime.getTime()) / 60000);
          exceptions.push({
            employee_id: record.employee_id,
            date,
            exception_type: 'early_exit',
            severity: earlyMinutes > 120 ? 'high' : 'low',
            description: `Left ${earlyMinutes} minutes early`,
            record_id: record.id,
          });
        }
      }
    }

    // Store exceptions in database
    if (exceptions.length > 0) {
      for (const exc of exceptions) {
        await supabaseAdmin.from('attendance_exceptions').insert({
          ...exc,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ data: { exceptions_detected: exceptions.length, exceptions } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Get pending exceptions and corrections
 */
async function getExceptions(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'pending';
    const type = url.searchParams.get('type');

    let query = supabaseAdmin
      .from('attendance_exceptions')
      .select('id, employee_id, employees(first_name, last_name, email), date, exception_type, severity, status')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('exception_type', type);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Resolve exception
 */
async function resolveException(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const { id, status, resolution_notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const { data: exception, error } = await supabaseAdmin
      .from('attendance_exceptions')
      .update({ status, resolution_notes, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Send notification email
    try {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('first_name, email')
        .eq('id', exception.employee_id)
        .single();

      if (emp) {
        await sendNotificationEmail({
          event: 'attendance_exception',
          recipient_email: emp.email,
          recipient_name: emp.first_name,
          subject: `Attendance Exception Resolved - ${exception.exception_type}`,
          data: {
            employee_name: emp.first_name,
            exception_type: exception.exception_type,
            date: exception.date,
            status,
            resolution_notes,
            resolution_link: `${process.env.NEXT_PUBLIC_APP_URL}/team/attendance`,
          },
        });
      }
    } catch (emailErr) {
      console.error('Failed to send exception resolution email:', emailErr);
    }

    return NextResponse.json({ data: exception }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function mainHandler(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);

  if (req.method === 'GET') {
    if (url.pathname.includes('/detect')) {
      return detectExceptions(req);
    }
    return getExceptions(req);
  }

  if (req.method === 'PUT') {
    return resolveException(req);
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const GET = rateLimitMiddleware('attendance-exceptions')(mainHandler);
export const PUT = rateLimitMiddleware('attendance-exceptions')(mainHandler);
