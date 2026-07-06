import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getAdminSettings, saveAdminSettings } from '@/lib/hrms/adminConsole';
import { logHRMSAudit } from '@/lib/hrms/audit';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const data = await getAdminSettings();
    await logHRMSAudit({
      action: 'admin_settings_viewed',
      entity_type: 'admin_console',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
    });
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch admin settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = await saveAdminSettings(body, auth.userId);

    await logHRMSAudit({
      action: 'admin_settings_updated',
      entity_type: 'admin_console',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: { keys: Object.keys(body || {}) },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update admin settings' }, { status: 400 });
  }
}
