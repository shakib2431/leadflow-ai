import { promises as fs } from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type HRMSAuditInput = {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown>;
};

function safeString(value: unknown) {
  const text = String(value || '').trim();
  return text || null;
}

async function appendFileFallback(payload: Record<string, unknown>) {
  const filePath = path.join(process.cwd(), 'tmp', 'hrms-audit-log.jsonl');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

export async function logHRMSAudit(input: HRMSAuditInput) {
  const now = new Date().toISOString();
  const payload = {
    action: safeString(input.action),
    entity_type: safeString(input.entity_type),
    entity_id: safeString(input.entity_id),
    actor_id: safeString(input.actor_id),
    actor_email: safeString(input.actor_email),
    actor_role: safeString(input.actor_role),
    request_id: safeString(input.request_id),
    metadata: input.metadata || {},
    created_at: now,
  };

  try {
    const { error } = await supabaseAdmin.from('hrms_audit_logs').insert(payload as any);
    if (error) throw error;
    return;
  } catch {
    await appendFileFallback(payload as any);
  }
}
