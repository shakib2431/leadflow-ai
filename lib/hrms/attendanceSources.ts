import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AttendanceProvider = 'manual' | 'biometric_csv' | 'biometric_api';
export type AttendanceStatus = 'present' | 'absent' | 'half_day';

export type AttendanceSource = {
  id: string;
  name: string;
  provider: AttendanceProvider;
  status: 'active' | 'inactive';
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
};

export type AttendanceSyncLog = {
  id: string;
  source_id: string;
  sync_date: string;
  status: 'success' | 'failed';
  total_records: number;
  created_records: number;
  updated_records: number;
  error_message: string | null;
  details: Record<string, unknown>;
  duration_ms?: number;
  created_at: string;
};

export type AttendanceSourceHealthMetric = {
  source_id: string;
  source_name: string;
  provider: AttendanceProvider;
  status: 'active' | 'inactive';
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  failure_rate_percent: number;
  avg_latency_ms: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_synced_at: string | null;
};

export type AttendanceSyncEntry = {
  employee_id: string;
  date: string;
  status: AttendanceStatus;
};

const FILE_DIR = path.join(process.cwd(), 'tmp');
const SOURCES_FILE = path.join(FILE_DIR, 'attendance-sources.json');
const LOGS_FILE = path.join(FILE_DIR, 'attendance-sync-logs.json');
const ARTIFACTS_DIR = path.join(FILE_DIR, 'attendance-sync-artifacts');
const VALID_PROVIDERS: AttendanceProvider[] = ['manual', 'biometric_csv', 'biometric_api'];
const VALID_STATUSES = new Set<AttendanceStatus>(['present', 'absent', 'half_day']);

function isMissingTableError(message: string, tableName: string) {
  const text = String(message || '').toLowerCase();
  return (
    (text.includes('relation') && text.includes('does not exist') && text.includes(tableName.toLowerCase())) ||
    (text.includes('could not find the table') && text.includes(tableName.toLowerCase()))
  );
}

function normalizeProvider(value: unknown): AttendanceProvider {
  const raw = String(value || '').trim().toLowerCase();
  return VALID_PROVIDERS.includes(raw as AttendanceProvider) ? (raw as AttendanceProvider) : 'manual';
}

