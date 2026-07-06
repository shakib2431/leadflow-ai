import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateTemporaryPassword, temporaryPasswordFingerprint } from '@/lib/hrms/credentials';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';
import { logHRMSAudit } from '@/lib/hrms/audit';

type AuthUserRecord = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
};

async function findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message || 'Failed to list auth users');

    const users = (data?.users || []) as AuthUserRecord[];
    if (users.length === 0) return null;

    const match = users.find((user) => String(user.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, email, status')
    .eq('id', id)
    .maybeSingle();

  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const employeeEmail = String(employee.email || '').trim().toLowerCase();
  if (!employeeEmail) {
    return NextResponse.json({ error: 'Employee email is required to create login credentials' }, { status: 422 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordFingerprint = temporaryPasswordFingerprint(temporaryPassword);
  const nowIso = new Date().toISOString();

  let authUserId = '';
  let wasCreated = false;

  try {
    const existingUser = await findAuthUserByEmail(employeeEmail);

    if (existingUser?.id) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          employee_id: employee.id,
          must_change_password: true,
          temp_password_issued_at: nowIso,
          temp_password_policy: 'v1-enterprise',
        },
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message || 'Failed to reset existing credentials' }, { status: 500 });
      }

      authUserId = existingUser.id;
    } else {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: employeeEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          employee_id: employee.id,
          must_change_password: true,
          temp_password_issued_at: nowIso,
          temp_password_policy: 'v1-enterprise',
        },
      });

      if (createError || !createdUser?.user?.id) {
        return NextResponse.json({ error: createError?.message || 'Failed to create login credentials' }, { status: 500 });
      }

      authUserId = createdUser.user.id;
      wasCreated = true;
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: authUserId, role: 'Employee' }, { onConflict: 'user_id' });

    if (roleError) {
      return NextResponse.json({ error: roleError.message || 'Failed to map Employee role for login user' }, { status: 500 });
    }

    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee';
    const requestOrigin = new URL(req.url).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
    const loginUrl = `${appUrl.replace(/\/$/, '')}/login`;

    const mailResult = await sendNotificationEmail({
      event: 'employee_login_credentials',
      recipient_email: employeeEmail,
      recipient_name: fullName,
      subject: 'Your LeadFlow AI HRMS Login Credentials',
      data: {
        employee_name: fullName,
        employee_email: employeeEmail,
        temporary_password: temporaryPassword,
        login_link: loginUrl,
      },
    });

    await logHRMSAudit({
      action: wasCreated ? 'employee_login_created' : 'employee_login_reset',
      entity_type: 'employee_login',
      entity_id: employee.id,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        employee_email: employeeEmail,
        auth_user_id: authUserId,
        email_sent: Boolean(mailResult.success),
        password_fingerprint: passwordFingerprint,
        first_login_forced: true,
      },
    });

    return NextResponse.json({
      data: {
        employee_id: employee.id,
        employee_email: employeeEmail,
        auth_user_id: authUserId,
        was_created: wasCreated,
        temporary_password: temporaryPassword,
        must_change_password: true,
        email_sent: Boolean(mailResult.success),
      },
      warning: mailResult.success ? null : 'Credentials were created but welcome email delivery failed. Please share credentials manually.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to provision employee credentials' }, { status: 500 });
  }
}
