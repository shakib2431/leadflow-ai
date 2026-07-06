import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getBackupConfig, listBackupRuns, saveBackupConfig, triggerBackupRun } from '@/lib/hrms/adminConsole';
import { logHRMSAudit } from '@/lib/hrms/audit';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const [config, runs] = await Promise.all([getBackupConfig(), listBackupRuns(20)]);
    return NextResponse.json({ data: { config, runs } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch backup config' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = await saveBackupConfig(body, auth.userId);

    await logHRMSAudit({
      action: 'backup_config_updated',
      entity_type: 'admin_console',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        enabled: data.enabled,
        frequency: data.frequency,
        retention_days: data.retention_days,
      },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update backup config' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const run = await triggerBackupRun(auth.userId);

    await logHRMSAudit({
      action: 'backup_run_triggered',
      entity_type: 'admin_console',
      entity_id: run.id,
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: { snapshot_path: run.snapshot_path || null },
    });

    return NextResponse.json({ data: run });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to trigger backup run' }, { status: 400 });
  }
}
