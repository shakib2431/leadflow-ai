import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AdminSettings = {
  default_currency: string;
  timezone: string;
  attendance_cutoff_day: number;
  leave_auto_approval: boolean;
  payroll_approval_required: boolean;
};

export type RolePermissionRow = {
  role: 'HR Admin' | 'HR Executive' | 'Employee';
  permission_key: string;
  is_allowed: boolean;
};

export type BackupConfig = {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention_days: number;
  storage_target: string;
  notes: string;
  last_backup_at?: string | null;
};

export type BackupRun = {
  id: string;
  config_name: string;
  status: 'queued' | 'completed' | 'failed';
  snapshot_path?: string | null;
  summary: Record<string, unknown>;
  triggered_by?: string | null;
  error_message?: string | null;
  created_at: string;
};

const FILE_DIR = path.join(process.cwd(), 'tmp');
const SETTINGS_FILE = path.join(FILE_DIR, 'hrms-admin-settings.json');
const ROLE_PERMS_FILE = path.join(FILE_DIR, 'hrms-role-permissions.json');
const BACKUP_CONFIG_FILE = path.join(FILE_DIR, 'hrms-backup-config.json');
const BACKUP_RUNS_FILE = path.join(FILE_DIR, 'hrms-backup-runs.json');
const AUDIT_LOG_FILE = path.join(FILE_DIR, 'hrms-audit-log.jsonl');
const BACKUP_SNAPSHOTS_DIR = path.join(FILE_DIR, 'hrms-backups');

const ROLE_LIST: Array<'HR Admin' | 'HR Executive' | 'Employee'> = ['HR Admin', 'HR Executive', 'Employee'];

const PERMISSION_KEYS = [
  'manage_entities',
  'manage_departments',
  'manage_designations',
  'manage_user_roles',
  'manage_payroll',
  'manage_pf',
  'view_reports',
  'export_reports',
  'manage_attendance_sources',
  'manage_attendance_exceptions',
  'manage_settings',
  'view_audit_logs',
  'manage_backup_config',
];

function isMissingTableError(message: string, tableName: string) {
  const text = String(message || '').toLowerCase();
  return (
    (text.includes('relation') && text.includes('does not exist') && text.includes(tableName.toLowerCase())) ||
    (text.includes('could not find the table') && text.includes(tableName.toLowerCase()))
  );
}

function defaultSettings(): AdminSettings {
  return {
    default_currency: 'INR',
    timezone: 'Asia/Kolkata',
    attendance_cutoff_day: 25,
    leave_auto_approval: false,
    payroll_approval_required: true,
  };
}

function defaultBackupConfig(): BackupConfig {
  return {
    enabled: true,
    frequency: 'daily',
    retention_days: 90,
    storage_target: 'local_tmp',
    notes: '',
    last_backup_at: null,
  };
}

function defaultRolePermissions(): RolePermissionRow[] {
  const rows: RolePermissionRow[] = [];

  for (const role of ROLE_LIST) {
    for (const permissionKey of PERMISSION_KEYS) {
      let allowed = false;
      if (role === 'HR Admin') allowed = true;
      else if (role === 'HR Executive') {
        allowed = !['manage_user_roles', 'manage_settings', 'manage_backup_config'].includes(permissionKey);
      }
      rows.push({ role, permission_key: permissionKey, is_allowed: allowed });
    }
  }

  return rows;
}

function sanitizeSettings(input: any): AdminSettings {
  const base = defaultSettings();
  const cutoff = Number(input?.attendance_cutoff_day ?? base.attendance_cutoff_day);

  return {
    default_currency: String(input?.default_currency || base.default_currency).trim().toUpperCase() || base.default_currency,
    timezone: String(input?.timezone || base.timezone).trim() || base.timezone,
    attendance_cutoff_day: Number.isFinite(cutoff) ? Math.max(1, Math.min(31, Math.floor(cutoff))) : base.attendance_cutoff_day,
    leave_auto_approval: Boolean(input?.leave_auto_approval),
    payroll_approval_required: input?.payroll_approval_required === undefined ? base.payroll_approval_required : Boolean(input?.payroll_approval_required),
  };
}

