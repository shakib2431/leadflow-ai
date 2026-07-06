import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getPermissionKeys, getRolePermissions, saveRolePermissions } from '@/lib/hrms/adminConsole';
import { logHRMSAudit } from '@/lib/hrms/audit';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const data = await getRolePermissions();
    return NextResponse.json({ data, permission_keys: getPermissionKeys() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch role permissions' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const data = await saveRolePermissions(rows);

    await logHRMSAudit({
      action: 'role_permissions_updated',
      entity_type: 'admin_console',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: { rows: data.length },
    });

    return NextResponse.json({ data, permission_keys: getPermissionKeys() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update role permissions' }, { status: 400 });
  }
}