function normalizeStatus(value: unknown): 'active' | 'inactive' {
  return String(value || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function normalizeDate(input: unknown) {
  const value = String(input || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function normalizeSource(input: any): AttendanceSource {
  const now = new Date().toISOString();
  return {
    id: String(input?.id || crypto.randomUUID()),
    name: String(input?.name || 'Attendance Source').trim() || 'Attendance Source',
    provider: normalizeProvider(input?.provider),
    status: normalizeStatus(input?.status),
    config: input?.config && typeof input.config === 'object' && !Array.isArray(input.config) ? input.config : {},
    created_at: String(input?.created_at || now),
    updated_at: String(input?.updated_at || now),
    last_synced_at: input?.last_synced_at ? String(input.last_synced_at) : null,
  };
}

function normalizeLog(input: any): AttendanceSyncLog {
  const now = new Date().toISOString();
  const details = input?.details && typeof input.details === 'object' && !Array.isArray(input.details) ? input.details : {};
  const durationValue = Number(input?.duration_ms ?? (details as any).duration_ms ?? 0);
  return {
    id: String(input?.id || crypto.randomUUID()),
    source_id: String(input?.source_id || '').trim(),
    sync_date: normalizeDate(input?.sync_date) || now.slice(0, 10),
    status: String(input?.status || '').trim().toLowerCase() === 'failed' ? 'failed' : 'success',
    total_records: Math.max(0, Number(input?.total_records || 0)),
    created_records: Math.max(0, Number(input?.created_records || 0)),
    updated_records: Math.max(0, Number(input?.updated_records || 0)),
    error_message: input?.error_message ? String(input.error_message) : null,
    details,
    duration_ms: Number.isFinite(durationValue) && durationValue >= 0 ? Math.round(durationValue) : 0,
    created_at: String(input?.created_at || now),
  };
}

async function readJsonArray<T>(filePath: string, mapper: (row: any) => T): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(mapper);
  } catch {
    return [];
  }
}

async function writeJsonArray(filePath: string, value: unknown[]) {
  await mkdir(FILE_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sanitizeSyncEntries(entries: AttendanceSyncEntry[]) {
  return entries.slice(0, 1000).map((row) => ({
    employee_id: String(row.employee_id || '').trim(),
    date: String(row.date || '').trim(),
    status: String(row.status || '').trim().toLowerCase(),
  }));
}

async function updateFallbackSource(sourceId: string, patch: Partial<AttendanceSource>) {
  const sources = await readJsonArray(SOURCES_FILE, normalizeSource);
  const next = sources.map((row) => (row.id === sourceId ? normalizeSource({ ...row, ...patch, updated_at: new Date().toISOString() }) : row));
  await writeJsonArray(SOURCES_FILE, next);
}

export async function listAttendanceSources() {
  const { data, error } = await supabaseAdmin
    .from('attendance_sources')
    .select('id, name, provider, status, config, created_at, updated_at, last_synced_at')
    .order('created_at', { ascending: false });

  if (!error) return (data || []).map(normalizeSource);
  if (!isMissingTableError(error.message, 'attendance_sources')) throw error;

  return readJsonArray(SOURCES_FILE, normalizeSource);
}

export async function getAttendanceSourceById(sourceId: string) {
  const id = String(sourceId || '').trim();
  if (!id) return null;
  const rows = await listAttendanceSources();
  return rows.find((row) => row.id === id) || null;
}

export async function createAttendanceSource(input: {
  name: string;
  provider: AttendanceProvider;
  status?: 'active' | 'inactive';
  config?: Record<string, unknown>;
}) {
  const row = normalizeSource({
    id: crypto.randomUUID(),
    name: input.name,
    provider: input.provider,
    status: input.status || 'active',
    config: input.config || {},
  });

  const { data, error } = await supabaseAdmin
    .from('attendance_sources')
    .insert([row])
    .select('id, name, provider, status, config, created_at, updated_at, last_synced_at')
    .single();

  if (!error) return normalizeSource(data);
  if (!isMissingTableError(error.message, 'attendance_sources')) throw error;

  const current = await readJsonArray(SOURCES_FILE, normalizeSource);
  current.unshift(row);
  await writeJsonArray(SOURCES_FILE, current);
  return row;
}

export async function listAttendanceSyncLogs(options?: { sourceId?: string; status?: 'success' | 'failed'; limit?: number }) {
  const sourceId = String(options?.sourceId || '').trim();
  const status = String(options?.status || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(options?.limit || 20), 1), 200);

  let query = supabaseAdmin
    .from('attendance_sync_logs')
    .select('id, source_id, sync_date, status, total_records, created_records, updated_records, error_message, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sourceId) query = query.eq('source_id', sourceId);
  if (status === 'success' || status === 'failed') query = query.eq('status', status);

  const { data, error } = await query;

  if (!error) return (data || []).map(normalizeLog);
  if (!isMissingTableError(error.message, 'attendance_sync_logs')) throw error;

  const logs = await readJsonArray(LOGS_FILE, normalizeLog);
  return logs
    .filter((row) => (!sourceId || row.source_id === sourceId) && (!status || row.status === status))
    .slice(0, limit);
}

export async function getAttendanceSyncLogById(logId: string) {
  const id = String(logId || '').trim();
  if (!id) return null;

  const { data, error } = await supabaseAdmin
    .from('attendance_sync_logs')
    .select('id, source_id, sync_date, status, total_records, created_records, updated_records, error_message, details, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!error) return data ? normalizeLog(data) : null;
  if (!isMissingTableError(error.message, 'attendance_sync_logs')) throw error;

  const logs = await readJsonArray(LOGS_FILE, normalizeLog);
  return logs.find((row) => row.id === id) || null;
}

async function insertSyncLog(log: AttendanceSyncLog) {
  const dbRow: Record<string, unknown> = {
    id: log.id,
    source_id: log.source_id,
    sync_date: log.sync_date,
    status: log.status,
    total_records: log.total_records,
    created_records: log.created_records,
    updated_records: log.updated_records,
    error_message: log.error_message,
    details: {
      ...(log.details || {}),
      duration_ms: Number(log.duration_ms || 0),
    },
    created_at: log.created_at,
  };

  const { error } = await supabaseAdmin.from('attendance_sync_logs').insert([dbRow]);

  if (!error) return;
  if (!isMissingTableError(error.message, 'attendance_sync_logs')) throw error;

  const logs = await readJsonArray(LOGS_FILE, normalizeLog);
  logs.unshift(log);
  await writeJsonArray(LOGS_FILE, logs.slice(0, 1000));
}

export async function writeAttendanceSyncArtifact(payload: {
  source_id: string;
  sync_date: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: Array<Record<string, unknown>>;
}) {
  const artifactId = crypto.randomUUID();
  const artifactPath = path.join(ARTIFACTS_DIR, `${artifactId}.json`);
  const content = {
    artifact_id: artifactId,
    created_at: new Date().toISOString(),
    ...payload,
  };

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await writeFile(artifactPath, JSON.stringify(content, null, 2), 'utf8');

  return {
    artifact_id: artifactId,
    artifact_file: path.relative(process.cwd(), artifactPath).replace(/\\/g, '/'),
  };
}

export async function readAttendanceSyncArtifact(artifactId: string) {
  const id = String(artifactId || '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    throw new Error('Invalid artifact id');
  }

  const filePath = path.join(ARTIFACTS_DIR, `${id}.json`);
  const raw = await readFile(filePath, 'utf8');
  return {
    artifact_id: id,
    content: JSON.parse(raw),
    file_path: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
  };
}

async function setSourceLastSynced(sourceId: string, syncedAt: string) {
  const { error } = await supabaseAdmin
    .from('attendance_sources')
    .update({ last_synced_at: syncedAt, updated_at: syncedAt })
    .eq('id', sourceId);

  if (!error) return;
  if (!isMissingTableError(error.message, 'attendance_sources')) throw error;

  await updateFallbackSource(sourceId, { last_synced_at: syncedAt });
}

export async function runAttendanceSync(input: {
  sourceId: string;
  syncDate: string;
  entries: AttendanceSyncEntry[];
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}) {
  const startedAt = Date.now();
  const sourceId = String(input.sourceId || '').trim();
  const syncDate = normalizeDate(input.syncDate);

  if (!sourceId) throw new Error('sourceId is required');
  if (!syncDate) throw new Error('syncDate must be in YYYY-MM-DD format');

  const sources = await listAttendanceSources();
  const source = sources.find((row) => row.id === sourceId);

  if (!source) throw new Error('Attendance source not found');
  if (source.status !== 'active') throw new Error('Attendance source is inactive');

  const dedupedEntries = new Map<string, AttendanceSyncEntry>();
  for (const raw of input.entries || []) {
    const employeeId = String(raw?.employee_id || '').trim();
    const date = normalizeDate(raw?.date) || syncDate;
    const status = String(raw?.status || '').trim().toLowerCase() as AttendanceStatus;
    if (!employeeId || !date || !VALID_STATUSES.has(status)) continue;
    dedupedEntries.set(`${employeeId}:${date}`, { employee_id: employeeId, date, status });
  }

  const entries = Array.from(dedupedEntries.values());
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const entriesSnapshot = sanitizeSyncEntries(entries);
  const now = new Date().toISOString();

  if (entries.length === 0) {
    const emptyLog = normalizeLog({
      id: crypto.randomUUID(),
      source_id: sourceId,
      sync_date: syncDate,
      status: 'failed',
      total_records: 0,
      created_records: 0,
      updated_records: 0,
      error_message: 'No valid attendance rows found in sync payload',
      details: {
        ...metadata,
        triggered_by: input.triggeredBy || null,
        duration_ms: Date.now() - startedAt,
        entries: entriesSnapshot,
      },
      duration_ms: Date.now() - startedAt,
      created_at: now,
    });
    await insertSyncLog(emptyLog);
    return emptyLog;
  }

  const employeeIds = Array.from(new Set(entries.map((row) => row.employee_id)));
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('attendance_records')
    .select('employee_id, date')
    .eq('date', syncDate)
    .in('employee_id', employeeIds);

  if (existingError) {
    const failLog = normalizeLog({
      id: crypto.randomUUID(),
      source_id: sourceId,
      sync_date: syncDate,
      status: 'failed',
      total_records: entries.length,
      created_records: 0,
      updated_records: 0,
      error_message: existingError.message,
      details: {
        ...metadata,
        triggered_by: input.triggeredBy || null,
        duration_ms: Date.now() - startedAt,
        entries: entriesSnapshot,
      },
      duration_ms: Date.now() - startedAt,
      created_at: now,
    });
    await insertSyncLog(failLog);
    return failLog;
  }

  const existingKey = new Set((existingRows || []).map((row) => `${row.employee_id}:${row.date}`));
  let created = 0;
  let updated = 0;

  const upsertRows = entries.map((row) => {
    const key = `${row.employee_id}:${row.date}`;
    if (existingKey.has(key)) updated += 1;
    else created += 1;

    return {
      employee_id: row.employee_id,
      date: row.date,
      status: row.status,
      updated_at: now,
    };
  });

  const { error: upsertError } = await supabaseAdmin
    .from('attendance_records')
    .upsert(upsertRows, { onConflict: 'employee_id,date' });

  if (upsertError) {
    const failLog = normalizeLog({
      id: crypto.randomUUID(),
      source_id: sourceId,
      sync_date: syncDate,
      status: 'failed',
      total_records: entries.length,
      created_records: 0,
      updated_records: 0,
      error_message: upsertError.message,
      details: {
        ...metadata,
        triggered_by: input.triggeredBy || null,
        duration_ms: Date.now() - startedAt,
        entries: entriesSnapshot,
      },
      duration_ms: Date.now() - startedAt,
      created_at: now,
    });
    await insertSyncLog(failLog);
    return failLog;
  }

  await setSourceLastSynced(sourceId, now);

  const successLog = normalizeLog({
    id: crypto.randomUUID(),
    source_id: sourceId,
    sync_date: syncDate,
    status: 'success',
    total_records: entries.length,
    created_records: created,
    updated_records: updated,
    error_message: null,
    details: {
      ...metadata,
      provider: source.provider,
      source_name: source.name,
      triggered_by: input.triggeredBy || null,
      duration_ms: Date.now() - startedAt,
      entries: entriesSnapshot,
    },
    duration_ms: Date.now() - startedAt,
    created_at: now,
  });

  await insertSyncLog(successLog);
  return successLog;
}

export async function retryAttendanceSyncLog(logId: string, triggeredBy?: string) {
  const log = await getAttendanceSyncLogById(logId);
  if (!log) throw new Error('Sync log not found');

  const sourceId = String(log.source_id || '').trim();
  const syncDate = normalizeDate(log.sync_date);
  const rawEntries = Array.isArray((log.details as any)?.entries) ? ((log.details as any).entries as any[]) : [];

  if (!sourceId || !syncDate) throw new Error('Invalid sync log payload');
  if (rawEntries.length === 0) throw new Error('Retry not available for this log. No entry snapshot found.');

  const entries: AttendanceSyncEntry[] = rawEntries
    .map((row) => ({
      employee_id: String(row?.employee_id || '').trim(),
      date: String(row?.date || '').trim(),
      status: String(row?.status || '').trim().toLowerCase() as AttendanceStatus,
    }))
    .filter((row) => row.employee_id && normalizeDate(row.date) && VALID_STATUSES.has(row.status));

  if (entries.length === 0) {
    throw new Error('Retry snapshot has no valid entries.');
  }

  return runAttendanceSync({
    sourceId,
    syncDate,
    entries,
    triggeredBy,
    metadata: {
      retry_of_log_id: log.id,
      retry_original_status: log.status,
    },
  });
}

export async function getAttendanceSourceHealthMetrics() {
  const sources = await listAttendanceSources();
  const logs = await listAttendanceSyncLogs({ limit: 500 });

  const metrics: AttendanceSourceHealthMetric[] = sources.map((source) => {
    const sourceLogs = logs.filter((log) => log.source_id === source.id);
    const total = sourceLogs.length;
    const successLogs = sourceLogs.filter((log) => log.status === 'success');
    const failedLogs = sourceLogs.filter((log) => log.status === 'failed');
    const successful = successLogs.length;
    const failed = failedLogs.length;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    const durations = sourceLogs
      .map((log) => Number(log.duration_ms ?? (log.details as any)?.duration_ms ?? 0))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const avgLatency = durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;

    const latestSuccess = successLogs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
    const latestFailure = failedLogs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;

    return {
      source_id: source.id,
      source_name: source.name,
      provider: source.provider,
      status: source.status,
      total_syncs: total,
      successful_syncs: successful,
      failed_syncs: failed,
      failure_rate_percent: Math.round(failureRate * 100) / 100,
      avg_latency_ms: Math.round(avgLatency),
      last_success_at: latestSuccess?.created_at || null,
      last_failure_at: latestFailure?.created_at || null,
      last_synced_at: source.last_synced_at || null,
    };
  });

  return metrics.sort((a, b) => b.total_syncs - a.total_syncs);
}
