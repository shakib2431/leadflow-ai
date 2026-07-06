import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export type HRMSRole = 'HR Admin' | 'HR Executive' | 'Employee';

function isHRMSRole(value: string): value is HRMSRole {
  return value === 'HR Admin' || value === 'HR Executive' || value === 'Employee';
}

function getBearerToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

function roleFromTitleLike(value: string): HRMSRole | null {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  if (text === 'hr admin' || text === 'admin' || text.includes('hr admin')) return 'HR Admin';
  if (text === 'hr executive' || text.includes('hr executive')) return 'HR Executive';
  return null;
}

async function deriveRoleFromEmployeeEmail(email: string): Promise<HRMSRole | null> {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: employeeMatch, error } = await supabaseAdmin
    .from('employees')
    .select('designation, current_title, designation_id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error || !employeeMatch) return null;

  const directRole =
    roleFromTitleLike(String((employeeMatch as any).designation || '')) ||
    roleFromTitleLike(String((employeeMatch as any).current_title || ''));

  if (directRole) return directRole;

  if ((employeeMatch as any).designation_id) {
    const { data: designationRow } = await supabaseAdmin
      .from('designations')
      .select('name')
      .eq('id', (employeeMatch as any).designation_id)
      .maybeSingle();

    const designationRole = roleFromTitleLike(String((designationRow as any)?.name || ''));
    if (designationRole) return designationRole;
  }

  return 'Employee';
}

export async function requireRole(req: Request, allowed: HRMSRole[]) {
  const token = getBearerToken(req);
  
  // Development mode: allow bypassing auth if x-dev-mode header is set
  const devMode = req.headers.get('x-dev-mode') === 'true' && process.env.NODE_ENV === 'development';
  if (devMode) {
    const requestedRole = String(req.headers.get('x-dev-role') || '').trim();
    const email = String(req.headers.get('x-dev-email') || 'dev@example.com').trim().toLowerCase();

    let inferredRole: HRMSRole | null = null;
    if (!requestedRole) {
      inferredRole = await deriveRoleFromEmployeeEmail(email);
    }

    // Use least privilege by default in dev mode to avoid accidental admin access.
    const fallbackRole = allowed.includes('Employee')
      ? 'Employee'
      : allowed.includes('HR Executive')
      ? 'HR Executive'
      : allowed.includes('HR Admin')
      ? 'HR Admin'
      : allowed[0];

    const role = isHRMSRole(requestedRole) && allowed.includes(requestedRole)
      ? requestedRole
      : inferredRole && allowed.includes(inferredRole)
      ? inferredRole
      : fallbackRole;

    return { ok: true, userId: 'dev-user', email, role, devMode: true };
  }

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
    };
  }

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid session token' }, { status: 401 })
    };
  }

  const userId = userRes.user.id;
  const email = userRes.user.email || '';
  let { data: roleRow, error: roleErr } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleErr) {
    return {
      ok: false,
      response: NextResponse.json({ error: roleErr.message }, { status: 500 })
    };
  }

  if (!roleRow) {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedEmail) {
      const { data: employeeMatch, error: employeeErr } = await supabaseAdmin
        .from('employees')
        .select('id, designation, current_title, designation_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (employeeErr) {
        return {
          ok: false,
          response: NextResponse.json({ error: employeeErr.message }, { status: 500 })
        };
      }

      if (employeeMatch?.id) {
        let derivedRole: HRMSRole = 'Employee';

        const directRole =
          roleFromTitleLike((employeeMatch as any).designation) ||
          roleFromTitleLike((employeeMatch as any).current_title);

        if (directRole) {
          derivedRole = directRole;
        } else if ((employeeMatch as any).designation_id) {
          const { data: designationRow } = await supabaseAdmin
            .from('designations')
            .select('name')
            .eq('id', (employeeMatch as any).designation_id)
            .maybeSingle();

          const designationRole = roleFromTitleLike(String((designationRow as any)?.name || ''));
          if (designationRole) derivedRole = designationRole;
        }

        const { data: createdRole, error: createErr } = await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: userId, role: derivedRole }, { onConflict: 'user_id' })
          .select('role')
          .maybeSingle();

        if (createErr) {
          return {
            ok: false,
            response: NextResponse.json({ error: createErr.message }, { status: 500 })
          };
        }

        roleRow = createdRole;
      }
    }
  }

  if (roleRow?.role === 'Employee') {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedEmail) {
      const { data: employeeMatch } = await supabaseAdmin
        .from('employees')
        .select('designation, current_title, designation_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      let upgradedRole: HRMSRole | null =
        roleFromTitleLike(String((employeeMatch as any)?.designation || '')) ||
        roleFromTitleLike(String((employeeMatch as any)?.current_title || ''));

      if (!upgradedRole && (employeeMatch as any)?.designation_id) {
        const { data: designationRow } = await supabaseAdmin
          .from('designations')
          .select('name')
          .eq('id', (employeeMatch as any).designation_id)
          .maybeSingle();

        upgradedRole = roleFromTitleLike(String((designationRow as any)?.name || ''));
      }

      if (upgradedRole && upgradedRole !== 'Employee') {
        const { data: upgraded } = await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id: userId, role: upgradedRole }, { onConflict: 'user_id' })
          .select('role')
          .maybeSingle();

        if (upgraded?.role) {
          roleRow = upgraded;
        }
      }
    }
  }

  if (!roleRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No HRMS role assigned for this user' }, { status: 403 })
    };
  }

  if (!roleRow?.role || !allowed.includes(roleRow.role as HRMSRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    };
  }

  return { ok: true, userId, email, role: roleRow.role as HRMSRole };
}