function sanitizeBackupConfig(input: any): BackupConfig {
  const base = defaultBackupConfig();
  const retention = Number(input?.retention_days ?? base.retention_days);
  const frequency = String(input?.frequency || base.frequency).trim().toLowerCase();

  return {
    enabled: input?.enabled === undefined ? base.enabled : Boolean(input.enabled),
    frequency: frequency === 'weekly' || frequency === 'monthly' ? (frequency as 'weekly' | 'monthly') : 'daily',
    retention_days: Number.isFinite(retention) ? Math.max(7, Math.min(3650, Math.floor(retention))) : base.retention_days,
    storage_target: String(input?.storage_target || base.storage_target).trim() || base.storage_target,
    notes: String(input?.notes || '').trim(),
    last_backup_at: input?.last_backup_at ? String(input.last_backup_at) : null,
  };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function getPermissionKeys() {
  return [...PERMISSION_KEYS];
}

export async function getAdminSettings() {
  const { data, error } = await supabaseAdmin
    .from('hrms_settings')
    .select('value_json')
    .eq('setting_key', 'global')
    .maybeSingle();

  if (!error) {
    if (!data?.value_json) return defaultSettings();
    return sanitizeSettings(data.value_json);
  }

  if (!isMissingTableError(error.message, 'hrms_settings')) throw error;

  const fallback = await readJsonFile(SETTINGS_FILE, defaultSettings());
  return sanitizeSettings(fallback);
}

export async function saveAdminSettings(settings: AdminSettings, updatedBy?: string | null) {
  const payload = sanitizeSettings(settings);

  const { error } = await supabaseAdmin
    .from('hrms_settings')
    .upsert(
      {
        setting_key: 'global',
        value_json: payload,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    );

  if (!error) return payload;
  if (!isMissingTableError(error.message, 'hrms_settings')) throw error;

  await writeJsonFile(SETTINGS_FILE, payload);
  return payload;
}

export async function getRolePermissions() {
  const allowedKeys = new Set(PERMISSION_KEYS);
  const baseline = defaultRolePermissions();
  const baselineMap = new Map(baseline.map((row) => [`${row.role}::${row.permission_key}`, row]));

  const mergeWithBaseline = (rows: RolePermissionRow[]) => {
    for (const row of rows) {
      const key = `${row.role}::${row.permission_key}`;
      if (baselineMap.has(key)) {
        baselineMap.set(key, row);
      }
    }
    return Array.from(baselineMap.values());
  };

  const { data, error } = await supabaseAdmin
    .from('role_permissions')
    .select('role, permission_key, is_allowed')
    .order('role', { ascending: true })
    .order('permission_key', { ascending: true });

  if (!error) {
    const rows = (data || []).map((row: any) => ({
      role: String(row.role) as 'HR Admin' | 'HR Executive' | 'Employee',
      permission_key: String(row.permission_key),
      is_allowed: Boolean(row.is_allowed),
    })).filter((row) => allowedKeys.has(row.permission_key));
    return mergeWithBaseline(rows);
  }

  if (!isMissingTableError(error.message, 'role_permissions')) throw error;

  const fallback = await readJsonFile<RolePermissionRow[]>(ROLE_PERMS_FILE, defaultRolePermissions());
  return mergeWithBaseline(fallback.filter((row) => allowedKeys.has(row.permission_key)));
}

export async function saveRolePermissions(rows: RolePermissionRow[]) {
  const allowedKeys = new Set(PERMISSION_KEYS);
  const cleanRows = rows
    .map((row) => ({
      role: ROLE_LIST.includes(row.role) ? row.role : 'Employee',
      permission_key: String(row.permission_key || '').trim(),
      is_allowed: Boolean(row.is_allowed),
    }))
    .filter((row) => row.permission_key && allowedKeys.has(row.permission_key));

  const { error } = await supabaseAdmin.from('role_permissions').upsert(cleanRows as any, {
    onConflict: 'role,permission_key',
  });

  if (!error) return cleanRows;
  if (!isMissingTableError(error.message, 'role_permissions')) throw error;

  await writeJsonFile(ROLE_PERMS_FILE, cleanRows);
  return cleanRows;
}

export async function listAuditLogs(options?: {
  page?: number;
  pageSize?: number;
  action?: string;
  actorRole?: string;
  q?: string;
}) {
  const page = Math.max(1, Number(options?.page || 1));
  const pageSize = Math.min(Math.max(1, Number(options?.pageSize || 25)), 200);
  const action = String(options?.action || '').trim();
  const actorRole = String(options?.actorRole || '').trim();
  const q = String(options?.q || '').trim().toLowerCase();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('hrms_audit_logs')
    .select('id, action, entity_type, entity_id, actor_id, actor_email, actor_role, request_id, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action) query = query.eq('action', action);
  if (actorRole) query = query.eq('actor_role', actorRole);
  if (q) query = query.or(`action.ilike.%${q}%,entity_type.ilike.%${q}%,actor_email.ilike.%${q}%`);

  const { data, error, count } = await query;

  if (!error) {
    return {
      data: data || [],
      meta: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    };
  }

  if (!isMissingTableError(error.message, 'hrms_audit_logs')) throw error;

  const fileContent = await readFile(AUDIT_LOG_FILE, 'utf8').catch(() => '');
  const entries = fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<Record<string, any>>;

  const filtered = entries.filter((row) => {
    if (action && String(row.action || '') !== action) return false;
    if (actorRole && String(row.actor_role || '') !== actorRole) return false;
    if (q) {
      const haystack = `${row.action || ''} ${row.entity_type || ''} ${row.actor_email || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const pageRows = filtered.slice(from, to + 1);

  return {
    data: pageRows,
    meta: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  };
}

export async function getBackupConfig() {
  const { data, error } = await supabaseAdmin
    .from('backup_configs')
    .select('enabled, frequency, retention_days, storage_target, notes, last_backup_at')
    .eq('config_name', 'primary')
    .maybeSingle();

  if (!error) {
    if (!data) return defaultBackupConfig();
    return sanitizeBackupConfig(data);
  }

  if (!isMissingTableError(error.message, 'backup_configs')) throw error;

  const fallback = await readJsonFile(BACKUP_CONFIG_FILE, defaultBackupConfig());
  return sanitizeBackupConfig(fallback);
}

export async function saveBackupConfig(config: BackupConfig, updatedBy?: string | null) {
  const payload = sanitizeBackupConfig(config);

  const { error } = await supabaseAdmin
    .from('backup_configs')
    .upsert(
      {
        config_name: 'primary',
        enabled: payload.enabled,
        frequency: payload.frequency,
        retention_days: payload.retention_days,
        storage_target: payload.storage_target,
        notes: payload.notes,
        last_backup_at: payload.last_backup_at || null,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'config_name' }
    );

  if (!error) return payload;
  if (!isMissingTableError(error.message, 'backup_configs')) throw error;

  await writeJsonFile(BACKUP_CONFIG_FILE, payload);
  return payload;
}

async function getTableCount(tableName: string) {
  const { count, error } = await supabaseAdmin.from(tableName).select('id', { count: 'exact', head: true });
  if (error) return 0;
  return Number(count || 0);
}

async function listBackupRunsFromDb(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('hrms_backup_runs')
    .select('id, config_name, status, snapshot_path, summary, triggered_by, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) return (data || []) as BackupRun[];
  if (!isMissingTableError(error.message, 'hrms_backup_runs')) throw error;

  const fallback = await readJsonFile<BackupRun[]>(BACKUP_RUNS_FILE, []);
  return fallback.slice(0, limit);
}

export async function listBackupRuns(limit = 20) {
  return listBackupRunsFromDb(limit);
}

export async function triggerBackupRun(triggeredBy?: string | null) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const summary = {
    employees: await getTableCount('employees'),
    attendance_records: await getTableCount('attendance_records'),
    leave_requests: await getTableCount('leave_requests'),
    payroll_runs: await getTableCount('payroll_runs'),
    payroll_line_items: await getTableCount('payroll_line_items'),
  };

  await mkdir(BACKUP_SNAPSHOTS_DIR, { recursive: true });
  const snapshotPath = path.join(BACKUP_SNAPSHOTS_DIR, `${id}.json`);
  const snapshot = {
    id,
    generated_at: now,
    summary,
    note: 'Metadata backup snapshot only. Use infra-level DB backups for full recovery.',
  };
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

  const run: BackupRun = {
    id,
    config_name: 'primary',
    status: 'completed',
    snapshot_path: path.relative(process.cwd(), snapshotPath).replace(/\\/g, '/'),
    summary,
    triggered_by: triggeredBy || null,
    created_at: now,
  };

  const { error } = await supabaseAdmin.from('hrms_backup_runs').insert({
    id: run.id,
    config_name: run.config_name,
    status: run.status,
    snapshot_path: run.snapshot_path,
    summary: run.summary,
    triggered_by: run.triggered_by,
    created_at: run.created_at,
  } as any);

  if (error) {
    if (!isMissingTableError(error.message, 'hrms_backup_runs')) throw error;
    const fallback = await readJsonFile<BackupRun[]>(BACKUP_RUNS_FILE, []);
    fallback.unshift(run);
    await writeJsonFile(BACKUP_RUNS_FILE, fallback.slice(0, 200));
  }

  const currentConfig = await getBackupConfig();
  await saveBackupConfig({ ...currentConfig, last_backup_at: now }, triggeredBy || null);

  return run;
}
